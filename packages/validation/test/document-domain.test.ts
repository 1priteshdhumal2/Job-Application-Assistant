import { describe, it, expect } from "vitest";
import { documentSchema } from "../src/document-domain";

describe("Document Domain Validation Schema", () => {
  it("validates correct document metadata within 25MB limit", () => {
    const valid = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume_2026.pdf",
      storage_path:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume_2026_abc123.pdf",
      mime_type: "application/pdf",
      file_size: 1048576, // 1MB
      version: 1,
      is_active: true,
    });
    expect(valid.success).toBe(true);
  });

  it("rejects documents exceeding 25MB", () => {
    const invalid = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "HugeResume.pdf",
      storage_path: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/huge.pdf",
      mime_type: "application/pdf",
      file_size: 26214401, // 25MB + 1 byte
      version: 1,
      is_active: true,
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects unsupported MIME types and invalid categories", () => {
    const invalidMime = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.exe",
      storage_path: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume.exe",
      mime_type: "application/x-msdownload",
      file_size: 1024,
      version: 1,
    });
    expect(invalidMime.success).toBe(false);

    const invalidCategory = documentSchema.safeParse({
      document_type: "RESUME",
      category: "illegal-category",
      name: "Resume.pdf",
      storage_path: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      version: 1,
    });
    expect(invalidCategory.success).toBe(false);
  });

  it("rejects invalid storage path structures", () => {
    const invalidPath = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.pdf",
      storage_path: "../traversal/resume.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      version: 1,
    });
    expect(invalidPath.success).toBe(false);
  });

  it("validates valid SHA-256 content_hash and allows optional/null values", () => {
    const validWithHash = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.pdf",
      storage_path:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume_2026_abc123.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      content_hash:
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      version: 1,
    });
    expect(validWithHash.success).toBe(true);

    const validWithNull = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.pdf",
      storage_path:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume_2026_abc123.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      content_hash: null,
      version: 1,
    });
    expect(validWithNull.success).toBe(true);
  });

  it("rejects malformed content_hash values", () => {
    const invalidShort = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.pdf",
      storage_path:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume_2026_abc123.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      content_hash: "abc123", // too short
      version: 1,
    });
    expect(invalidShort.success).toBe(false);

    const invalidNonHex = documentSchema.safeParse({
      document_type: "RESUME",
      category: "resumes",
      name: "Resume.pdf",
      storage_path:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/resumes/resume_2026_abc123.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      content_hash: "z".repeat(64), // invalid non-hex chars
      version: 1,
    });
    expect(invalidNonHex.success).toBe(false);
  });
});
