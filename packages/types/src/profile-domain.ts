// ==============================================================================
// Profile Domain Contracts
// ==============================================================================

export interface ProfilePersonal {
  id: string;
  user_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  professional_title: string | null;
  current_company: string | null;
  current_designation: string | null;
  notice_period_days: number | null;
  work_authorization_status: string | null;
  requires_sponsorship: boolean | null;
  willing_to_relocate: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProfilePersonalInput = Omit<
  ProfilePersonal,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Experience {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  employment_type: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type ExperienceInput = Omit<
  Experience,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Education {
  id: string;
  user_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type EducationInput = Omit<
  Education,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Skill {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency: string | null;
  years_experience: number | null;
  last_used_date: string | null;
  created_at: string;
  updated_at: string;
}

export type SkillInput = Omit<
  Skill,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  issuer: string | null;
  credential_id: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verification_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CertificationInput = Omit<
  Certification,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Language {
  id: string;
  user_id: string;
  language: string;
  proficiency: string | null;
  created_at: string;
  updated_at: string;
}

export type LanguageInput = Omit<
  Language,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type ProfileLinkType =
  "LINKEDIN" | "GITHUB" | "PORTFOLIO" | "STACKOVERFLOW" | "OTHER";

export const PROFILE_LINK_TYPES: ProfileLinkType[] = [
  "LINKEDIN",
  "GITHUB",
  "PORTFOLIO",
  "STACKOVERFLOW",
  "OTHER",
];

export interface ProfileLink {
  id: string;
  user_id: string;
  link_type: ProfileLinkType;
  url: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileLinkInput = Omit<
  ProfileLink,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface ProfilePreferences {
  id: string;
  user_id: string;
  remote_preference: string | null;
  preferred_locations: string[];
  preferred_roles: string[];
  employment_types: string[];
  preferred_industries: string[];
  minimum_expected_ctc: number | null;
  preferred_currency: string | null;
  willing_to_relocate: boolean | null;
  created_at: string;
  updated_at: string;
}

export type ProfilePreferencesInput = Omit<
  ProfilePreferences,
  "id" | "user_id" | "created_at" | "updated_at"
>;
