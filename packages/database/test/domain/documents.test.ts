import { describe, it, expect, vi } from "vitest";
import {
  listDocuments,
  uploadDocument,
  replaceDocumentVersion,
} from "../../src/domain/documents.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Documents Service (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("lists active documents by default", async () => {
    const mockDocs = [{ id: "doc-1", name: "Resume.pdf", is_active: true }];

    const range = vi
      .fn()
      .mockResolvedValue({ data: mockDocs, count: 1, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const eqActive = vi.fn().mockReturnValue({ order });
    const eqUser = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const result = await listDocuments(supabase);
    expect(result.data).toEqual(mockDocs);
    expect(eqActive).toHaveBeenCalledWith("is_active", true);
  });

  it("executes compensation deleting storage binary if metadata insert fails", async () => {
    const removeStorage = vi.fn().mockResolvedValue({ data: [], error: null });
    const uploadStorage = vi
      .fn()
      .mockResolvedValue({ data: { path: "some/path" }, error: null });

    const storageFrom = vi.fn().mockReturnValue({
      upload: uploadStorage,
      remove: removeStorage,
    });

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23514", message: "check constraint violation" },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const dbFrom = vi.fn().mockReturnValue({ insert });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: storageFrom },
      from: dbFrom,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["test"], {
      type: "application/pdf",
    }) as unknown as File;

    await expect(
      uploadDocument(supabase, {
        file: mockFile,
        fileName: "resume.pdf",
        category: "resumes",
        documentType: "RESUME",
      }),
    ).rejects.toThrow();

    expect(uploadStorage).toHaveBeenCalled();
    expect(removeStorage).toHaveBeenCalled();
  });

  it("replaces document version calling RPC create_document_version", async () => {
    const uploadStorage = vi
      .fn()
      .mockResolvedValue({ data: { path: "some/path" }, error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload: uploadStorage });

    const mockActiveDoc = {
      id: "doc-1",
      document_group_id: "grp-1",
      category: "resumes",
      document_type: "RESUME",
      is_active: true,
      version: 1,
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockActiveDoc, error: null });
    const eqActive = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ eq: eqActive });
    const eqGroup = vi.fn().mockReturnValue({ eq: eqUser });
    const select = vi.fn().mockReturnValue({ eq: eqGroup });
    const dbFrom = vi.fn().mockReturnValue({ select });

    const mockNewDoc = {
      id: "doc-2",
      document_group_id: "grp-1",
      version: 2,
      is_active: true,
    };

    const rpc = vi.fn().mockResolvedValue({ data: mockNewDoc, error: null });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: storageFrom },
      from: dbFrom,
      rpc,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["v2 content"], {
      type: "application/pdf",
    }) as unknown as File;

    const result = await replaceDocumentVersion(supabase, "grp-1", {
      file: mockFile,
      fileName: "resume_v2.pdf",
    });

    expect(result.version).toBe(2);
    expect(rpc).toHaveBeenCalledWith(
      "create_document_version",
      expect.objectContaining({
        p_document_group_id: "grp-1",
        p_name: "resume_v2.pdf",
      }),
    );
  });
});
