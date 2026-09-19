import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { CapturedJobCard } from "../../renderer/src/components/bridge/CapturedJobCard";
import type { CapturedJobPayload, JobPilotElectronAPI } from "@jobpilot/types";

describe("CapturedJobCard Component (Phase 2D-3 Slice B)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as unknown as { window?: { jobPilot?: unknown } })
      .window;
  });

  it("1. renders empty state placeholder when no job has been captured yet", () => {
    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getCapturedJob: vi.fn().mockResolvedValue(null),
        onJobCaptured: vi.fn(() => () => {}),
      },
    };

    const html = renderToString(<CapturedJobCard />);
    expect(html).toContain("Captured Job Context");
    expect(html).toContain("No job captured yet");
  });

  it("2. displays captured job details correctly via API mock", async () => {
    const mockJob: CapturedJobPayload = {
      portal: "indeed",
      externalJobId: "jk_test_123",
      url: "https://www.indeed.com/viewjob?jk=jk_test_123",
      title: "Senior React Engineer",
      company: "Acme Cloud",
      location: "San Francisco, CA",
      description: "Build exceptional desktop and web apps.",
      capturedAt: "2026-09-18T12:00:00.000Z",
    };

    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getCapturedJob: vi.fn().mockResolvedValue(mockJob),
        onJobCaptured: vi.fn(() => () => {}),
      },
    };

    const api = (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window.jobPilot;
    const result = await api.getCapturedJob!();

    expect(result).toEqual(mockJob);
    expect(result?.title).toBe("Senior React Engineer");
    expect(result?.company).toBe("Acme Cloud");
    expect(result?.location).toBe("San Francisco, CA");
    expect(result?.externalJobId).toBe("jk_test_123");
    expect(result?.url).toBe("https://www.indeed.com/viewjob?jk=jk_test_123");
  });

  it("3. registers listener via onJobCaptured for real-time streaming updates", () => {
    let capturedCallback: ((job: CapturedJobPayload) => void) | null = null;
    const onJobCapturedMock = vi.fn((cb: (job: CapturedJobPayload) => void) => {
      capturedCallback = cb;
      return () => {
        capturedCallback = null;
      };
    });

    (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window = {
      jobPilot: {
        getCapturedJob: vi.fn().mockResolvedValue(null),
        onJobCaptured: onJobCapturedMock,
      },
    };

    const api = (
      globalThis as unknown as {
        window: { jobPilot: Partial<JobPilotElectronAPI> };
      }
    ).window.jobPilot;
    const unsubscribe = api.onJobCaptured!((job) => {
      expect(job.title).toBe("Principal Architect");
    });

    expect(onJobCapturedMock).toHaveBeenCalled();
    expect(typeof capturedCallback).toBe("function");

    if (capturedCallback) {
      (capturedCallback as (job: CapturedJobPayload) => void)({
        portal: "indeed",
        externalJobId: "jk_live_999",
        url: "https://www.indeed.com/viewjob?jk=jk_live_999",
        title: "Principal Architect",
        company: "OpenAI",
        location: "San Francisco, CA",
        capturedAt: "2026-09-18T12:05:00.000Z",
      });
    }

    unsubscribe();
  });
});
