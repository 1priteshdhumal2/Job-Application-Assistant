// ==============================================================================
// Portal Domain Contracts
// ==============================================================================

export type PortalType = "JOB_PORTAL" | "COMPANY_SITE";

export const PORTAL_TYPES: PortalType[] = ["JOB_PORTAL", "COMPANY_SITE"];

export interface Portal {
  id: string;
  code: string;
  name: string;
  portal_type: PortalType;
  base_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
