import { UserId } from "./ids.js";

export type AuthStatus =
  | "INITIALIZING"
  | "UNAUTHENTICATED"
  | "VERIFICATION_REQUIRED"
  | "AUTHENTICATED"
  | "ERROR";

export interface AuthUser {
  id: UserId;
  email: string;
  emailConfirmed: boolean;
  createdAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt?: number;
}
