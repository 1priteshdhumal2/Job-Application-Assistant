import { SupabaseClient } from "@supabase/supabase-js";
import {
  UserDocumentCategory,
  USER_DOCUMENT_CATEGORIES,
  UserDocumentMetadata,
} from "@jobpilot/types";
import {
  generateStoragePath,
  validateStoragePath,
  validateFileForUpload,
} from "@jobpilot/validation";
import { AuthError, ValidationError } from "@jobpilot/shared";

export const USER_DOCUMENTS_BUCKET = "user-documents";

/**
 * Uploads a document into the authenticated user's private storage folder.
 * Path format: user-documents/{userId}/{category}/{safeUniqueFileName}
 */
export async function uploadCurrentUserDocument(
  supabase: SupabaseClient,
  category: UserDocumentCategory,
  file: File | Blob,
  originalFileName: string,
): Promise<UserDocumentMetadata> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  // 1. Validate file metadata
  const validation = validateFileForUpload({
    name: originalFileName,
    size: file.size,
    type: file.type,
  });

  if (!validation.valid) {
    throw new ValidationError(validation.error || "Invalid document file");
  }

  // 2. Generate secure, user-scoped storage path
  const storagePath = generateStoragePath(user.id, category, originalFileName);

  // 3. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const fileName = storagePath.split("/").pop() || originalFileName;

  return {
    name: fileName,
    storagePath,
    category,
    size: file.size,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Lists documents belonging to the authenticated user.
 * Queries user-documents/{userId}/{category}
 */
export async function listCurrentUserDocuments(
  supabase: SupabaseClient,
  category?: UserDocumentCategory,
): Promise<UserDocumentMetadata[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  const categoriesToList = category
    ? [category]
    : (USER_DOCUMENT_CATEGORIES as readonly UserDocumentCategory[]);

  const results: UserDocumentMetadata[] = [];

  for (const cat of categoriesToList) {
    const folderPath = `${user.id}/${cat}`;
    const { data, error } = await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .list(folderPath, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      // If folder is empty or not created yet, continue
      continue;
    }

    if (data) {
      for (const item of data) {
        if (item.name === ".emptyFolderPlaceholder") continue;
        results.push({
          name: item.name,
          storagePath: `${folderPath}/${item.name}`,
          category: cat,
          size: item.metadata?.size ?? 0,
          mimeType: item.metadata?.mimetype,
          createdAt: item.created_at ?? undefined,
          updatedAt: item.updated_at ?? undefined,
        });
      }
    }
  }

  return results;
}

/**
 * Downloads a document belonging to the authenticated user.
 * Verifies that the requested path strictly belongs to the authenticated user before requesting.
 */
export async function downloadCurrentUserDocument(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Blob> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  // Pre-validate ownership structure in path
  if (!validateStoragePath(storagePath, user.id)) {
    throw new ValidationError(
      "Unauthorized document access. Path does not belong to current user.",
    );
  }

  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Storage download failed: ${error?.message || "File not found"}`,
    );
  }

  return data;
}

/**
 * Deletes a document belonging to the authenticated user.
 */
export async function deleteCurrentUserDocument(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  // Pre-validate ownership structure in path
  if (!validateStoragePath(storagePath, user.id)) {
    throw new ValidationError(
      "Unauthorized document deletion. Path does not belong to current user.",
    );
  }

  const { error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
