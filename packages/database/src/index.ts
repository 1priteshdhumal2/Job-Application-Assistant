export * from "./client.js";
export * from "./profile.js";
export * from "./storage.js";

// Common Infrastructure
export * from "./common/auth.js";
export * from "./common/pagination.js";
export * from "./common/sorting.js";
export * from "./common/errors.js";

// Domain Services
export * from "./domain/profile-personal.js";
export * from "./domain/experiences.js";
export * from "./domain/education.js";
export * from "./domain/skills.js";
export * from "./domain/certifications.js";
export * from "./domain/languages.js";
export * from "./domain/profile-links.js";
export * from "./domain/profile-preferences.js";
export * from "./domain/portals.js";
export * from "./domain/jobs.js";
export * from "./domain/applications.js";
export * from "./domain/documents.js";
export * from "./domain/answer-bank.js";
export * from "./domain/application-answers.js";

export type {
  SupabaseClient,
  User,
  Session,
  AuthError as SupabaseAuthError,
  AuthChangeEvent,
} from "@supabase/supabase-js";
