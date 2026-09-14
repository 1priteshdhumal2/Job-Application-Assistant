import { describe, it, expect, vi } from "vitest";
import { executeUploadUserDocument } from "../../src/documents/upload-user-document.use-case.js";
import { executeReplaceDocumentVersion } from "../../src/documents/replace-document-version.use-case.js";
import { executeListDocuments } from "../../src/documents/list-documents.use-case.js";
import { executeGetDocument } from "../../src/documents/get-document.use-case.js";
import { executeListDocumentVersions } from "../../src/documents/list-document-versions.use-case.js";
import { executeDownloadDocument } from "../../src/documents/download-document.use-case.js";
import { executeDeactivateDocument } from "../../src/documents/deactivate-document.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { DocumentRecord, PaginatedResult } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";
import { AuthError, NotFoundError, ValidationError } from "@jobpilot/database";

describe("Document UseCases (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  const createMockSupabase = (user: typeof mockUser | null = mockUser) =>
    ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: user ? null : new Error("No session"),
        }),
      },
    }) as unknown as SupabaseClient;

  const sampleDoc: DocumentRecord = {
    id: "doc-1",
    user_id: mockUser.id,
    document_group_id: "grp-1",
    document_type: "RESUME",
    category: "resumes",
    name: "resume.pdf",
    storage_path: `${mockUser.id}/resumes/resume-1.pdf`,
    mime_type: "application/pdf",
    file_size: 10240,
    version: 1,
    is_active: true,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  describe("Authenticated Execution", () => {
    it("orchestrates executeUploadUserDocument", async () => {
      const supabase = createMockSupabase();
      const uploadSpy = vi
        .spyOn(databaseModule, "uploadDocument")
        .mockResolvedValue(sampleDoc);

      const context: UseCaseContext = { supabase };
      const mockFile = new Blob(["dummy"], { type: "application/pdf" });
      const input = {
        file: mockFile,
        fileName: "resume.pdf",
        category: "resumes" as const,
        documentType: "RESUME" as const,
      };

      const result = await executeUploadUserDocument(context, input);

      expect(result).toEqual(sampleDoc);
      expect(uploadSpy).toHaveBeenCalledWith(supabase, input);
    });

    it("orchestrates executeReplaceDocumentVersion", async () => {
      const v2Doc: DocumentRecord = { ...sampleDoc, id: "doc-2", version: 2 };
      const supabase = createMockSupabase();
      const replaceSpy = vi
        .spyOn(databaseModule, "replaceDocumentVersion")
        .mockResolvedValue(v2Doc);

      const context: UseCaseContext = { supabase };
      const mockFile = new Blob(["dummy2"], { type: "application/pdf" });
      const input = {
        file: mockFile,
        fileName: "resume_v2.pdf",
      };

      const result = await executeReplaceDocumentVersion(
        context,
        "grp-1",
        input,
      );

      expect(result).toEqual(v2Doc);
      expect(replaceSpy).toHaveBeenCalledWith(supabase, "grp-1", input);
    });

    it("orchestrates executeListDocuments with filters, pagination, and sorting", async () => {
      const mockResult: PaginatedResult<DocumentRecord> = {
        data: [sampleDoc],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      const supabase = createMockSupabase();
      const listSpy = vi
        .spyOn(databaseModule, "listDocuments")
        .mockResolvedValue(mockResult);

      const context: UseCaseContext = { supabase };
      const filters = { is_active: true, document_type: "RESUME" as const };
      const pagination = { page: 1, pageSize: 20 };
      const sort = {
        sortBy: "created_at" as const,
        sortOrder: "desc" as const,
      };

      const result = await executeListDocuments(
        context,
        filters,
        pagination,
        sort,
      );

      expect(result).toEqual(mockResult);
      expect(listSpy).toHaveBeenCalledWith(supabase, filters, pagination, sort);
    });

    it("orchestrates executeGetDocument by ID", async () => {
      const supabase = createMockSupabase();
      const getSpy = vi
        .spyOn(databaseModule, "getDocument")
        .mockResolvedValue(sampleDoc);

      const context: UseCaseContext = { supabase };
      const result = await executeGetDocument(context, "doc-1");

      expect(result).toEqual(sampleDoc);
      expect(getSpy).toHaveBeenCalledWith(supabase, "doc-1");
    });

    it("orchestrates executeListDocumentVersions by documentGroupId", async () => {
      const versions = [sampleDoc];
      const supabase = createMockSupabase();
      const versionsSpy = vi
        .spyOn(databaseModule, "listDocumentVersions")
        .mockResolvedValue(versions);

      const context: UseCaseContext = { supabase };
      const result = await executeListDocumentVersions(context, "grp-1");

      expect(result).toEqual(versions);
      expect(versionsSpy).toHaveBeenCalledWith(supabase, "grp-1");
    });

    it("orchestrates executeDownloadDocument returning Blob without disk mutation", async () => {
      const mockBlob = new Blob(["file-content"], { type: "application/pdf" });
      const supabase = createMockSupabase();
      const downloadSpy = vi
        .spyOn(databaseModule, "downloadDocument")
        .mockResolvedValue(mockBlob);

      const context: UseCaseContext = { supabase };
      const result = await executeDownloadDocument(context, "doc-1");

      expect(result).toBe(mockBlob);
      expect(downloadSpy).toHaveBeenCalledWith(supabase, "doc-1");
    });

    it("orchestrates executeDeactivateDocument without storage deletion", async () => {
      const supabase = createMockSupabase();
      const deactivateSpy = vi
        .spyOn(databaseModule, "deactivateDocument")
        .mockResolvedValue(undefined);

      const context: UseCaseContext = { supabase };
      await executeDeactivateDocument(context, "grp-1");

      expect(deactivateSpy).toHaveBeenCalledWith(supabase, "grp-1");
    });
  });

  describe("Authentication Rejection", () => {
    it("rejects executeUploadUserDocument when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const uploadSpy = vi.spyOn(databaseModule, "uploadDocument");
      const context: UseCaseContext = { supabase };

      await expect(
        executeUploadUserDocument(context, {
          file: new Blob(["test"]),
          fileName: "test.pdf",
          category: "resumes",
          documentType: "RESUME",
        }),
      ).rejects.toThrow(AuthError);
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it("rejects executeReplaceDocumentVersion when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const replaceSpy = vi.spyOn(databaseModule, "replaceDocumentVersion");
      const context: UseCaseContext = { supabase };

      await expect(
        executeReplaceDocumentVersion(context, "grp-1", {
          file: new Blob(["test"]),
          fileName: "test.pdf",
        }),
      ).rejects.toThrow(AuthError);
      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it("rejects executeListDocuments when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const listSpy = vi.spyOn(databaseModule, "listDocuments");
      const context: UseCaseContext = { supabase };

      await expect(executeListDocuments(context)).rejects.toThrow(AuthError);
      expect(listSpy).not.toHaveBeenCalled();
    });

    it("rejects executeGetDocument when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const getSpy = vi.spyOn(databaseModule, "getDocument");
      const context: UseCaseContext = { supabase };

      await expect(executeGetDocument(context, "doc-1")).rejects.toThrow(
        AuthError,
      );
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("rejects executeListDocumentVersions when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const versionsSpy = vi.spyOn(databaseModule, "listDocumentVersions");
      const context: UseCaseContext = { supabase };

      await expect(
        executeListDocumentVersions(context, "grp-1"),
      ).rejects.toThrow(AuthError);
      expect(versionsSpy).not.toHaveBeenCalled();
    });

    it("rejects executeDownloadDocument when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const downloadSpy = vi.spyOn(databaseModule, "downloadDocument");
      const context: UseCaseContext = { supabase };

      await expect(executeDownloadDocument(context, "doc-1")).rejects.toThrow(
        AuthError,
      );
      expect(downloadSpy).not.toHaveBeenCalled();
    });

    it("rejects executeDeactivateDocument when unauthenticated", async () => {
      const supabase = createMockSupabase(null);
      const deactivateSpy = vi.spyOn(databaseModule, "deactivateDocument");
      const context: UseCaseContext = { supabase };

      await expect(executeDeactivateDocument(context, "grp-1")).rejects.toThrow(
        AuthError,
      );
      expect(deactivateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Error Propagation", () => {
    it("propagates NotFoundError from executeGetDocument", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "getDocument").mockRejectedValue(
        new NotFoundError("Document not found"),
      );

      const context: UseCaseContext = { supabase };
      await expect(executeGetDocument(context, "missing-doc")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("propagates ValidationError from executeUploadUserDocument", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "uploadDocument").mockRejectedValue(
        new ValidationError("Unsupported file type"),
      );

      const context: UseCaseContext = { supabase };
      await expect(
        executeUploadUserDocument(context, {
          file: new Blob(["exe"]),
          fileName: "file.exe",
          category: "resumes",
          documentType: "RESUME",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("propagates NotFoundError from executeDeactivateDocument", async () => {
      const supabase = createMockSupabase();
      vi.spyOn(databaseModule, "deactivateDocument").mockRejectedValue(
        new NotFoundError("Active document not found in group"),
      );

      const context: UseCaseContext = { supabase };
      await expect(
        executeDeactivateDocument(context, "missing-grp"),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
