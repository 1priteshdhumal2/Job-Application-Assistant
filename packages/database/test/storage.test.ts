import { describe, it, expect, vi } from "vitest";
import {
  uploadCurrentUserDocument,
  listCurrentUserDocuments,
  downloadCurrentUserDocument,
  deleteCurrentUserDocument,
  USER_DOCUMENTS_BUCKET,
} from "../src/storage.js";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Storage Service (User-Scoped Isolation Model)", () => {
  const mockUserId = "11111111-2222-3333-4444-555555555555";
  const otherUserId = "99999999-8888-7777-6666-555555555555";

  it("uploadCurrentUserDocument generates user-scoped path and uploads file", async () => {
    const uploadMock = vi.fn().mockResolvedValue({
      data: { path: "uploaded-path" },
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      },
    } as unknown as SupabaseClient;

    const fakeFile = new Blob(["sample pdf content"], {
      type: "application/pdf",
    });

    const result = await uploadCurrentUserDocument(
      mockSupabase,
      "resumes",
      fakeFile,
      "MyResume.pdf",
    );

    expect(mockSupabase.storage.from).toHaveBeenCalledWith(
      USER_DOCUMENTS_BUCKET,
    );
    expect(uploadMock).toHaveBeenCalledTimes(1);

    const calledPath = uploadMock.mock.calls[0][0] as string;
    expect(calledPath.startsWith(`${mockUserId}/resumes/MyResume-`)).toBe(true);
    expect(calledPath.endsWith(".pdf")).toBe(true);
    expect(result.storagePath).toBe(calledPath);
    expect(result.category).toBe("resumes");
  });

  it("uploadCurrentUserDocument rejects invalid file types before storage upload", async () => {
    const uploadMock = vi.fn();
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ upload: uploadMock }),
      },
    } as unknown as SupabaseClient;

    const exeBlob = new Blob(["binary"], { type: "application/x-msdownload" });

    await expect(
      uploadCurrentUserDocument(mockSupabase, "resumes", exeBlob, "script.exe"),
    ).rejects.toThrow(/Unsupported file type/);

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("listCurrentUserDocuments queries only folders for the current user", async () => {
    const listMock = vi.fn().mockResolvedValue({
      data: [
        {
          name: "cv-1.pdf",
          id: "obj-1",
          created_at: "2026-08-21T00:00:00Z",
          updated_at: "2026-08-21T00:00:00Z",
          metadata: { size: 1024, mimetype: "application/pdf" },
        },
      ],
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ list: listMock }),
      },
    } as unknown as SupabaseClient;

    const list = await listCurrentUserDocuments(mockSupabase, "resumes");

    expect(listMock).toHaveBeenCalledWith(
      `${mockUserId}/resumes`,
      expect.any(Object),
    );
    expect(list.length).toBe(1);
    expect(list[0].storagePath).toBe(`${mockUserId}/resumes/cv-1.pdf`);
    expect(list[0].category).toBe("resumes");
  });

  it("downloadCurrentUserDocument allows download when path belongs to current user", async () => {
    const fakeBlob = new Blob(["content"], { type: "application/pdf" });
    const downloadMock = vi.fn().mockResolvedValue({
      data: fakeBlob,
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ download: downloadMock }),
      },
    } as unknown as SupabaseClient;

    const validPath = `${mockUserId}/resumes/cv-1.pdf`;
    const result = await downloadCurrentUserDocument(mockSupabase, validPath);

    expect(downloadMock).toHaveBeenCalledWith(validPath);
    expect(result).toBe(fakeBlob);
  });

  it("downloadCurrentUserDocument rejects cross-user document access", async () => {
    const downloadMock = vi.fn();
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ download: downloadMock }),
      },
    } as unknown as SupabaseClient;

    const otherUserPath = `${otherUserId}/resumes/secret.pdf`;

    await expect(
      downloadCurrentUserDocument(mockSupabase, otherUserPath),
    ).rejects.toThrow(/Unauthorized document access/);

    expect(downloadMock).not.toHaveBeenCalled();
  });

  it("deleteCurrentUserDocument rejects cross-user document deletion", async () => {
    const removeMock = vi.fn();
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ remove: removeMock }),
      },
    } as unknown as SupabaseClient;

    const otherUserPath = `${otherUserId}/resumes/target.pdf`;

    await expect(
      deleteCurrentUserDocument(mockSupabase, otherUserPath),
    ).rejects.toThrow(/Unauthorized document deletion/);

    expect(removeMock).not.toHaveBeenCalled();
  });
});
