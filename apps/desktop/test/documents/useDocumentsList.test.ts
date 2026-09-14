import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  useDocumentsList,
  UseDocumentsListOptions,
} from "../../renderer/src/hooks/useDocumentsList";
import * as useCasesModule from "@jobpilot/use-cases";
import * as authModule from "../../renderer/src/auth/useAuth";
import type { DocumentRecord, PaginatedResult } from "@jobpilot/types";
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

interface HookHarness<T> {
  current: T;
  unmount: () => void;
}

function renderCustomHook<T>(
  callback: (props?: UseDocumentsListOptions) => T,
  initialProps?: UseDocumentsListOptions,
): HookHarness<T> {
  const result = {} as { current: T };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container as unknown as Element);

  function TestComponent({ props }: { props?: UseDocumentsListOptions }) {
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

describe("useDocumentsList Hook", () => {
  const fakeSupabase = {
    client: "fake-supabase",
  } as unknown as SupabaseClient;

  const mockDocuments: DocumentRecord[] = [
    {
      id: "doc-1",
      user_id: "user-1",
      document_group_id: "grp-1",
      document_type: "RESUME",
      category: "resumes",
      name: "Senior_FullStack_Resume.pdf",
      storage_path: "user-1/resumes/grp-1/v1/Senior_FullStack_Resume.pdf",
      mime_type: "application/pdf",
      file_size: 102400,
      version: 1,
      is_active: true,
      created_at: "2026-09-14T10:00:00.000Z",
      updated_at: "2026-09-14T10:00:00.000Z",
    },
    {
      id: "doc-2",
      user_id: "user-1",
      document_group_id: "grp-2",
      document_type: "COVER_LETTER",
      category: "cover-letters",
      name: "Google_CoverLetter.pdf",
      storage_path: "user-1/cover-letters/grp-2/v1/Google_CoverLetter.pdf",
      mime_type: "application/pdf",
      file_size: 51200,
      version: 1,
      is_active: true,
      created_at: "2026-09-13T10:00:00.000Z",
      updated_at: "2026-09-13T10:00:00.000Z",
    },
  ];

  const defaultPaginatedResult: PaginatedResult<DocumentRecord> = {
    data: mockDocuments,
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: { id: "user-1", email: "user@example.com" } as User,
      session: {} as Session,
      status: "AUTHENTICATED",
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resendVerificationEmail: vi.fn(),
      refreshSession: vi.fn(),
      supabase: fakeSupabase,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("1. initial load queries active documents with page=1, pageSize=20, newest first", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue(defaultPaginatedResult);

    const harness = renderCustomHook(() => useDocumentsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.loading).toBe(false);
    expect(harness.current.documents).toEqual(mockDocuments);
    expect(harness.current.total).toBe(2);
    expect(harness.current.page).toBe(1);
    expect(harness.current.pageSize).toBe(20);

    expect(listSpy).toHaveBeenCalledWith(
      { supabase: fakeSupabase },
      { is_active: true },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("2. debounces document name search input by 300ms", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue(defaultPaginatedResult);

    const harness = renderCustomHook(() => useDocumentsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(1);

    // Update name search
    act(() => {
      harness.current.setFilters({ name: "Resume" });
    });

    // Immediate state reflects in filters
    expect(harness.current.filters.name).toBe("Resume");
    // But fetch has not fired before 300ms
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Advance timer by 299ms
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Advance 1ms (reaching 300ms)
    act(() => {
      vi.advanceTimersByTime(1);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: fakeSupabase },
      { is_active: true, name: "Resume" },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("3. setting filters resets page to 1", async () => {
    vi.spyOn(useCasesModule, "executeListDocuments").mockResolvedValue({
      ...defaultPaginatedResult,
      total: 50,
      totalPages: 3,
    });

    const harness = renderCustomHook(() =>
      useDocumentsList({ initialPage: 2 }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.page).toBe(2);

    act(() => {
      harness.current.setFilters({ document_type: "RESUME" });
    });

    expect(harness.current.page).toBe(1);
  });

  it("4. applies document_type and category filters combined with AND semantics", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue(defaultPaginatedResult);

    const harness = renderCustomHook(() => useDocumentsList());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      harness.current.setFilters({
        document_type: "COVER_LETTER",
        category: "cover-letters",
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: fakeSupabase },
      {
        is_active: true,
        document_type: "COVER_LETTER",
        category: "cover-letters",
      },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("5. clearing filters resets state and fetches unfiltered active list", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue(defaultPaginatedResult);

    const harness = renderCustomHook(() =>
      useDocumentsList({
        initialFilters: { document_type: "RESUME", name: "FullStack" },
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      harness.current.setFilters({});
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: fakeSupabase },
      { is_active: true },
      { page: 1, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("6. pagination preserves active filters and search", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue({
        ...defaultPaginatedResult,
        total: 50,
        totalPages: 3,
      });

    const harness = renderCustomHook(() =>
      useDocumentsList({
        initialFilters: { document_type: "RESUME" },
        initialPage: 1,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      harness.current.setPage(2);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.page).toBe(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: fakeSupabase },
      { is_active: true, document_type: "RESUME" },
      { page: 2, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("7. refresh preserves current search, filter, and page state", async () => {
    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockResolvedValue(defaultPaginatedResult);

    const harness = renderCustomHook(() =>
      useDocumentsList({
        initialFilters: { category: "resumes" },
        initialPage: 2,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(listSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await harness.current.refresh();
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(listSpy).toHaveBeenLastCalledWith(
      { supabase: fakeSupabase },
      { is_active: true, category: "resumes" },
      { page: 2, pageSize: 20 },
      { sortBy: "created_at", sortOrder: "desc" },
    );
  });

  it("8. protects against stale out-of-order async responses", async () => {
    let resolveFirst!: (val: PaginatedResult<DocumentRecord>) => void;
    let resolveSecond!: (val: PaginatedResult<DocumentRecord>) => void;

    const firstPromise = new Promise<PaginatedResult<DocumentRecord>>((res) => {
      resolveFirst = res;
    });
    const secondPromise = new Promise<PaginatedResult<DocumentRecord>>(
      (res) => {
        resolveSecond = res;
      },
    );

    const listSpy = vi
      .spyOn(useCasesModule, "executeListDocuments")
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const harness = renderCustomHook(() => useDocumentsList());

    // Trigger second query immediately
    act(() => {
      harness.current.setFilters({ document_type: "CERTIFICATE" });
    });

    // Resolve second (latest) response first
    await act(async () => {
      resolveSecond({
        data: [mockDocuments[1]!],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    expect(harness.current.documents).toEqual([mockDocuments[1]]);

    // Now resolve first (stale) response
    await act(async () => {
      resolveFirst({
        data: [mockDocuments[0]!],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    // Documents should NOT be overwritten by stale first promise
    expect(harness.current.documents).toEqual([mockDocuments[1]]);
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it("9. handles use-case execution errors gracefully", async () => {
    vi.spyOn(useCasesModule, "executeListDocuments").mockRejectedValue(
      new Error("Network connection error"),
    );

    const harness = renderCustomHook(() => useDocumentsList());

    await act(async () => {
      await Promise.resolve();
    });

    expect(harness.current.loading).toBe(false);
    expect(harness.current.error).toBe("Network connection error");
    expect(harness.current.documents).toEqual([]);
  });
});
