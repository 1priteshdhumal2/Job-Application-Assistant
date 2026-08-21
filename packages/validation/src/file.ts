import { z } from "zod";
import {
  USER_DOCUMENT_CATEGORIES,
  UserDocumentCategory,
  FileValidationResult,
} from "@jobpilot/types";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx"] as const;

export const fileValidationSchema = z.object({
  name: z.string().min(1, "File name cannot be empty"),
  size: z
    .number()
    .positive("File must not be empty")
    .max(MAX_FILE_SIZE_BYTES, "File size must not exceed 25 MB"),
  type: z
    .string()
    .refine(
      (mime) => (ALLOWED_MIME_TYPES as readonly string[]).includes(mime),
      {
        message:
          "Unsupported file type. Only PDF (.pdf), Word (.docx), and Excel (.xlsx) files are allowed.",
      },
    ),
});

/**
 * Sanitizes a raw client filename:
 * - Strips directory traversal sequences (../, ..\, /)
 * - Removes path separators and illegal control characters
 * - Ensures valid extension
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") {
    return "document.pdf";
  }

  // Extract base name, removing any path prefix
  const baseName = rawName.replace(/^.*[\\/]/, "");

  // Remove dangerous characters (keep alphanumeric, dots, hyphens, underscores)
  let cleanName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Collapse consecutive underscores
  cleanName = cleanName.replace(/_+/g, "_");

  // Strip consecutive dots to prevent traversal
  cleanName = cleanName.replace(/\.{2,}/g, ".");

  // Ensure it doesn't start with a dot
  cleanName = cleanName.replace(/^\.+/, "");

  if (!cleanName) {
    cleanName = "document";
  }

  return cleanName;
}

/**
 * Generates a collision-resistant, sanitized storage path:
 * Format: {userId}/{category}/{prefix}-{uniqueId}.{ext}
 */
export function generateStoragePath(
  userId: string,
  category: UserDocumentCategory,
  originalFileName: string,
  uniqueId?: string,
): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("Valid userId is required to generate storage path");
  }

  if (!USER_DOCUMENT_CATEGORIES.includes(category)) {
    throw new Error(`Invalid document category: ${category}`);
  }

  const sanitized = sanitizeFileName(originalFileName);
  const extIndex = sanitized.lastIndexOf(".");
  const ext = extIndex !== -1 ? sanitized.substring(extIndex) : ".pdf";
  const nameWithoutExt =
    extIndex !== -1 ? sanitized.substring(0, extIndex) : sanitized;

  const id = uniqueId || Math.random().toString(36).substring(2, 10);
  const finalFileName = `${nameWithoutExt}-${id}${ext}`;

  return `${userId}/${category}/${finalFileName}`;
}

/**
 * Validates whether a storage path strictly belongs to an expected user and allowed category.
 */
export function validateStoragePath(
  storagePath: string,
  expectedUserId?: string,
): boolean {
  if (!storagePath || typeof storagePath !== "string") {
    return false;
  }

  // Prevent path traversal
  if (storagePath.includes("..") || storagePath.includes("\\")) {
    return false;
  }

  const segments = storagePath.split("/");
  if (segments.length !== 3) {
    return false;
  }

  const [pathUserId, pathCategory, pathFileName] = segments;

  if (!pathUserId || !pathCategory || !pathFileName) {
    return false;
  }

  if (expectedUserId && pathUserId !== expectedUserId) {
    return false;
  }

  if (
    !USER_DOCUMENT_CATEGORIES.includes(pathCategory as UserDocumentCategory)
  ) {
    return false;
  }

  return true;
}

/**
 * High-level validator for a file object before upload.
 */
export function validateFileForUpload(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationResult {
  const parseResult = fileValidationSchema.safeParse(file);

  if (!parseResult.success) {
    return {
      valid: false,
      error: parseResult.error.errors[0]?.message || "Invalid file",
    };
  }

  // Verify extension matches allowed extensions
  const sanitized = sanitizeFileName(file.name);
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
    sanitized.toLowerCase().endsWith(ext),
  );

  if (!hasValidExt) {
    return {
      valid: false,
      error:
        "Invalid file extension. Allowed extensions are: .pdf, .docx, .xlsx",
    };
  }

  return {
    valid: true,
    sanitizedName: sanitized,
  };
}
