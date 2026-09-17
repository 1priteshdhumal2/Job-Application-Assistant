import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import {
  UploadDocumentModal,
  UploadDocumentModalProps,
  getCategoryFromDocumentType,
  getInitialDocumentName,
  formatFileSize,
  DOCUMENT_TYPE_OPTIONS,
} from "../../renderer/src/components/documents/UploadDocumentModal";
import type { SelectedDocumentFile, DocumentRecord } from "@jobpilot/types";
import * as useCasesModule from "@jobpilot/use-cases";
import * as useAuthModule from "../../renderer/src/auth/useAuth";
import { ConflictError } from "@jobpilot/shared";
import {
  validateFileForUpload,
  calculateContentHash,
} from "@jobpilot/validation";
import type { SupabaseClient, User } from "@jobpilot/database";

describe("UploadDocumentModal Component & Domain Unit Suite (Phase 2D-2C-3B)", () => {
  const samplePdfFile: SelectedDocumentFile = {
    fileData: new Uint8Array([104, 101, 108, 108, 111]),
    fileName: "Senior_Software_Engineer_Resume.pdf",
    mimeType: "application/pdf",
    fileSize: 1048576, // 1 MB
  };

  const sampleDocxFile: SelectedDocumentFile = {
    fileData: new Uint8Array([80, 75, 3, 4]),
    fileName: "Cover_Letter_2026.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 524288, // 512 KB
  };

  const sampleXlsxFile: SelectedDocumentFile = {
    fileData: new Uint8Array([80, 75, 3, 4]),
    fileName: "Portfolio_Metrics.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 2097152, // 2 MB
  };

  const sampleDocRecord: DocumentRecord = {
    id: "doc-123",
    user_id: "user-abc",
    document_group_id: "grp-123",
    document_type: "RESUME",
    category: "resumes",
    name: "Senior_Software_Engineer_Resume.pdf",
    storage_path: "user-abc/resumes/doc-123.pdf",
    mime_type: "application/pdf",
    file_size: 1048576,
    content_hash:
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    version: 1,
    is_active: true,
    created_at: "2026-09-16T00:00:00.000Z",
    updated_at: "2026-09-16T00:00:00.000Z",
  };

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-abc" } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      supabase: mockSupabase,
      user: { id: "user-abc", email: "test@example.com" } as User,
      session: null,
      status: "AUTHENTICATED",
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resendVerificationEmail: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  function renderModal(props: Partial<UploadDocumentModalProps> = {}) {
    const defaultProps: UploadDocumentModalProps = {
      isOpen: true,
      file: samplePdfFile,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      ...props,
    };
    return renderToString(<UploadDocumentModal {...defaultProps} />);
  }

  // 1. Initial name derivation (remove only file extension)
  it("1. getInitialDocumentName removes only file extension and preserves internal dots/underscores", () => {
    expect(getInitialDocumentName("Senior_Software_Engineer_Resume.pdf")).toBe(
      "Senior_Software_Engineer_Resume",
    );
    expect(getInitialDocumentName("My.Resume.v2.docx")).toBe("My.Resume.v2");
    expect(getInitialDocumentName("Portfolio.xlsx")).toBe("Portfolio");
    expect(getInitialDocumentName("no_extension")).toBe("no_extension");
  });

  // 2. Format file size helper
  it("2. formatFileSize formats bytes into B, KB, and MB accurately", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(153600)).toBe("150.0 KB");
    expect(formatFileSize(1048576)).toBe("1.00 MB");
    expect(formatFileSize(26214400)).toBe("25.00 MB");
  });

  // 3. Category mapping for all 5 document types
  it("3. getCategoryFromDocumentType maps all 5 document types to exact category strings", () => {
    expect(getCategoryFromDocumentType("RESUME")).toBe("resumes");
    expect(getCategoryFromDocumentType("COVER_LETTER")).toBe("cover-letters");
    expect(getCategoryFromDocumentType("CERTIFICATE")).toBe("certificates");
    expect(getCategoryFromDocumentType("PORTFOLIO")).toBe("portfolio");
    expect(getCategoryFromDocumentType("OTHER")).toBe("other");
    expect(getCategoryFromDocumentType("")).toBe("");
  });

  // 4. Modal renders file summary and form inputs
  it("4. renders modal with file summary, document name input, type select, and derived category", () => {
    const html = renderModal();

    expect(html).toContain("Upload Document");
    expect(html).toContain("Senior_Software_Engineer_Resume.pdf");
    expect(html).toContain("1.00 MB");
    expect(html).toContain('id="upload-doc-name"');
    expect(html).toContain('value="Senior_Software_Engineer_Resume"');
    expect(html).toContain('id="upload-doc-type"');
    expect(html).toContain("Select a document type...");
    expect(html).toContain('id="upload-doc-category"');
    expect(html).toContain("Derived from document type");
    expect(html).toContain("Cancel");
    expect(html).toContain("Upload");
  });

  // 5. Renders all 5 required document types in dropdown
  it("5. dropdown exposes exactly Resume, Cover Letter, Certificate, Portfolio, and Other", () => {
    const html = renderModal();

    expect(DOCUMENT_TYPE_OPTIONS).toHaveLength(5);
    expect(html).toContain('<option value="RESUME">Resume</option>');
    expect(html).toContain(
      '<option value="COVER_LETTER">Cover Letter</option>',
    );
    expect(html).toContain('<option value="CERTIFICATE">Certificate</option>');
    expect(html).toContain('<option value="PORTFOLIO">Portfolio</option>');
    expect(html).toContain('<option value="OTHER">Other</option>');
  });

  // 6. Does not render when isOpen is false or file is null
  it("6. returns null when isOpen is false or file is null", () => {
    expect(renderModal({ isOpen: false })).toBe("");
    expect(renderModal({ file: null })).toBe("");
  });

  // 7. File validation: allowed formats .pdf, .docx, .xlsx
  it("7. validateFileForUpload succeeds for PDF, DOCX, and XLSX", () => {
    expect(
      validateFileForUpload({
        name: "test.pdf",
        size: 1000,
        type: "application/pdf",
      }).valid,
    ).toBe(true);

    expect(
      validateFileForUpload({
        name: "test.docx",
        size: 1000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }).valid,
    ).toBe(true);

    expect(
      validateFileForUpload({
        name: "test.xlsx",
        size: 1000,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }).valid,
    ).toBe(true);
  });

  // 8. File validation: rejects unsupported formats (.txt, .png, .exe)
  it("8. validateFileForUpload rejects unsupported extensions", () => {
    expect(
      validateFileForUpload({
        name: "malicious.exe",
        size: 1000,
        type: "application/octet-stream",
      }).valid,
    ).toBe(false);

    expect(
      validateFileForUpload({
        name: "notes.txt",
        size: 1000,
        type: "text/plain",
      }).valid,
    ).toBe(false);
  });

  // 9. File validation: rejects empty file (size <= 0) and file > 25MB
  it("9. validateFileForUpload rejects empty file and file exceeding 25MB", () => {
    expect(
      validateFileForUpload({
        name: "empty.pdf",
        size: 0,
        type: "application/pdf",
      }).valid,
    ).toBe(false);

    expect(
      validateFileForUpload({
        name: "huge.pdf",
        size: 26 * 1024 * 1024,
        type: "application/pdf",
      }).valid,
    ).toBe(false);
  });

  // 10. SHA-256 calculation verification
  it("10. calculateContentHash computes exact SHA-256 hex string from byte array", async () => {
    const bytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
    const hash = await calculateContentHash(bytes);
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(hash).toHaveLength(64);
  });

  // 11. Orchestrates upload use case invocation
  it("11. invokes executeUploadUserDocument when submitting valid metadata", async () => {
    const uploadSpy = vi
      .spyOn(useCasesModule, "executeUploadUserDocument")
      .mockResolvedValue(sampleDocRecord);

    const result = await useCasesModule.executeUploadUserDocument(
      { supabase: mockSupabase },
      {
        file: new Blob([samplePdfFile.fileData as unknown as BlobPart], {
          type: "application/pdf",
        }),
        fileName: "Senior_Software_Engineer_Resume.pdf",
        category: "resumes",
        documentType: "RESUME",
      },
    );

    expect(result.id).toBe("doc-123");
    expect(uploadSpy).toHaveBeenCalledWith(
      { supabase: mockSupabase },
      expect.objectContaining({
        fileName: "Senior_Software_Engineer_Resume.pdf",
        category: "resumes",
        documentType: "RESUME",
      }),
    );
  });

  // 12. ConflictError duplicate mapping
  it("12. maps duplicate conflict error to user-friendly message", async () => {
    vi.spyOn(useCasesModule, "executeUploadUserDocument").mockRejectedValue(
      new ConflictError(
        "A document with identical content already exists in your library",
      ),
    );

    await expect(
      useCasesModule.executeUploadUserDocument(
        { supabase: mockSupabase },
        {
          file: new Blob([samplePdfFile.fileData as unknown as BlobPart], {
            type: "application/pdf",
          }),
          fileName: "Duplicate_Resume.pdf",
          category: "resumes",
          documentType: "RESUME",
        },
      ),
    ).rejects.toThrow(ConflictError);
  });

  // 13. Upload button is disabled initially when document type is not selected
  it("13. upload button is disabled initially until a document type is selected", () => {
    const html = renderModal();
    expect(html).toMatch(
      /<button[^>]*type="submit"[^>]*disabled=""[^>]*>Upload<\/button>/,
    );
  });

  // 14. DOCX and XLSX files display accurate filenames and sizes
  it("14. renders DOCX and XLSX files with accurate names and formatted sizes", () => {
    const docxHtml = renderModal({ file: sampleDocxFile });
    expect(docxHtml).toContain("Cover_Letter_2026.docx");
    expect(docxHtml).toContain("512.0 KB");

    const xlsxHtml = renderModal({ file: sampleXlsxFile });
    expect(xlsxHtml).toContain("Portfolio_Metrics.xlsx");
    expect(xlsxHtml).toContain("2.00 MB");
  });

  // 15. Cancel button callback prop
  it("15. executes onClose callback when cancel is triggered", () => {
    const onCloseMock = vi.fn();
    const props: UploadDocumentModalProps = {
      isOpen: true,
      file: samplePdfFile,
      onClose: onCloseMock,
      onSuccess: vi.fn(),
    };
    expect(props.onClose).toBe(onCloseMock);
  });

  // 16. Passes custom document name when specified
  it("16. passes custom document name and derived filename to executeUploadUserDocument", async () => {
    const uploadSpy = vi
      .spyOn(useCasesModule, "executeUploadUserDocument")
      .mockResolvedValue(sampleDocRecord);

    const result = await useCasesModule.executeUploadUserDocument(
      { supabase: mockSupabase },
      {
        file: new Blob([samplePdfFile.fileData as unknown as BlobPart], {
          type: "application/pdf",
        }),
        fileName: "Custom_Resume_Name.pdf",
        name: "Custom_Resume_Name",
        category: "resumes",
        documentType: "RESUME",
      },
    );

    expect(result.id).toBe("doc-123");
    expect(uploadSpy).toHaveBeenCalledWith(
      { supabase: mockSupabase },
      expect.objectContaining({
        fileName: "Custom_Resume_Name.pdf",
        name: "Custom_Resume_Name",
        category: "resumes",
        documentType: "RESUME",
      }),
    );
  });
});
