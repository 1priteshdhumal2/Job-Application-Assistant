import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import { APP_VERSION, IPC_CHANNELS, createLogger } from "@jobpilot/shared";
import { DesktopEnvironmentInfo } from "@jobpilot/types";

const logger = createLogger("electron-main");
let mainWindow: BrowserWindow | null = null;

const isDev = process.env["NODE_ENV"] === "development" || !app.isPackaged;

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
  // Explicitly register allowed IPC methods only
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, (): string => {
    return APP_VERSION;
  });

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

app.whenReady().then(() => {
  logger.info("Starting JobPilot Electron Main Process...");
  setupContentSecurityPolicy();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
