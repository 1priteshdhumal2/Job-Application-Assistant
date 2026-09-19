import { app, BrowserWindow, ipcMain, session, dialog } from "electron";
import fs from "fs";
import path from "path";
import { APP_VERSION, IPC_CHANNELS, createLogger } from "@jobpilot/shared";
import {
  DesktopEnvironmentInfo,
  SelectDocumentFileResult,
  SaveDocumentFileParams,
  SaveDocumentFileResult,
  CapturedJobPayload,
} from "@jobpilot/types";

import { BridgeServer, BridgeAuthManager } from "./bridge/index.js";

const logger = createLogger("electron-main");
let mainWindow: BrowserWindow | null = null;
let bridgeServer: BridgeServer | null = null;

const isDev = process.env["NODE_ENV"] === "development" || !app.isPackaged;

function getMimeTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

function setupContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Restrictive CSP: restricts script execution, connections, and disables remote frame execution
    const connectSources = isDev
      ? "'self' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co"
      : "'self' https://*.supabase.co wss://*.supabase.co";

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Vite/React runtime script evaluation
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src ${connectSources}`,
      "img-src 'self' data: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}

function registerIpcHandlers(): void {
  // 1. App Version metadata
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, (): string => {
    return APP_VERSION;
  });

  // 2. Environment Info metadata
  ipcMain.handle(
    IPC_CHANNELS.GET_ENVIRONMENT_INFO,
    (): DesktopEnvironmentInfo => {
      return {
        platform: process.platform,
        arch: process.arch,
        appVersion: APP_VERSION,
        electronVersion: process.versions.electron || "unknown",
        nodeVersion: process.versions.node,
        isPackaged: app.isPackaged,
      };
    },
  );

  // 3. Document File Selection Dialog
  ipcMain.handle(
    IPC_CHANNELS.SELECT_DOCUMENT_FILE,
    async (): Promise<SelectDocumentFileResult> => {
      if (!mainWindow) {
        return { canceled: true };
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Document",
        properties: ["openFile"],
        filters: [
          {
            name: "Supported Documents (*.pdf, *.docx, *.xlsx)",
            extensions: ["pdf", "docx", "xlsx"],
          },
        ],
      });

      if (
        result.canceled ||
        !result.filePaths ||
        result.filePaths.length === 0
      ) {
        return { canceled: true };
      }

      const selectedPath = result.filePaths[0];
      if (!selectedPath) {
        return { canceled: true };
      }

      try {
        const buffer = await fs.promises.readFile(selectedPath);
        const fileName = path.basename(selectedPath);
        const ext = path.extname(selectedPath);
        const mimeType = getMimeTypeFromExt(ext);

        return {
          canceled: false,
          file: {
            fileData: new Uint8Array(buffer),
            fileName,
            mimeType,
            fileSize: buffer.length,
          },
        };
      } catch (err) {
        logger.error(`Failed to read selected document file: ${err}`);
        return { canceled: true };
      }
    },
  );

  // 4. Document File Save Dialog
  ipcMain.handle(
    IPC_CHANNELS.SAVE_DOCUMENT_FILE,
    async (
      _event,
      params: SaveDocumentFileParams,
    ): Promise<SaveDocumentFileResult> => {
      if (!mainWindow) {
        return { canceled: true, success: false };
      }

      const defaultFileName = params?.defaultFileName || "document.pdf";
      const ext = path.extname(defaultFileName).replace(/^\./, "") || "pdf";

      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save Document",
        defaultPath: defaultFileName,
        filters: [
          {
            name: "Document File",
            extensions: [ext],
          },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true, success: false };
      }

      try {
        const buffer = Buffer.from(params.fileData);
        await fs.promises.writeFile(result.filePath, buffer);

        return {
          canceled: false,
          success: true,
          filePath: result.filePath,
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to write file to disk";
        logger.error(`Failed to save document file: ${message}`);
        return {
          canceled: false,
          success: false,
          error: message,
        };
      }
    },
  );

  // 5. Local Bridge Info
  ipcMain.handle(IPC_CHANNELS.GET_BRIDGE_INFO, () => {
    if (!bridgeServer) return null;
    return {
      host: bridgeServer.getHost(),
      port: bridgeServer.getPort(),
      pairingCode: bridgeServer.getAuthManager().getPairingCode(),
    };
  });

  // 6. Captured Job Context
  ipcMain.handle(
    IPC_CHANNELS.GET_CAPTURED_JOB,
    (): CapturedJobPayload | null => {
      return bridgeServer?.getLastCapturedJob() ?? null;
    },
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "JobPilot",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Prevent navigation away from authorized application shell
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost:") && !url.startsWith("file://")) {
      logger.warn(`Blocked unauthorized navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // Block opening arbitrary remote child windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    logger.warn(`Blocked unauthorized window open attempt for: ${url}`);
    return { action: "deny" };
  });

  if (isDev && process.env["VITE_DEV_SERVER_URL"]) {
    mainWindow.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logger.info("Starting JobPilot Electron Main Process...");
  setupContentSecurityPolicy();
  registerIpcHandlers();

  // Start local loopback bridge for Chrome/Edge extension (127.0.0.1:4173)
  try {
    const authPath = path.join(app.getPath("userData"), "bridge-auth.json");
    const authManager = new BridgeAuthManager({ storagePath: authPath });
    bridgeServer = new BridgeServer({ authManager });

    // Stream bridge captured jobs directly to renderer window
    bridgeServer.onJobCaptured((job) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.ON_JOB_CAPTURED, job);
      }
    });

    await bridgeServer.start();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to start Desktop Bridge on port 4173: ${message}`);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", async () => {
  if (bridgeServer) {
    await bridgeServer.stop();
    bridgeServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
