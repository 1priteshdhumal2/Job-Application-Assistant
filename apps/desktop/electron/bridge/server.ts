import http from "http";
import {
  APP_VERSION,
  DEFAULT_LOCAL_BRIDGE_HOST,
  DEFAULT_LOCAL_BRIDGE_PORT,
  BRIDGE_ROUTES,
  createLogger,
} from "@jobpilot/shared";
import {
  BridgeHealthResponse,
  BridgePairResponse,
  BridgeStatusResponse,
  BridgeErrorResponse,
} from "@jobpilot/types";
import { BridgeAuthManager } from "./auth.js";

const logger = createLogger("bridge-server");

export interface BridgeServerOptions {
  host?: string;
  port?: number;
  authManager?: BridgeAuthManager;
}

export class BridgeServer {
  private server: http.Server | null = null;
  private host: string;
  private port: number;
  private authManager: BridgeAuthManager;
  private isRunning: boolean = false;

  constructor(options: BridgeServerOptions = {}) {
    this.host = options.host || DEFAULT_LOCAL_BRIDGE_HOST;
    this.port = options.port || DEFAULT_LOCAL_BRIDGE_PORT;
    this.authManager = options.authManager || new BridgeAuthManager();
  }

  public getAuthManager(): BridgeAuthManager {
    return this.authManager;
  }

  public getPort(): number {
    return this.port;
  }

  public getHost(): string {
    return this.host;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning && this.server) {
        return resolve();
      }

      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on("error", (err: NodeJS.ErrnoException) => {
        logger.error(`Bridge server error: ${err.message}`);
        this.isRunning = false;
        reject(err);
      });

      // Strictly bind ONLY to loopback 127.0.0.1
      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        logger.info(
          `JobPilot Desktop Bridge listening on http://${this.host}:${this.port}`,
        );
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server || !this.isRunning) {
        this.isRunning = false;
        return resolve();
      }

      this.server.close(() => {
        this.isRunning = false;
        this.server = null;
        logger.info("JobPilot Desktop Bridge stopped");
        resolve();
      });
    });
  }

  private setCorsHeaders(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): void {
    const origin = req.headers.origin;
    // Allow extension origins or local origin
    if (
      origin &&
      (origin.startsWith("chrome-extension://") ||
        origin.startsWith("moz-extension://") ||
        origin === "null")
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Origin, Accept",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  private sendJson(
    res: http.ServerResponse,
    statusCode: number,
    data: unknown,
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private sendError(
    res: http.ServerResponse,
    statusCode: number,
    code: string,
    message: string,
  ): void {
    const response: BridgeErrorResponse = {
      error: { code, message },
    };
    this.sendJson(res, statusCode, response);
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    this.setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Strictly verify loopback caller
    const remoteAddress = req.socket.remoteAddress;
    if (
      remoteAddress !== "127.0.0.1" &&
      remoteAddress !== "::1" &&
      remoteAddress !== "::ffff:127.0.0.1"
    ) {
      logger.warn(
        `Rejected non-loopback connection attempt from ${remoteAddress}`,
      );
      this.sendError(
        res,
        403,
        "FORBIDDEN",
        "Only local loopback requests are accepted",
      );
      return;
    }

    const url = new URL(req.url || "/", `http://${this.host}:${this.port}`);
    const pathname = url.pathname;

    try {
      // 1. GET /api/v1/bridge/health
      if (req.method === "GET" && pathname === BRIDGE_ROUTES.HEALTH) {
        const authHeader = req.headers.authorization;
        const isAuthenticated = this.authManager.validateToken(authHeader);

        const health: BridgeHealthResponse = {
          status: "ok",
          service: "jobpilot-desktop-bridge",
          version: APP_VERSION,
          authenticated: isAuthenticated,
          timestamp: new Date().toISOString(),
        };
        this.sendJson(res, 200, health);
        return;
      }

      // 2. POST /api/v1/bridge/pair
      if (req.method === "POST" && pathname === BRIDGE_ROUTES.PAIR) {
        if (this.authManager.isLockedOut()) {
          const remaining = this.authManager.getLockoutSecondsRemaining();
          this.sendError(
            res,
            429,
            "TOO_MANY_REQUESTS",
            `Pairing is temporarily locked due to repeated failures. Try again in ${remaining}s.`,
          );
          return;
        }

        const body = await this.readJsonBody<{ pairingCode?: string }>(req);
        if (!body || !body.pairingCode) {
          this.sendError(res, 400, "BAD_REQUEST", "pairingCode is required");
          return;
        }

        // Validate and atomically rotate pairing code (single-use)
        const secret = this.authManager.getSecret();
        if (this.authManager.validateAndConsumePairingCode(body.pairingCode)) {
          const response: BridgePairResponse = {
            success: true,
            token: secret,
          };
          this.sendJson(res, 200, response);
        } else {
          const response: BridgePairResponse = {
            success: false,
            error: this.authManager.isLockedOut()
              ? "Too many failed attempts. Pairing is temporarily locked for 60 seconds."
              : "Invalid pairing code",
          };
          this.sendJson(res, 401, response);
        }
        return;
      }

      // 3. GET /api/v1/bridge/status (Protected)
      if (req.method === "GET" && pathname === BRIDGE_ROUTES.STATUS) {
        const authHeader = req.headers.authorization;
        if (!this.authManager.validateToken(authHeader)) {
          this.sendError(
            res,
            401,
            "UNAUTHORIZED",
            "Invalid or missing bridge authentication token",
          );
          return;
        }

        const status: BridgeStatusResponse = {
          connected: true,
          desktopRunning: true,
          authenticated: true,
          appVersion: APP_VERSION,
        };
        this.sendJson(res, 200, status);
        return;
      }

      // Route Not Found
      this.sendError(
        res,
        404,
        "NOT_FOUND",
        `The bridge endpoint ${pathname} does not exist`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Bridge Error";
      logger.error(`Error processing bridge request ${pathname}: ${message}`);
      this.sendError(res, 500, "INTERNAL_ERROR", message);
    }
  }

  private readJsonBody<T>(req: http.IncomingMessage): Promise<T | null> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1024 * 64) {
          // 64 KB limit for bridge JSON payloads
          req.destroy();
          reject(new Error("Request payload too large"));
        }
      });
      req.on("end", () => {
        if (!body.trim()) return resolve(null);
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          reject(new Error("Invalid JSON payload"));
        }
      });
      req.on("error", (err) => reject(err));
    });
  }
}

export function createBridgeServer(
  options?: BridgeServerOptions,
): BridgeServer {
  return new BridgeServer(options);
}
