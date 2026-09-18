/**
 * Local Bridge Protocol Definitions (Phase 2D-3 Slice A)
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

export type ExtensionMessageType =
  "CHECK_CONNECTION" | "PAIR_BRIDGE" | "GET_BRIDGE_STATUS";

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType;
  payload?: T;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
