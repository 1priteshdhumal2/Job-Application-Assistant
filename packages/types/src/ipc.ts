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

export interface JobPilotElectronAPI {
  getAppVersion: () => Promise<string>;
  getEnvironmentInfo: () => Promise<DesktopEnvironmentInfo>;
}

declare global {
  interface Window {
    jobPilot?: JobPilotElectronAPI;
  }
}
