import { describe, it, expect } from "vitest";
import {
  validateFileForUpload,
  sanitizeFileName,
  generateStoragePath,
  validateStoragePath,
  MAX_FILE_SIZE_BYTES,
} from "../src/file.js";

describe("File Validation and Path Sanitization", () => {
  describe("validateFileForUpload", () => {
    it("accepts valid PDF document within 25MB limit", () => {
      const result = validateFileForUpload({
        name: "my_resume.pdf",
        size: 2 * 1024 * 1024,
        type: "application/pdf",
      });
      expect(result.valid).toBe(true);
      expect(result.sanitizedName).toBe("my_resume.pdf");
    });

    it("accepts valid DOCX document", () => {
      const result = validateFileForUpload({
        name: "cover_letter.docx",
        size: 500 * 1024,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts valid XLSX document", () => {
      const result = validateFileForUpload({
        name: "job_tracker.xlsx",
        size: 1 * 1024 * 1024,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts a file of exactly 25 MB", () => {
      const result = validateFileForUpload({
        name: "large_portfolio.pdf",
        size: MAX_FILE_SIZE_BYTES,
        type: "application/pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects a file exceeding 25 MB", () => {
      const result = validateFileForUpload({
        name: "huge_file.pdf",
        size: MAX_FILE_SIZE_BYTES + 1,
        type: "application/pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceed 25 MB/);
    });

    it("rejects unsupported MIME types (e.g. image, executable, text)", () => {
      const pngResult = validateFileForUpload({
        name: "avatar.png",
        size: 1024,
        type: "image/png",
      });
      expect(pngResult.valid).toBe(false);

      const exeResult = validateFileForUpload({
        name: "script.exe",
        size: 1024,
        type: "application/x-msdownload",
      });
      expect(exeResult.valid).toBe(false);
    });

    it("rejects mismatched file extensions even if MIME type is faked", () => {
      const result = validateFileForUpload({
        name: "malicious.sh",
        size: 1024,
        type: "application/pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Invalid file extension/);
    });
  });

  describe("sanitizeFileName", () => {
    it("strips Unix directory traversal sequences", () => {
      const clean = sanitizeFileName("../../../etc/passwd.pdf");
      expect(clean).toBe("passwd.pdf");
      expect(clean).not.toContain("/");
      expect(clean).not.toContain("..");
    });

    it("strips Windows directory traversal sequences", () => {
      const clean = sanitizeFileName("..\\..\\Windows\\System32\\file.docx");
      expect(clean).toBe("file.docx");
      expect(clean).not.toContain("\\");
      expect(clean).not.toContain("..");
    });

    it("replaces dangerous characters with underscores and collapses them", () => {
      const clean = sanitizeFileName("resume$#* &name(1).pdf");
      expect(clean).toBe("resume_name_1_.pdf");
    });
  });

  describe("generateStoragePath", () => {
    it("generates user-scoped path with category and unique id", () => {
      const userId = "11111111-2222-3333-4444-555555555555";
      const path = generateStoragePath(
        userId,
        "resumes",
        "my_cv.pdf",
        "xyz123",
      );
      expect(path).toBe(`${userId}/resumes/my_cv-xyz123.pdf`);
    });

    it("throws when userId is invalid or missing", () => {
      expect(() => generateStoragePath("", "resumes", "cv.pdf")).toThrow();
    });

    it("throws when category is invalid", () => {
      expect(() =>
        // @ts-expect-error test invalid category
        generateStoragePath("user123", "invalid-cat", "cv.pdf"),
      ).toThrow(/Invalid document category/);
    });
  });

  describe("validateStoragePath", () => {
    const validUserId = "8c123456-7890-abcd-ef01-23456789abcd";

    it("validates legitimate user-scoped storage path", () => {
      const path = `${validUserId}/resumes/resume-123.pdf`;
      expect(validateStoragePath(path, validUserId)).toBe(true);
    });

    it("rejects path if user ID does not match expected user", () => {
      const otherUserId = "99999999-9999-9999-9999-999999999999";
      const path = `${otherUserId}/resumes/resume-123.pdf`;
      expect(validateStoragePath(path, validUserId)).toBe(false);
    });

    it("rejects path containing directory traversal attempts", () => {
      const path = `${validUserId}/../other-user/resumes/resume.pdf`;
      expect(validateStoragePath(path, validUserId)).toBe(false);
    });

    it("rejects path with unrecognized category", () => {
      const path = `${validUserId}/unknown-category/resume.pdf`;
      expect(validateStoragePath(path, validUserId)).toBe(false);
    });
  });
});
