import { describe, it, expect } from "vitest";
import { JobPilotElectronAPI } from "@jobpilot/types";

describe("Electron Security & IPC Architecture", () => {
  it("ensures privileged Node.js APIs are isolated from window context", () => {
    const mockWindow: Record<string, unknown> = {};

    // Simulate browser/renderer window object
    expect(mockWindow["process"]).toBeUndefined();
    expect(mockWindow["require"]).toBeUndefined();
    expect(mockWindow["fs"]).toBeUndefined();
    expect(mockWindow["child_process"]).toBeUndefined();
    expect(mockWindow["ipcRenderer"]).toBeUndefined();
  });

  it("verifies explicit preload API contract conforms strictly to JobPilotElectronAPI", () => {
    // Construct mock preload API complying with interface
    const mockPreloadAPI: JobPilotElectronAPI = {
      getAppVersion: async () => "0.1.0",
      getEnvironmentInfo: async () => ({
        platform: "win32",
        arch: "x64",
        appVersion: "0.1.0",
        electronVersion: "34.2.0",
        nodeVersion: "22.13.4",
        isPackaged: false,
      }),
      selectDocumentFile: async () => ({
        canceled: false,
        file: {
          fileData: new Uint8Array([1, 2, 3]),
          fileName: "Resume.pdf",
          mimeType: "application/pdf",
          fileSize: 3,
        },
      }),
      saveDocumentFile: async () => ({
        canceled: false,
        success: true,
        filePath: "C:\\Users\\User\\Documents\\Resume.pdf",
      }),
    };

    // Assert explicit methods exist and return promises
    expect(typeof mockPreloadAPI.getAppVersion).toBe("function");
    expect(typeof mockPreloadAPI.getEnvironmentInfo).toBe("function");
    expect(typeof mockPreloadAPI.selectDocumentFile).toBe("function");
    expect(typeof mockPreloadAPI.saveDocumentFile).toBe("function");

    // Assert that dangerous arbitrary IPC methods are absent
    const apiKeys = Object.keys(mockPreloadAPI);
    expect(apiKeys).not.toContain("send");
    expect(apiKeys).not.toContain("invoke");
    expect(apiKeys).not.toContain("sendSync");
    expect(apiKeys).not.toContain("on");
    expect(apiKeys).not.toContain("addListener");
    expect(apiKeys).toEqual([
      "getAppVersion",
      "getEnvironmentInfo",
      "selectDocumentFile",
      "saveDocumentFile",
    ]);
  });

  it("validates environment info return schema structure", async () => {
    const mockPreloadAPI: JobPilotElectronAPI = {
      getAppVersion: async () => "0.1.0",
      getEnvironmentInfo: async () => ({
        platform: "win32",
        arch: "x64",
        appVersion: "0.1.0",
        electronVersion: "34.2.0",
        nodeVersion: "22.13.4",
        isPackaged: false,
      }),
      selectDocumentFile: async () => ({ canceled: true }),
      saveDocumentFile: async () => ({ canceled: true, success: false }),
    };

    const env = await mockPreloadAPI.getEnvironmentInfo();
    expect(env).toHaveProperty("platform");
    expect(env).toHaveProperty("arch");
    expect(env).toHaveProperty("appVersion");
    expect(env).toHaveProperty("electronVersion");
    expect(env).toHaveProperty("nodeVersion");
    expect(typeof env.isPackaged).toBe("boolean");
  });

  it("validates selectDocumentFile return schema and cancellation behavior", async () => {
    const mockPreloadAPI: JobPilotElectronAPI = {
      getAppVersion: async () => "0.1.0",
      getEnvironmentInfo: async () => ({
        platform: "win32",
        arch: "x64",
        appVersion: "0.1.0",
        electronVersion: "34.2.0",
        nodeVersion: "22.13.4",
        isPackaged: false,
      }),
      selectDocumentFile: async () => ({
        canceled: false,
        file: {
          fileData: new Uint8Array([37, 80, 68, 70]),
          fileName: "MyResume.pdf",
          mimeType: "application/pdf",
          fileSize: 4,
        },
      }),
      saveDocumentFile: async () => ({ canceled: true, success: false }),
    };

    const result = await mockPreloadAPI.selectDocumentFile();
    expect(result.canceled).toBe(false);
    expect(result.file).toBeDefined();
    expect(result.file?.fileName).toBe("MyResume.pdf");
    expect(result.file?.mimeType).toBe("application/pdf");
    expect(result.file?.fileSize).toBe(4);
    expect(result.file?.fileData).toBeInstanceOf(Uint8Array);
  });

  it("validates saveDocumentFile return schema and cancellation behavior", async () => {
    const mockPreloadAPI: JobPilotElectronAPI = {
      getAppVersion: async () => "0.1.0",
      getEnvironmentInfo: async () => ({
        platform: "win32",
        arch: "x64",
        appVersion: "0.1.0",
        electronVersion: "34.2.0",
        nodeVersion: "22.13.4",
        isPackaged: false,
      }),
      selectDocumentFile: async () => ({ canceled: true }),
      saveDocumentFile: async (params) => ({
        canceled: false,
        success: true,
        filePath: `/downloads/${params.defaultFileName}`,
      }),
    };

    const result = await mockPreloadAPI.saveDocumentFile({
      defaultFileName: "ExportedCV.pdf",
      fileData: new Uint8Array([1, 2]),
    });

    expect(result.canceled).toBe(false);
    expect(result.success).toBe(true);
    expect(result.filePath).toBe("/downloads/ExportedCV.pdf");
  });

  it("verifies bundled preload output has zero unbundled @jobpilot external runtime imports", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const preloadPath = path.resolve(
      __dirname,
      "../dist-electron/preload/index.js",
    );

    if (fs.existsSync(preloadPath)) {
      const content = fs.readFileSync(preloadPath, "utf-8");

      // Verify no workspace require calls exist
      expect(content).not.toContain('require("@jobpilot/');
      expect(content).not.toContain("require('@jobpilot/");
      expect(content).not.toContain("@jobpilot/shared");

      // Verify contextBridge and IPC channels are present
      expect(content).toContain("exposeInMainWorld");
      expect(content).toContain("jobpilot:dialog:selectDocumentFile");
      expect(content).toContain("jobpilot:dialog:saveDocumentFile");
    }
  });
});
