/**
 * Typed Electron IPC contracts between Main Process, Preload, and Renderer.
 */

export interface DesktopEnvironmentInfo {
  platform: string;
  arch: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  isPackaged: boolean;
}

export interface SelectedDocumentFile {
  fileData: Uint8Array;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface SelectDocumentFileResult {
  canceled: boolean;
  file?: SelectedDocumentFile;
}

export interface SaveDocumentFileParams {
  defaultFileName: string;
  fileData: Uint8Array;
}

export interface SaveDocumentFileResult {
  canceled: boolean;
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface JobPilotElectronAPI {
  getAppVersion: () => Promise<string>;
  getEnvironmentInfo: () => Promise<DesktopEnvironmentInfo>;
  selectDocumentFile: () => Promise<SelectDocumentFileResult>;
  saveDocumentFile: (
    params: SaveDocumentFileParams,
  ) => Promise<SaveDocumentFileResult>;
}

declare global {
  interface Window {
    jobPilot?: JobPilotElectronAPI;
  }
}
