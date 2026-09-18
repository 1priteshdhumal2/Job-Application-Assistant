/**
 * JobPilot Global Application Constants
 */
export const APP_NAME = "JobPilot" as const;
export const APP_VERSION = "0.1.0" as const;
export const DEFAULT_API_PORT = 3001 as const;
export const DEFAULT_DEV_RENDERER_PORT = 5173 as const;
export const DEFAULT_LOCAL_BRIDGE_PORT = 4173 as const;
export const DEFAULT_LOCAL_BRIDGE_HOST = "127.0.0.1" as const;

export const BRIDGE_ROUTES = {
  HEALTH: "/api/v1/bridge/health",
  PAIR: "/api/v1/bridge/pair",
  STATUS: "/api/v1/bridge/status",
} as const;

export const IPC_CHANNELS = {
  GET_APP_VERSION: "jobpilot:getAppVersion",
  GET_ENVIRONMENT_INFO: "jobpilot:getEnvironmentInfo",
  SELECT_DOCUMENT_FILE: "jobpilot:dialog:selectDocumentFile",
  SAVE_DOCUMENT_FILE: "jobpilot:dialog:saveDocumentFile",
  GET_BRIDGE_INFO: "jobpilot:bridge:getInfo",
} as const;
