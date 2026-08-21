import { UserId } from "./ids.js";

export type OnboardingStatus = "NOT_STARTED" | "ACTIVE";

export interface Profile {
  id: UserId;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateInput {
  display_name?: string | null;
  avatar_url?: string | null;
}
