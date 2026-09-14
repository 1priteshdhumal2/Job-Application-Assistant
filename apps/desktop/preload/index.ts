import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@jobpilot/shared";
import {
  DesktopEnvironmentInfo,
  JobPilotElectronAPI,
  SelectDocumentFileResult,
  SaveDocumentFileParams,
  SaveDocumentFileResult,
} from "@jobpilot/types";

/**
 * Minimal Typed Preload API Bridge
 *
 * Security Architecture:
 * - Direct Node.js APIs (fs, child_process, process, etc.) are NOT exposed to the renderer.
 * - ipcRenderer is NOT exposed directly to the renderer.
 * - Only strictly typed, explicit methods are exposed on window.jobPilot.
 */
const api: JobPilotElectronAPI = {
  getAppVersion: async (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION);
  },
  getEnvironmentInfo: async (): Promise<DesktopEnvironmentInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_ENVIRONMENT_INFO);
  },
  selectDocumentFile: async (): Promise<SelectDocumentFileResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_DOCUMENT_FILE);
  },
  saveDocumentFile: async (
    params: SaveDocumentFileParams,
  ): Promise<SaveDocumentFileResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_DOCUMENT_FILE, params);
  },
};

// Expose protected API under window.jobPilot
contextBridge.exposeInMainWorld("jobPilot", api);
