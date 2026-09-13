// ==============================================================================
// Application Answers Domain Service (Immutable Submitted Snapshots)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ApplicationAnswer,
  ApplicationAnswerCreateInput,
} from "@jobpilot/types";
import { applicationAnswerSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import {
  handleDatabaseError,
  NotFoundError,
  ValidationError,
} from "../common/errors.js";

const ANSWER_ALLOWED_STATUSES = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
] as const;

/**
 * Lists all submitted answer snapshots for a given application ID.
 */
export async function listApplicationAnswers(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<ApplicationAnswer[]> {
  const user = await requireAuthUser(supabase);

  // Verify application ownership
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (appError) {
    throw handleDatabaseError(appError, "listApplicationAnswers:verifyApp");
  }

  if (!app) {
    throw new NotFoundError("Application not found or belongs to another user");
  }

  const { data, error } = await supabase
    .from("application_answers")
    .select("*")
    .eq("application_id", applicationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw handleDatabaseError(error, "listApplicationAnswers");
  }

  return (data || []) as ApplicationAnswer[];
}

/**
 * Lists all submitted answer snapshots for a specific preparation snapshot ID.
 */
export async function listApplicationAnswersByPreparation(
  supabase: SupabaseClient,
  preparationId: string,
): Promise<ApplicationAnswer[]> {
  const user = await requireAuthUser(supabase);

  // Verify preparation ownership
  const { data: prep, error: prepError } = await supabase
    .from("application_preparations")
    .select("id")
    .eq("id", preparationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (prepError) {
    throw handleDatabaseError(
      prepError,
      "listApplicationAnswersByPreparation:verifyPrep",
    );
  }

  if (!prep) {
    throw new NotFoundError(
      "Application preparation not found or belongs to another user",
    );
  }

  const { data, error } = await supabase
    .from("application_answers")
    .select("*")
    .eq("preparation_id", preparationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw handleDatabaseError(error, "listApplicationAnswersByPreparation");
  }

  return (data || []) as ApplicationAnswer[];
}

/**
 * Fetches a single application answer snapshot by ID.
 */
export async function getApplicationAnswer(
  supabase: SupabaseClient,
  id: string,
): Promise<ApplicationAnswer> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("application_answers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getApplicationAnswer");
  }

  return data as ApplicationAnswer;
}

/**
 * Creates an immutable point-in-time application answer snapshot attached to a preparation.
 * Strictly does NOT permit updating or deleting existing answers.
 */
export async function createApplicationAnswer(
  supabase: SupabaseClient,
  input: ApplicationAnswerCreateInput,
): Promise<ApplicationAnswer> {
  const user = await requireAuthUser(supabase);
  const validated = applicationAnswerSchema.parse(input);

  // Verify parent preparation existence and ownership
  const { data: prep, error: prepError } = await supabase
    .from("application_preparations")
    .select("id, status")
    .eq("id", validated.preparation_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (prepError) {
    throw handleDatabaseError(prepError, "createApplicationAnswer:verifyPrep");
  }

  if (!prep) {
    throw new NotFoundError(
      "Application preparation not found or belongs to another user",
    );
  }

  if (
    !ANSWER_ALLOWED_STATUSES.includes(
      prep.status as (typeof ANSWER_ALLOWED_STATUSES)[number],
    )
  ) {
    throw new ValidationError(
      `Cannot add answers to a preparation in '${prep.status}' state`,
    );
  }

  // Insert immutable snapshot
  const { data, error } = await supabase
    .from("application_answers")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createApplicationAnswer");
  }

  return data as ApplicationAnswer;
}
