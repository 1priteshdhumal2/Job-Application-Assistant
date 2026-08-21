/**
 * Nominal / Branded typing helper.
 * Prevents accidental mixing of raw string IDs (e.g. passing a JobId where a UserId is expected).
 */
declare const brandSymbol: unique symbol;

export type Brand<T, B> = T & { readonly [brandSymbol]: B };

export type UserId = Brand<string, "UserId">;
export type ProfileId = Brand<string, "ProfileId">;
export type DocumentId = Brand<string, "DocumentId">;
export type JobId = Brand<string, "JobId">;
export type ApplicationId = Brand<string, "ApplicationId">;
export type PortalId = Brand<string, "PortalId">;

export const createUserId = (id: string): UserId => id as UserId;
export const createProfileId = (id: string): ProfileId => id as ProfileId;
export const createDocumentId = (id: string): DocumentId => id as DocumentId;
export const createJobId = (id: string): JobId => id as JobId;
export const createApplicationId = (id: string): ApplicationId =>
  id as ApplicationId;
export const createPortalId = (id: string): PortalId => id as PortalId;
