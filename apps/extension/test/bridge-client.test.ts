import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExtensionBridgeClient } from "../src/background/bridge-client";
import { handleExtensionMessage } from "../src/background/index";
import type {
  BridgeHealthResponse,
  BridgeStatusResponse,
} from "@jobpilot/types";

describe("ExtensionBridgeClient & Background Message Handling (Phase 2D-3 Slice A)", () => {
  let client: ExtensionBridgeClient;
  const mockBaseUrl = "http://127.0.0.1:4173";

  beforeEach(() => {
    client = new ExtensionBridgeClient({ baseUrl: mockBaseUrl });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. checkHealth returns status: ok and authenticated: false when unauthenticated", async () => {
    const mockHealth: BridgeHealthResponse = {
      status: "ok",
      version: "1.0.0",
      authenticated: false,
      timestamp: "2026-09-17T12:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const result = await client.checkHealth();

    expect(result.status).toBe("ok");
    expect(result.authenticated).toBe(false);
    expect(result.version).toBe("1.0.0");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/api/v1/bridge/health`,
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("2. pair successfully exchanges pairing code for secret and stores it", async () => {
    const mockSecret = "sec_test_secret_12345";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: mockSecret }),
    } as Response);

    const result = await client.pair("ABC12345");

    expect(result.success).toBe(true);
    expect(await client.getToken()).toBe(mockSecret);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/api/v1/bridge/pair`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pairingCode: "ABC12345" }),
      }),
    );
  });

  it("3. pair rejects invalid pairing code and does not store token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: "Invalid pairing code" }),
    } as Response);

    const result = await client.pair("WRONG");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid pairing code");
    expect(await client.getToken()).toBeNull();
  });

  it("4. getStatus includes Authorization Bearer header when token is set", async () => {
    await client.setToken("my_secret_token");

    const mockStatus: BridgeStatusResponse = {
      status: "ready",
      version: "1.0.0",
      authenticated: true,
      activeUser: { id: "usr_1", email: "test@example.com" },
      timestamp: "2026-09-17T12:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatus,
    } as Response);

    const status = await client.getStatus();

    expect(status.status).toBe("ready");
    expect(status.authenticated).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/api/v1/bridge/status`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my_secret_token",
        }),
      }),
    );
  });

  it("5. getStatus handles 401 Unauthorized by clearing token and reporting auth error", async () => {
    await client.setToken("expired_or_wrong_token");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "UNAUTHORIZED", message: "Invalid bridge secret" },
      }),
    } as Response);

    await expect(client.getStatus()).rejects.toThrow(
      "UNAUTHORIZED: Invalid pairing token",
    );
    expect(await client.getToken()).toBeNull();
  });

  it("6. handleExtensionMessage dispatches CHECK_CONNECTION correctly", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        version: "1.0.0",
        authenticated: true,
        timestamp: "2026-09-17T12:00:00.000Z",
      }),
    } as Response);

    const response = await handleExtensionMessage(
      { type: "CHECK_CONNECTION" },
      client,
    );

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      status: "ok",
      authenticated: true,
    });
  });

  it("7. handleExtensionMessage returns failure when bridge connection is refused", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused"));

    const response = await handleExtensionMessage(
      { type: "CHECK_CONNECTION" },
      client,
    );

    expect(response.success).toBe(false);
    expect(response.error).toContain("Connection refused");
  });

  it("8. handleExtensionMessage dispatches PAIR_BRIDGE and sets pairing token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: "new_paired_secret" }),
    } as Response);

    const response = await handleExtensionMessage(
      { type: "PAIR_BRIDGE", payload: { pairingCode: "99887766" } },
      client,
    );

    expect(response.success).toBe(true);
    expect(response.data).toEqual({
      success: true,
      token: "new_paired_secret",
    });
    expect(await client.getToken()).toBe("new_paired_secret");
  });
});
