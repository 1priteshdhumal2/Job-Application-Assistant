import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isCurrentPageJobPosting,
  renderFloatingBadge,
  removeFloatingBadge,
  handleBadgeClick,
  handlePageEvaluation,
} from "../src/content/index";

describe("Content Script - Indeed Detection & Badge Lifecycle (Phase 2D-3 Slice B)", () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;
  let elementsMap: Map<string, unknown>;

  beforeEach(() => {
    elementsMap = new Map();
    sendMessageMock = vi.fn();

    // Setup global window / document mock in Node test runner
    const mockElements: Record<
      string,
      {
        id?: string;
        textContent?: string;
        innerText?: string;
        style?: Record<string, string>;
        innerHTML?: string;
        remove?: () => void;
        setAttribute?: (k: string, v: string) => void;
        getAttribute?: (k: string) => string | null;
        querySelector?: (sel: string) => unknown;
        addEventListener?: (evt: string, fn: unknown) => void;
      }
    > = {};

    const mockBody = {
      appendChild: (child: { id?: string }) => {
        if (child.id) mockElements[child.id] = child;
      },
      innerHTML: "",
    };

    const mockDoc = {
      body: mockBody,
      readyState: "complete",
      getElementById: (id: string) => mockElements[id] || null,
      querySelector: (selector: string) => {
        if (selector === "#jobpilot-apply-button") {
          return {
            textContent:
              mockElements["jobpilot-apply-badge-root"]?.innerHTML || "",
            addEventListener: vi.fn(),
            style: {},
          };
        }
        return elementsMap.get(selector) || null;
      },
      querySelectorAll: (selector: string) => {
        if (selector === "#jobpilot-apply-badge-root") {
          return mockElements["jobpilot-apply-badge-root"]
            ? [mockElements["jobpilot-apply-badge-root"]]
            : [];
        }
        return [];
      },
      createElement: (tag: string) => {
        const el = {
          tagName: tag,
          id: "",
          innerHTML: "",
          style: { cssText: "" },
          setAttribute: (k: string, v: string) => {
            el[k] = v;
          },
          getAttribute: (k: string) => el[k] || null,
          remove: () => {
            if (el.id && mockElements[el.id]) {
              delete mockElements[el.id];
            }
          },
          querySelector: (sel: string) => {
            if (sel === "#jobpilot-apply-button") {
              return {
                textContent: el.innerHTML,
                addEventListener: vi.fn(),
                style: {},
              };
            }
            return null;
          },
        };
        return el;
      },
      addEventListener: vi.fn(),
    };

    vi.stubGlobal("document", mockDoc);
    vi.stubGlobal("window", {
      location: new URL("https://www.indeed.com/viewjob?jk=1234567890abcdef"),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: sendMessageMock,
        lastError: null,
      },
    });
  });

  afterEach(() => {
    removeFloatingBadge();
    vi.restoreAllMocks();
  });

  it("1. correctly detects Indeed job page from URL", () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=1234567890abcdef",
    ) as unknown as Location;

    expect(isCurrentPageJobPosting()).toBe(true);
  });

  it("2. detects non-job page and returns false", () => {
    window.location = new URL(
      "https://www.indeed.com/salaries",
    ) as unknown as Location;

    expect(isCurrentPageJobPosting()).toBe(false);
  });

  it("3. renders floating badge when on job page and prevents duplicate injection", () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=1234567890abcdef",
    ) as unknown as Location;

    renderFloatingBadge({ state: "idle" });
    const badge = document.getElementById("jobpilot-apply-badge-root");
    expect(badge).not.toBeNull();
    expect(badge?.innerHTML).toContain("Apply with JobPilot");

    // Re-rendering should not duplicate the container
    renderFloatingBadge({ state: "idle" });
    const allBadges = document.querySelectorAll("#jobpilot-apply-badge-root");
    expect(allBadges.length).toBe(1);
  });

  it("4. removes floating badge when navigating away from job page", () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=1234567890abcdef",
    ) as unknown as Location;

    renderFloatingBadge({ state: "idle" });
    expect(document.getElementById("jobpilot-apply-badge-root")).not.toBeNull();

    // Navigate to non-job page
    window.location = new URL(
      "https://www.indeed.com/company/about",
    ) as unknown as Location;
    handlePageEvaluation();

    expect(document.getElementById("jobpilot-apply-badge-root")).toBeNull();
  });

  it("5. clicking badge extracts valid metadata and sends message to background worker", async () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=jk_test_click_123",
    ) as unknown as Location;

    elementsMap.set("[data-testid='jobsearch-JobInfoHeader-title']", {
      textContent: "Senior TypeScript Engineer",
    });
    elementsMap.set("[data-testid='inlineHeader-companyName']", {
      textContent: "OpenAI Inc.",
    });
    elementsMap.set("[data-testid='inlineHeader-companyLocation']", {
      textContent: "San Francisco, CA",
    });
    elementsMap.set("#jobDescriptionText", {
      textContent: "Build amazing agentic workflows.",
    });

    sendMessageMock.mockImplementation((_msg, callback) => {
      callback({ success: true, data: { status: "received" } });
    });

    renderFloatingBadge({ state: "idle" });
    await handleBadgeClick();

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CAPTURE_JOB_CONTEXT",
        payload: expect.objectContaining({
          portal: "indeed",
          externalJobId: "jk_test_click_123",
          title: "Senior TypeScript Engineer",
          company: "OpenAI Inc.",
          location: "San Francisco, CA",
          description: "Build amazing agentic workflows.",
        }),
      }),
      expect.any(Function),
    );

    // Verify feedback state changed to success
    const badge = document.getElementById("jobpilot-apply-badge-root");
    expect(badge?.innerHTML).toContain("Sent to JobPilot");
  });

  it("6. shows error feedback when job details are incomplete/unavailable", async () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=jk_incomplete",
    ) as unknown as Location;

    // Elements map is empty -> title, company, location missing
    renderFloatingBadge({ state: "idle" });
    await handleBadgeClick();

    expect(sendMessageMock).not.toHaveBeenCalled();
    const badge = document.getElementById("jobpilot-apply-badge-root");
    expect(badge?.innerHTML).toContain("Job details unavailable");
  });

  it("7. shows bridge error feedback when background returns error", async () => {
    window.location = new URL(
      "https://www.indeed.com/viewjob?jk=jk_error_test",
    ) as unknown as Location;

    elementsMap.set("[data-testid='jobsearch-JobInfoHeader-title']", {
      textContent: "Backend Engineer",
    });
    elementsMap.set("[data-testid='inlineHeader-companyName']", {
      textContent: "Apple",
    });
    elementsMap.set("[data-testid='inlineHeader-companyLocation']", {
      textContent: "Cupertino, CA",
    });

    sendMessageMock.mockImplementation((_msg, callback) => {
      callback({
        success: false,
        error: "Pair JobPilot with the desktop app first.",
      });
    });

    renderFloatingBadge({ state: "idle" });
    await handleBadgeClick();

    expect(sendMessageMock).toHaveBeenCalled();
    const badge = document.getElementById("jobpilot-apply-badge-root");
    expect(badge?.innerHTML).toContain("Pair JobPilot");
  });
});
