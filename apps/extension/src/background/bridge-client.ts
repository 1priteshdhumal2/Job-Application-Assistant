import {
  DEFAULT_LOCAL_BRIDGE_HOST,
  DEFAULT_LOCAL_BRIDGE_PORT,
  BRIDGE_ROUTES,
} from "@jobpilot/shared";
import {
  BridgeHealthResponse,
  BridgePairResponse,
  BridgeStatusResponse,
  BridgeCaptureJobResponse,
  CapturedJobPayload,
} from "@jobpilot/types";

export interface BridgeClientConfig {
  baseUrl?: string;
  storage?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
}

const STORAGE_KEY_TOKEN = "jobpilot_bridge_token";

export class ExtensionBridgeClient {
  private baseUrl: string;
  private storage: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };

  constructor(config: BridgeClientConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      `http://${DEFAULT_LOCAL_BRIDGE_HOST}:${DEFAULT_LOCAL_BRIDGE_PORT}`;

    if (config.storage) {
      this.storage = config.storage;
    } else if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      this.storage = {
        get: async (key: string) => {
          const res = await chrome.storage.local.get([key]);
          return (res[key] as string) || null;
        },
        set: async (key: string, val: string) => {
          await chrome.storage.local.set({ [key]: val });
        },
        remove: async (key: string) => {
          await chrome.storage.local.remove([key]);
        },
      };
    } else {
      // In-memory fallback
      const mem: Record<string, string> = {};
      this.storage = {
        get: async (key: string) => mem[key] || null,
        set: async (key: string, val: string) => {
          mem[key] = val;
        },
        remove: async (key: string) => {
          delete mem[key];
        },
      };
    }
  }

  public async getToken(): Promise<string | null> {
    return this.storage.get(STORAGE_KEY_TOKEN);
  }

  public async setToken(token: string): Promise<void> {
    await this.storage.set(STORAGE_KEY_TOKEN, token);
  }

  public async clearToken(): Promise<void> {
    await this.storage.remove(STORAGE_KEY_TOKEN);
  }

  /**
   * Pings the desktop bridge health endpoint.
   */
  public async checkHealth(): Promise<BridgeHealthResponse> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${BRIDGE_ROUTES.HEALTH}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Bridge returned HTTP ${response.status}`);
    }

    return response.json() as Promise<BridgeHealthResponse>;
  }

  /**
   * Exchanges a pairing code for a persistent bridge auth token.
   */
  public async pair(pairingCode: string): Promise<BridgePairResponse> {
    const response = await fetch(`${this.baseUrl}${BRIDGE_ROUTES.PAIR}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pairingCode }),
    });

    const data = (await response.json()) as BridgePairResponse;
    if (response.ok && data.success && data.token) {
      await this.setToken(data.token);
    }
    return data;
  }

  /**
   * Fetches protected status of the Desktop Bridge.
   */
  public async getStatus(): Promise<BridgeStatusResponse> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("UNAUTHORIZED: Bridge is not paired");
    }

    const response = await fetch(`${this.baseUrl}${BRIDGE_ROUTES.STATUS}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      await this.clearToken();
      throw new Error("UNAUTHORIZED: Invalid pairing token");
    }

    if (!response.ok) {
      throw new Error(`Bridge returned HTTP ${response.status}`);
    }

    return response.json() as Promise<BridgeStatusResponse>;
  }

  /**
   * Sends captured job context to the authenticated Desktop Bridge.
   */
  public async captureJob(
    job: CapturedJobPayload,
  ): Promise<BridgeCaptureJobResponse> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("Pair JobPilot with the desktop app first.");
    }

    const response = await fetch(`${this.baseUrl}${BRIDGE_ROUTES.CAPTURE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ job }),
    });

    if (response.status === 401) {
      await this.clearToken();
      throw new Error("Pair JobPilot with the desktop app first.");
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        (errorBody as { error?: { message?: string } })?.error?.message ||
        `Bridge returned HTTP ${response.status}`;
      throw new Error(message);
    }

    return response.json() as Promise<BridgeCaptureJobResponse>;
  }
}
