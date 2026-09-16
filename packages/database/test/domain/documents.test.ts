import { describe, it, expect, vi } from "vitest";
import {
  listDocuments,
  findDocumentByContentHash,
  uploadDocument,
  replaceDocumentVersion,
} from "../../src/domain/documents.js";
import { ConflictError } from "@jobpilot/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

interface MockQueryChain {
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
}

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

  it("applies sanitized name search with escaped wildcards and combines with filters", async () => {
    const mockDocs = [
      { id: "doc-1", name: "Resume_100%_Final.pdf", is_active: true },
    ];

    const range = vi
      .fn()
      .mockResolvedValue({ data: mockDocs, count: 1, error: null });
    const order = vi.fn().mockReturnValue({ range });
    const eqCategory = vi.fn().mockReturnValue({ order });
    const eqType = vi.fn().mockReturnValue({ eq: eqCategory });
    const ilikeName = vi.fn().mockReturnValue({ eq: eqType });
    const eqActive = vi.fn().mockReturnValue({ ilike: ilikeName });
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

    const result = await listDocuments(supabase, {
      name: "100%_Final",
      document_type: "RESUME",
      category: "resumes",
    });

    expect(result.data).toEqual(mockDocs);
    expect(ilikeName).toHaveBeenCalledWith("name", "%100\\%\\_Final%");
    expect(eqType).toHaveBeenCalledWith("document_type", "RESUME");
    expect(eqCategory).toHaveBeenCalledWith("category", "resumes");
  });

  it("findDocumentByContentHash searches for matching document owned by user", async () => {
    const mockDoc = {
      id: "doc-1",
      user_id: mockUser.id,
      content_hash:
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      name: "Resume.pdf",
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockDoc, error: null });
    const eqHash = vi.fn().mockReturnValue({ maybeSingle });
    const eqUser = vi.fn().mockReturnValue({ eq: eqHash });
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

    const result = await findDocumentByContentHash(
      supabase,
      mockDoc.content_hash,
    );
    expect(result).toEqual(mockDoc);
    expect(eqUser).toHaveBeenCalledWith("user_id", mockUser.id);
    expect(eqHash).toHaveBeenCalledWith("content_hash", mockDoc.content_hash);
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

    // Mock query chain: first maybeSingle returns null (no duplicate found), then insert single fails with DB error
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23514", message: "check constraint violation" },
    });

    const chain: MockQueryChain = {
      eq: vi.fn(),
      maybeSingle,
      select: vi.fn().mockReturnValue({ single }),
    };
    chain.eq.mockImplementation(() => chain);

    const dbFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single }),
      }),
    });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: storageFrom },
      from: dbFrom,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["test unique content"], {
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

  it("uploadDocument throws ConflictError if identical content hash already exists for user", async () => {
    const mockExistingDoc = {
      id: "existing-doc-1",
      user_id: mockUser.id,
      content_hash:
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      name: "OldResume.pdf",
    };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: mockExistingDoc, error: null });
    const chain: MockQueryChain = {
      eq: vi.fn(),
      maybeSingle,
    };
    chain.eq.mockImplementation(() => chain);

    const dbFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });
    const uploadStorage = vi.fn();

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: vi.fn().mockReturnValue({ upload: uploadStorage }) },
      from: dbFrom,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["hello world"], {
      type: "application/pdf",
    }) as unknown as File;

    await expect(
      uploadDocument(supabase, {
        file: mockFile,
        fileName: "Different_Name_Same_Content.pdf",
        category: "resumes",
        documentType: "RESUME",
      }),
    ).rejects.toThrow(ConflictError);

    // Verify storage upload was NOT even attempted due to upfront duplicate detection
    expect(uploadStorage).not.toHaveBeenCalled();
  });

  it("uploadDocument computes SHA-256 content_hash and uploads successfully when unique", async () => {
    const uploadStorage = vi
      .fn()
      .mockResolvedValue({ data: { path: "some/path" }, error: null });

    const mockInsertedDoc = {
      id: "doc-100",
      user_id: mockUser.id,
      document_group_id: "grp-100",
      name: "unique_resume.pdf",
      content_hash:
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      version: 1,
      is_active: true,
    };

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const single = vi
      .fn()
      .mockResolvedValue({ data: mockInsertedDoc, error: null });

    const chain: MockQueryChain = {
      eq: vi.fn(),
      maybeSingle,
    };
    chain.eq.mockImplementation(() => chain);

    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });

    const dbFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
      insert: insertFn,
    });

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: vi.fn().mockReturnValue({ upload: uploadStorage }) },
      from: dbFrom,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["hello world"], {
      type: "application/pdf",
    }) as unknown as File;

    const result = await uploadDocument(supabase, {
      file: mockFile,
      fileName: "unique_resume.pdf",
      category: "resumes",
      documentType: "RESUME",
    });

    expect(result.id).toBe("doc-100");
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        content_hash:
          "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      }),
    );
  });

  it("replaceDocumentVersion throws ConflictError if duplicate content hash exists", async () => {
    const mockActiveDoc = {
      id: "doc-1",
      document_group_id: "grp-1",
      category: "resumes",
      document_type: "RESUME",
      is_active: true,
      version: 1,
    };

    // First call to maybeSingle fetches active doc; second call finds existing doc with same content hash
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: mockActiveDoc, error: null })
      .mockResolvedValueOnce({
        data: { id: "dup-doc", content_hash: "hash123" },
        error: null,
      });

    const chain: MockQueryChain = {
      eq: vi.fn(),
      maybeSingle,
    };
    chain.eq.mockImplementation(() => chain);

    const dbFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });
    const uploadStorage = vi.fn();

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: { from: vi.fn().mockReturnValue({ upload: uploadStorage }) },
      from: dbFrom,
    } as unknown as SupabaseClient;

    const mockFile = new Blob(["duplicate content"], {
      type: "application/pdf",
    }) as unknown as File;

    await expect(
      replaceDocumentVersion(supabase, "grp-1", {
        file: mockFile,
        fileName: "resume_dup.pdf",
      }),
    ).rejects.toThrow(ConflictError);

    expect(uploadStorage).not.toHaveBeenCalled();
  });

  it("replaceDocumentVersion replaces document version calling RPC create_document_version with p_content_hash", async () => {
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

    // First call: active doc. Second call: duplicate check returns null (no dup)
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: mockActiveDoc, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const chain: MockQueryChain = {
      eq: vi.fn(),
      maybeSingle,
    };
    chain.eq.mockImplementation(() => chain);

    const dbFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

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
        p_content_hash: expect.any(String),
      }),
    );
  });
});
