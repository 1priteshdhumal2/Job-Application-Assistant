import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BridgeServer } from "../../electron/bridge/server.js";
import { BridgeAuthManager } from "../../electron/bridge/auth.js";
import { DEFAULT_LOCAL_BRIDGE_HOST, BRIDGE_ROUTES } from "@jobpilot/shared";
import {
  BridgeHealthResponse,
  BridgePairResponse,
  BridgeStatusResponse,
} from "@jobpilot/types";

describe("Desktop Local Bridge Server & Auth (Phase 2D-3 Slice A)", () => {
  let bridgeServer: BridgeServer;
  let authManager: BridgeAuthManager;
  const testPort = 4174; // Use test port to avoid collision with dev server

  beforeEach(async () => {
    authManager = new BridgeAuthManager({
      secret: "test_secret_1234567890abcdef1234567890abcdef",
      pairingCode: "TESTPAIR",
    });
    bridgeServer = new BridgeServer({
      host: DEFAULT_LOCAL_BRIDGE_HOST,
      port: testPort,
      authManager,
    });
    await bridgeServer.start();
  });

  afterEach(async () => {
    await bridgeServer.stop();
  });

  it("1. binds strictly to 127.0.0.1 on the designated port", () => {
    expect(bridgeServer.getHost()).toBe("127.0.0.1");
    expect(bridgeServer.getPort()).toBe(testPort);
  });

  it("2. GET /api/v1/bridge/health returns 200 with unauthenticated state when no token is supplied", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.HEALTH}`,
    );
    expect(res.status).toBe(200);

    const data = (await res.json()) as BridgeHealthResponse;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("jobpilot-desktop-bridge");
    expect(data.authenticated).toBe(false);
    expect(data.version).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it("3. GET /api/v1/bridge/health returns 200 with authenticated: true when valid Bearer token is provided", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.HEALTH}`,
      {
        headers: {
          Authorization: `Bearer ${authManager.getSecret()}`,
        },
      },
    );
    expect(res.status).toBe(200);

    const data = (await res.json()) as BridgeHealthResponse;
    expect(data.status).toBe("ok");
    expect(data.authenticated).toBe(true);
  });

  it("4. POST /api/v1/bridge/pair succeeds with valid pairing code and enforces single-use rotation", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.PAIR}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: "TESTPAIR" }),
      },
    );
    expect(res.status).toBe(200);

    const data = (await res.json()) as BridgePairResponse;
    expect(data.success).toBe(true);
    expect(data.token).toBe(authManager.getSecret());

    // Second request with same code must fail (single-use invariant)
    const replayRes = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.PAIR}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: "TESTPAIR" }),
      },
    );
    expect(replayRes.status).toBe(401);
  });

  it("5. POST /api/v1/bridge/pair rejects invalid pairing code with 401", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.PAIR}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: "WRONGCODE" }),
      },
    );
    expect(res.status).toBe(401);

    const data = (await res.json()) as BridgePairResponse;
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid pairing code");
  });

  it("6. GET /api/v1/bridge/status returns 200 for authenticated requests", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.STATUS}`,
      {
        headers: {
          Authorization: `Bearer ${authManager.getSecret()}`,
        },
      },
    );
    expect(res.status).toBe(200);

    const data = (await res.json()) as BridgeStatusResponse;
    expect(data.connected).toBe(true);
    expect(data.desktopRunning).toBe(true);
    expect(data.authenticated).toBe(true);
  });

  it("7. GET /api/v1/bridge/status rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.STATUS}`,
    );
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("8. GET /api/v1/bridge/status rejects invalid Bearer tokens with 401 UNAUTHORIZED", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.STATUS}`,
      {
        headers: {
          Authorization: "Bearer invalid_secret_key",
        },
      },
    );
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("9. OPTIONS preflight request returns 204 with CORS headers", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.HEALTH}`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "chrome-extension://abcdefghijklmnop",
          "Access-Control-Request-Method": "GET",
        },
      },
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "chrome-extension://abcdefghijklmnop",
    );
  });

  it("10. returns 404 for undefined bridge endpoints", async () => {
    const res = await fetch(
      `http://127.0.0.1:${testPort}/api/v1/bridge/nonexistent`,
    );
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("11. BridgeAuthManager generates random secret and pairing code when none provided", () => {
    const mgr = new BridgeAuthManager();
    expect(mgr.getSecret()).toBeDefined();
    expect(mgr.getSecret().length).toBeGreaterThanOrEqual(32);
    expect(mgr.getPairingCode()).toBeDefined();
    expect(mgr.validateToken(mgr.getSecret())).toBe(true);
    expect(mgr.validatePairingCode(mgr.getPairingCode())).toBe(true);
  });

  it("12. locks out pairing after 5 consecutive failed attempts", async () => {
    for (let i = 0; i < 5; i++) {
      await fetch(`http://127.0.0.1:${testPort}${BRIDGE_ROUTES.PAIR}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: "BADCODE" }),
      });
    }

    const lockoutRes = await fetch(
      `http://127.0.0.1:${testPort}${BRIDGE_ROUTES.PAIR}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: "TESTPAIR" }),
      },
    );
    expect(lockoutRes.status).toBe(429);
    const data = await lockoutRes.json();
    expect(data.error.code).toBe("TOO_MANY_REQUESTS");
  });
});
