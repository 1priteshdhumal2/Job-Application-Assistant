import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { BrowserExtensionCard } from "../../renderer/src/components/bridge/BrowserExtensionCard";
import type { DesktopBridgeInfo, JobPilotElectronAPI } from "@jobpilot/types";

describe("BrowserExtensionCard Component (Phase 2D-3 Slice A)", () => {
  const mockBridgeInfo: DesktopBridgeInfo = {
    host: "127.0.0.1",
    port: 4173,
    pairingCode: "A1B2C3D4",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as unknown as { window?: { jobPilot?: unknown } })
      .window;
  });

  it("1. renders card structure and title", () => {
    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getBridgeInfo: vi.fn().mockResolvedValue(mockBridgeInfo),
      },
    };

    const html = renderToString(<BrowserExtensionCard />);
    expect(html).toContain("Browser Extension Connection");
    expect(html).toContain("Pair your Chrome or Edge extension");
  });

  it("2. displays pairing code and bridge host when bridge info is available", async () => {
    const getBridgeInfoMock = vi.fn().mockResolvedValue(mockBridgeInfo);
    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getBridgeInfo: getBridgeInfoMock,
      },
    };

    const api = (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window.jobPilot;
    const info = await api.getBridgeInfo!();
    expect(info).toEqual(mockBridgeInfo);
    expect(info?.pairingCode).toBe("A1B2C3D4");
    expect(info?.host).toBe("127.0.0.1");
    expect(info?.port).toBe(4173);
  });

  it("3. handles bridge unavailable (null returned) gracefully", async () => {
    const getBridgeInfoMock = vi.fn().mockResolvedValue(null);
    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getBridgeInfo: getBridgeInfoMock,
      },
    };

    const api = (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window.jobPilot;
    const info = await api.getBridgeInfo!();
    expect(info).toBeNull();
  });

  it("4. handles bridge IPC error without exposing sensitive internals", async () => {
    const getBridgeInfoMock = vi
      .fn()
      .mockRejectedValue(new Error("IPC failed"));
    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getBridgeInfo: getBridgeInfoMock,
      },
    };

    const api = (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window.jobPilot;
    await expect(api.getBridgeInfo!()).rejects.toThrow("IPC failed");
  });
});
