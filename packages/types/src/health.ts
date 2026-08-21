/**
 * API Health Check response contract.
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  service: "jobpilot-api";
  timestamp?: string;
  uptime?: number;
}
