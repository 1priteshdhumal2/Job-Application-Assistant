// ==============================================================================
// Certifications Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Certification,
  CertificationCreateInput,
  CertificationUpdateInput,
  SortParams,
} from "@jobpilot/types";
import {
  certificationSchema,
  certificationUpdateSchema,
} from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const CERTIFICATION_SORT_FIELDS = [
  "issue_date",
  "name",
  "created_at",
] as const;
export type CertificationSortField = (typeof CERTIFICATION_SORT_FIELDS)[number];

/**
 * Lists all certification records for the authenticated user.
 */
export async function listCertifications(
  supabase: SupabaseClient,
  sortParams?: SortParams<CertificationSortField>,
): Promise<Certification[]> {
  const user = await requireAuthUser(supabase);
  const sort = resolveSort(
    sortParams,
    CERTIFICATION_SORT_FIELDS,
    "issue_date",
    "desc",
  );

  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending });

  if (error) {
    throw handleDatabaseError(error, "listCertifications");
  }

  return (data || []) as Certification[];
}

/**
 * Fetches a single certification record by ID.
 */
export async function getCertification(
  supabase: SupabaseClient,
  id: string,
): Promise<Certification> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getCertification");
  }

  return data as Certification;
}

/**
 * Creates a new certification record for the authenticated user.
 */
export async function createCertification(
  supabase: SupabaseClient,
  input: CertificationCreateInput,
): Promise<Certification> {
  const user = await requireAuthUser(supabase);
  const validated = certificationSchema.parse(input);

  const { data, error } = await supabase
    .from("certifications")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createCertification");
  }

  return data as Certification;
}

/**
 * Updates an existing certification record.
 */
export async function updateCertification(
  supabase: SupabaseClient,
  id: string,
  updates: CertificationUpdateInput,
): Promise<Certification> {
  const user = await requireAuthUser(supabase);
  const validated = certificationUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("certifications")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateCertification");
  }

  return data as Certification;
}

/**
 * Deletes a certification record.
 */
export async function deleteCertification(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("certifications")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteCertification");
  }

  if (count === 0) {
    throw new NotFoundError("Certification record not found");
  }
}
