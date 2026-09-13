import { describe, it, expect, vi } from "vitest";
import { executeUploadUserDocument } from "../../src/documents/upload-user-document.use-case.js";
import { executeReplaceDocumentVersion } from "../../src/documents/replace-document-version.use-case.js";
import { UseCaseContext } from "../../src/common/context.js";
import type { DocumentRecord } from "@jobpilot/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as databaseModule from "@jobpilot/database";

describe("Document UseCases (Unit)", () => {
  const mockUser = { id: "00000000-0000-0000-0000-000000000001" };

  it("orchestrates document upload", async () => {
    const mockDoc = {
      id: "doc-1",
      user_id: mockUser.id,
      name: "resume.pdf",
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const uploadSpy = vi
      .spyOn(databaseModule, "uploadDocument")
      .mockResolvedValue(mockDoc as unknown as DocumentRecord);

    const context: UseCaseContext = { supabase };

    const mockFile = new Blob(["dummy"], { type: "application/pdf" });
    const result = await executeUploadUserDocument(context, {
      file: mockFile,
      fileName: "resume.pdf",
      category: "resumes",
      documentType: "RESUME",
    });

    expect(result).toEqual(mockDoc);
    expect(uploadSpy).toHaveBeenCalledOnce();
  });

  it("orchestrates document version replacement", async () => {
    const mockDoc = {
      id: "doc-v2",
      user_id: mockUser.id,
      document_group_id: "group-1",
      version: 2,
    };

    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as SupabaseClient;

    const replaceSpy = vi
      .spyOn(databaseModule, "replaceDocumentVersion")
      .mockResolvedValue(mockDoc as unknown as DocumentRecord);

    const context: UseCaseContext = { supabase };

    const mockFile = new Blob(["dummy2"], { type: "application/pdf" });
    const result = await executeReplaceDocumentVersion(context, "group-1", {
      file: mockFile,
      fileName: "resume_v2.pdf",
    });

    expect(result).toEqual(mockDoc);
    expect(replaceSpy).toHaveBeenCalledOnce();
  });
});
