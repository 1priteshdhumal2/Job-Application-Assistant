import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  useJobsList,
  UseJobsListOptions,
} from "../../renderer/src/hooks/useJobsList";
import * as useCasesModule from "@jobpilot/use-cases";
import * as authModule from "../../renderer/src/auth/useAuth";
import type { Job, PaginatedResult } from "@jobpilot/types";
import type { SupabaseClient, User, Session } from "@jobpilot/database";

interface FakeNode {
  nodeType: number;
  tagName: string;
  nodeName: string;
  ownerDocument: unknown;
  childNodes: FakeNode[];
  firstChild: FakeNode | null;
  lastChild: FakeNode | null;
  nextSibling: FakeNode | null;
  previousSibling: FakeNode | null;
  parentNode: FakeNode | null;
  style: Record<string, unknown>;
  namespaceURI: string;
  textContent?: string;
  appendChild: (child: FakeNode) => FakeNode;
  removeChild: (child: FakeNode) => FakeNode;
  insertBefore: (child: FakeNode) => FakeNode;
  remove: () => void;
  setAttribute: () => void;
  removeAttribute: () => void;
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => boolean;
}

// Minimal DOM environment setup for React 18 createRoot in Node test environment
function setupMinimalDOM() {
  const createFakeNode = (type = 1, tag = "DIV"): FakeNode => {
    const el: FakeNode = {
      nodeType: type,
      tagName: tag,
      nodeName: tag,
      ownerDocument: null,
      childNodes: [],
      firstChild: null,
      lastChild: null,
      nextSibling: null,
      previousSibling: null,
      parentNode: null,
      style: {},
      namespaceURI: "http://www.w3.org/1999/xhtml",
      appendChild(child: FakeNode) {
        child.parentNode = this;
        this.childNodes.push(child);
        this.firstChild = this.childNodes[0] ?? null;
        this.lastChild = this.childNodes[this.childNodes.length - 1] ?? null;
        return child;
      },
      removeChild(child: FakeNode) {
        const idx = this.childNodes.indexOf(child);
        if (idx !== -1) this.childNodes.splice(idx, 1);
        child.parentNode = null;
        this.firstChild = this.childNodes[0] ?? null;
        this.lastChild = this.childNodes[this.childNodes.length - 1] ?? null;
        return child;
      },
      insertBefore(child: FakeNode) {
        return this.appendChild(child);
      },
      remove() {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      },
      setAttribute() {},
      removeAttribute() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
    };
    return el;
  };

  const doc = {
    nodeType: 9,
    nodeName: "#document",
    activeElement: null,
    defaultView: globalThis,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    createElement: (tag: string) => {
      const n = createFakeNode(1, tag.toUpperCase());
      n.ownerDocument = doc;
      return n;
    },
    createElementNS: (_ns: string, tag: string) => {
      const n = createFakeNode(1, tag.toUpperCase());
      n.ownerDocument = doc;
      return n;
    },
    createTextNode: (text: string) => {
      const n = createFakeNode(3, "#text");
      n.textContent = text;
      n.ownerDocument = doc;
      return n;
    },
    createComment: () => {
      const n = createFakeNode(8, "#comment");
      n.ownerDocument = doc;
      return n;
    },
    createDocumentFragment: () => {
      const n = createFakeNode(11, "#document-fragment");
      n.ownerDocument = doc;
      return n;
    },
    body: createFakeNode(1, "BODY"),
    documentElement: createFakeNode(1, "HTML"),
  };
  doc.body.ownerDocument = doc;
  doc.documentElement.ownerDocument = doc;

  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g["document"] === "undefined") {
    g["document"] = doc;
    g["window"] = globalThis;
    g["addEventListener"] = () => {};
    g["removeEventListener"] = () => {};
    g["dispatchEvent"] = () => true;
    g["HTMLElement"] = class {};
    g["Element"] = class {};
    g["HTMLIFrameElement"] = class {};
    g["HTMLDocument"] = class {};
    g["DocumentFragment"] = class {};
    g["Event"] = class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    };
    g["CustomEvent"] = class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    };
    g["Node"] = {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9,
      DOCUMENT_FRAGMENT_NODE: 11,
    };
    try {
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Node" },
        configurable: true,
        writable: true,
      });
    } catch {
      // navigator might already be defined in modern node
    }
    g["IS_REACT_ACT_ENVIRONMENT"] = true;
  }
}

