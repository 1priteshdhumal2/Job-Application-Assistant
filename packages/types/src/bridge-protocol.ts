/**
 * Local Bridge Protocol Definitions (Phase 2D-3 Slice A & B)
 */

export interface BridgeHealthResponse {
  status: "ok" | "error";
  service: "jobpilot-desktop-bridge";
  version: string;
  authenticated: boolean;
  timestamp: string;
}

export interface BridgePairRequest {
  pairingCode: string;
}

export interface BridgePairResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface BridgeStatusResponse {
  connected: boolean;
  desktopRunning: boolean;
  authenticated: boolean;
  appVersion: string;
}

export interface BridgeErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface CapturedJobPayload {
  portal: string;
  externalJobId: string;
  url: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  capturedAt: string;
}

export interface BridgeCaptureJobRequest {
  job: CapturedJobPayload;
}

export interface BridgeCaptureJobResponse {
  success: boolean;
  receivedAt: string;
  job: CapturedJobPayload;
}

export type ExtensionMessageType =
  | "CHECK_CONNECTION"
  | "PAIR_BRIDGE"
  | "GET_BRIDGE_STATUS"
  | "CAPTURE_JOB_CONTEXT";

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType;
  payload?: T;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