setupMinimalDOM();

// Helper hook test harness using React 18 createRoot & act
interface HookHarness<T> {
  current: T;
  unmount: () => void;
}

function renderCustomHook<T>(
  callback: (props?: UseJobsListOptions) => T,
  initialProps?: UseJobsListOptions,
): HookHarness<T> {
  const result = {} as { current: T };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container as unknown as Element);

  function TestComponent({ props }: { props?: UseJobsListOptions }) {
    result.current = callback(props);
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent, { props: initialProps }));
  });

  return {
    get current() {
      return result.current;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useJobsList Hook (Unit)", () => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
  } as unknown as SupabaseClient;

  const sampleJob: Job = {
    id: "job-123",
    user_id: "user-1",
    portal_id: null,
    company_name: "Acme Corp",
    job_title: "Staff Engineer",
    job_url: "https://example.com/job",
    location: "Remote",
    employment_type: "Full-time",
    description: "Build distributed systems",
    salary_min: 150000,
    salary_max: 200000,
    currency: "USD",
    posted_at: "2026-09-01T00:00:00.000Z",
    captured_at: "2026-09-01T00:00:00.000Z",
    status: "SAVED",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const samplePaginatedResult: PaginatedResult<Job> = {
    data: [sampleJob],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      status: "AUTHENTICATED",
      user: { id: "user-1", email: "user@example.com" } as unknown as User,
      session: {} as unknown as Session,
      supabase: mockSupabase,
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendVerificationEmail: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("1. passes authenticated Supabase client to executeListJobs with default parameters", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledWith(
      { supabase: mockSupabase },
      undefined,
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );

    expect(harness.current.jobs).toEqual([sampleJob]);
    expect(harness.current.total).toBe(1);
    expect(harness.current.page).toBe(1);
    expect(harness.current.pageSize).toBe(20);
    expect(harness.current.totalPages).toBe(1);
    expect(harness.current.loading).toBe(false);
    expect(harness.current.error).toBeNull();

    harness.unmount();
  });

  it("2. does not execute use-case when unauthenticated or supabase is null", async () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      status: "UNAUTHENTICATED",
      user: null,
      session: null,
      supabase: null,
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendVerificationEmail: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const listSpy = vi.spyOn(useCasesModule, "executeListJobs");
    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).not.toHaveBeenCalled();
    expect(harness.current.loading).toBe(false);
    expect(harness.current.jobs).toEqual([]);

    harness.unmount();
  });

  it("3. debounces company_name filter by 300ms and resets page to 1", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Update company filter
    act(() => {
      harness.current.setFilters({ company_name: "Google" });
    });

    // Before 300ms timer elapses, no new fetch should have been sent
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Advance remaining 100ms
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      { company_name: "Google" },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );

    harness.unmount();
  });

  it("4. debounces job_title filter by 300ms and normalizes empty text filters", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });

    // Set whitespace-only title filter
    act(() => {
      harness.current.setFilters({ job_title: "   " });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Whitespace should be trimmed/omitted resulting in undefined filters
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      undefined,
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );

    harness.unmount();
  });

  it("5. triggers status filter changes immediately without text debounce", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Update status filter
    await act(async () => {
      harness.current.setFilters((prev) => ({ ...prev, status: "APPLIED" }));
      await Promise.resolve();
    });

    // Status change is applied immediately
    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      { status: "APPLIED" },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );

    harness.unmount();
  });

  it("6. updates sort parameter and resets page to 1", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList({ initialPage: 3 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.page).toBe(3);

    // Change sort to company_name asc
    await act(async () => {
      harness.current.setSort({ sortBy: "company_name", sortOrder: "asc" });
      await Promise.resolve();
    });

    expect(harness.current.page).toBe(1);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      undefined,
      { page: 1, pageSize: 20 },
      { sortBy: "company_name", sortOrder: "asc" },
    );

    harness.unmount();
  });

  it("7. updates page and preserves active filters and sort", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() =>
      useJobsList({
        initialFilters: { status: "INTERESTED" },
        initialSort: { sortBy: "salary_max", sortOrder: "desc" },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Navigate to page 2
    await act(async () => {
      harness.current.setPage(2);
      await Promise.resolve();
    });

    expect(harness.current.page).toBe(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      { status: "INTERESTED" },
      { page: 2, pageSize: 20 },
      { sortBy: "salary_max", sortOrder: "desc" },
    );

    harness.unmount();
  });

  it("8. executes refresh() with current parameters without resetting filters, sort, or page", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockResolvedValue(samplePaginatedResult);

    const harness = renderCustomHook(() =>
      useJobsList({
        initialPage: 2,
        initialFilters: { status: "SAVED" },
        initialSort: { sortBy: "job_title", sortOrder: "asc" },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Call refresh
    await act(async () => {
      await harness.current.refresh();
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: mockSupabase },
      { status: "SAVED" },
      { page: 2, pageSize: 20 },
      { sortBy: "job_title", sortOrder: "asc" },
    );
    expect(harness.current.page).toBe(2);

    harness.unmount();
  });

  it("9. protects against stale responses when requests resolve out-of-order", async () => {
    let resolveFirst: (res: PaginatedResult<Job>) => void;
    let resolveSecond: (res: PaginatedResult<Job>) => void;

    const firstPromise = new Promise<PaginatedResult<Job>>((res) => {
      resolveFirst = res;
    });
    const secondPromise = new Promise<PaginatedResult<Job>>((res) => {
      resolveSecond = res;
    });

    const listSpy = vi
      .spyOn(useCasesModule, "executeListJobs")
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const harness = renderCustomHook(() => useJobsList());

    // First request starts
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Trigger second request by changing status
    await act(async () => {
      harness.current.setFilters({ status: "CLOSED" });
      await Promise.resolve();
    });
    expect(listSpy).toHaveBeenCalledTimes(2);

    // Second request resolves first with newer data
    const secondResult: PaginatedResult<Job> = {
      data: [{ ...sampleJob, id: "job-second", status: "CLOSED" }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    await act(async () => {
      resolveSecond!(secondResult);
      await Promise.resolve();
    });

    expect(harness.current.jobs[0]?.id).toBe("job-second");

    // First (stale) request resolves later with older data
    const firstResult: PaginatedResult<Job> = {
      data: [{ ...sampleJob, id: "job-first-stale" }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    await act(async () => {
      resolveFirst!(firstResult);
      await Promise.resolve();
    });

    // Stale result is discarded; state retains the second result
    expect(harness.current.jobs[0]?.id).toBe("job-second");

    harness.unmount();
  });

  it("10. handles errors and allows recovery via refresh()", async () => {
    vi.spyOn(useCasesModule, "executeListJobs")
      .mockRejectedValueOnce(new Error("Database connection lost"))
      .mockResolvedValueOnce(samplePaginatedResult);

    const harness = renderCustomHook(() => useJobsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.loading).toBe(false);
    expect(harness.current.error).toBe("Database connection lost");
    expect(harness.current.jobs).toEqual([]);

    // Recover via refresh()
    await act(async () => {
      await harness.current.refresh();
      await Promise.resolve();
    });

    expect(harness.current.loading).toBe(false);
    expect(harness.current.error).toBeNull();
    expect(harness.current.jobs).toEqual([sampleJob]);

    harness.unmount();
  });
});
