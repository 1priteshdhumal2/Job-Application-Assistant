// ==============================================================================
// Documents Domain Service (Versioning, Metadata & Storage Compensation)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  DocumentRecord,
  DocumentType,
  UserDocumentCategory,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import {
  validateFileForUpload,
  generateStoragePath,
  validateStoragePath,
  calculateContentHash,
} from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import {
  resolvePagination,
  createPaginatedResult,
} from "../common/pagination.js";
import {
  handleDatabaseError,
  NotFoundError,
  StorageError,
  ValidationError,
  ConflictError,
} from "../common/errors.js";
import { resolveSort } from "../common/sorting.js";
import { USER_DOCUMENTS_BUCKET } from "../storage.js";

export const DOCUMENT_SORT_FIELDS = [
  "created_at",
  "name",
  "version",
  "file_size",
] as const;
export type DocumentSortField = (typeof DOCUMENT_SORT_FIELDS)[number];

export interface DocumentListFilters {
  name?: string;
  document_type?: DocumentType;
  category?: UserDocumentCategory;
  is_active?: boolean;
  document_group_id?: string;
}

export interface UploadDocumentInput {
  file: File | Blob;
  fileName: string;
  category: UserDocumentCategory;
  documentType: DocumentType;
  contentHash?: string;
  name?: string;
}

export interface ReplaceDocumentVersionInput {
  file: File | Blob;
  fileName: string;
  contentHash?: string;
}

/**
 * Lists document metadata records with pagination, filtering, and sorting.
 */
export async function listDocuments(
  supabase: SupabaseClient,
  filters?: DocumentListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<DocumentSortField>,
): Promise<PaginatedResult<DocumentRecord>> {
  const user = await requireAuthUser(supabase);
  const pagination = resolvePagination(paginationParams);
  const sort = resolveSort(
    sortParams,
    DOCUMENT_SORT_FIELDS,
    "created_at",
    "desc",
  );

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  } else {
    // Default to active documents only
    query = query.eq("is_active", true);
  }

  if (filters?.name) {
    // Sanitize wildcard search characters
    const sanitized = filters.name.replace(/[%_]/g, "\\$&");
    query = query.ilike("name", `%${sanitized}%`);
  }
  if (filters?.document_type) {
    query = query.eq("document_type", filters.document_type);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.document_group_id) {
    query = query.eq("document_group_id", filters.document_group_id);
  }

  query = query
    .order(sort.column, { ascending: sort.ascending })
    .range(pagination.from, pagination.to);

  const { data, count, error } = await query;

  if (error) {
    throw handleDatabaseError(error, "listDocuments");
  }

  return createPaginatedResult(
    (data || []) as DocumentRecord[],
    count ?? 0,
    pagination.page,
    pagination.pageSize,
  );
}

/**
 * Fetches a single document metadata record by ID.
 */
export async function getDocument(
  supabase: SupabaseClient,
  id: string,
): Promise<DocumentRecord> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getDocument");
  }

  return data as DocumentRecord;
}

/**
 * Lists all historical versions of a logical document group.
 */
export async function listDocumentVersions(
  supabase: SupabaseClient,
  documentGroupId: string,
): Promise<DocumentRecord[]> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("document_group_id", documentGroupId)
    .eq("user_id", user.id)
    .order("version", { ascending: false });

  if (error) {
    throw handleDatabaseError(error, "listDocumentVersions");
  }

  return (data || []) as DocumentRecord[];
}

/**
 * Searches for an existing document with the given content hash owned by the authenticated user.
 */
export async function findDocumentByContentHash(
  supabase: SupabaseClient,
  contentHash: string,
): Promise<DocumentRecord | null> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (error) {
    throw handleDatabaseError(error, "findDocumentByContentHash");
  }

  return (data as DocumentRecord) || null;
}

/**
 * Uploads a new document creating a fresh document group (Version 1, active).
 * Executes storage compensation if metadata insertion fails.
 */
export async function uploadDocument(
  supabase: SupabaseClient,
  input: UploadDocumentInput,
): Promise<DocumentRecord> {
  const user = await requireAuthUser(supabase);

  // 1. Validate file
  const fileValidation = validateFileForUpload({
    name: input.fileName,
    size: input.file.size,
    type: input.file.type,
  });

  if (!fileValidation.valid) {
    throw new ValidationError(fileValidation.error || "Invalid file");
  }

  // 2. Compute SHA-256 content hash and check for duplicate content in user's library
  const contentHash =
    input.contentHash || (await calculateContentHash(input.file));

  const existingDuplicate = await findDocumentByContentHash(
    supabase,
    contentHash,
  );
  if (existingDuplicate) {
    throw new ConflictError(
      "A document with identical content already exists in your library",
    );
  }

  const documentGroupId = crypto.randomUUID();
  const storagePath = generateStoragePath(
    user.id,
    input.category,
    input.fileName,
  );

  // 3. Upload binary to private Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new StorageError(
      `Storage upload failed: ${uploadError.message}`,
      uploadError,
    );
  }

  // 4. Insert metadata record in PostgreSQL
  try {
    const { data, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        document_group_id: documentGroupId,
        document_type: input.documentType,
        category: input.category,
        name: input.name || input.fileName,
        storage_path: storagePath,
        mime_type: input.file.type,
        file_size: input.file.size,
        content_hash: contentHash,
        version: 1,
        is_active: true,
      })
      .select()
      .single();

    if (dbError || !data) {
      throw handleDatabaseError(dbError, "uploadDocument:insertMetadata");
    }

    return data as DocumentRecord;
  } catch (err) {
    // 5. Compensation: delete orphan uploaded binary if DB insert failed
    await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .remove([storagePath])
      .catch((cleanupErr) => {
        console.error(
          "Failed to cleanup orphan storage file after DB error:",
          cleanupErr,
        );
      });

    throw err;
  }
}

/**
 * Replaces a document version atomically within an existing document group.
 * Uploads binary and calls atomic PostgreSQL stored function create_document_version.
 */
export async function replaceDocumentVersion(
  supabase: SupabaseClient,
  documentGroupId: string,
  input: ReplaceDocumentVersionInput,
): Promise<DocumentRecord> {
  const user = await requireAuthUser(supabase);

  // 1. Fetch current active document metadata to determine category and type
  const { data: currentDoc, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("document_group_id", documentGroupId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError) {
    throw handleDatabaseError(fetchError, "replaceDocumentVersion:fetchActive");
  }

  // If no active version, fetch latest version to preserve metadata
  let targetCategory: UserDocumentCategory;
  let targetType: DocumentType;

  if (currentDoc) {
    targetCategory = currentDoc.category as UserDocumentCategory;
    targetType = currentDoc.document_type as DocumentType;
  } else {
    const { data: latestDoc, error: latestError } = await supabase
      .from("documents")
      .select("*")
      .eq("document_group_id", documentGroupId)
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError || !latestDoc) {
      throw new NotFoundError(
        "Document group not found or belongs to another user",
      );
    }
    targetCategory = latestDoc.category as UserDocumentCategory;
    targetType = latestDoc.document_type as DocumentType;
  }

  // 2. Validate file
  const fileValidation = validateFileForUpload({
    name: input.fileName,
    size: input.file.size,
    type: input.file.type,
  });

  if (!fileValidation.valid) {
    throw new ValidationError(fileValidation.error || "Invalid file");
  }

  // 3. Compute SHA-256 content hash and check for duplicate content in user's library
  const contentHash =
    input.contentHash || (await calculateContentHash(input.file));

  const existingDuplicate = await findDocumentByContentHash(
    supabase,
    contentHash,
  );
  if (existingDuplicate) {
    throw new ConflictError(
      "A document with identical content already exists in your library",
    );
  }

  const storagePath = generateStoragePath(
    user.id,
    targetCategory,
    input.fileName,
  );

  // 4. Upload new binary to storage
  const { error: uploadError } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new StorageError(
      `Storage upload failed: ${uploadError.message}`,
      uploadError,
    );
  }

  // 5. Call atomic stored function to increment version and update active state
  try {
    const { data: newDoc, error: rpcError } = await supabase.rpc(
      "create_document_version",
      {
        p_document_group_id: documentGroupId,
        p_name: input.fileName,
        p_storage_path: storagePath,
        p_mime_type: input.file.type,
        p_file_size: input.file.size,
        p_document_type: targetType,
        p_category: targetCategory,
        p_content_hash: contentHash,
      },
    );

    if (rpcError || !newDoc) {
      throw handleDatabaseError(rpcError, "replaceDocumentVersion:rpc");
    }

    return newDoc as DocumentRecord;
  } catch (err) {
    // 6. Compensation: remove newly uploaded binary if version RPC fails
    await supabase.storage
      .from(USER_DOCUMENTS_BUCKET)
      .remove([storagePath])
      .catch((cleanupErr) => {
        console.error(
          "Failed to cleanup orphan storage file after version RPC error:",
          cleanupErr,
        );
      });

    throw err;
  }
}

/**
 * Deactivates a document group by setting its active version to is_active = false.
 * Does not delete any binary files or database rows.
 */
export async function deactivateDocument(
  supabase: SupabaseClient,
  documentGroupId: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("documents")
    .update({ is_active: false }, { count: "exact" })
    .eq("document_group_id", documentGroupId)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) {
    throw handleDatabaseError(error, "deactivateDocument");
  }

  if (count === 0) {
    throw new NotFoundError("Active document not found in group");
  }
}

/**
 * Downloads a document binary after verifying ownership.
 */
export async function downloadDocument(
  supabase: SupabaseClient,
  id: string,
): Promise<Blob> {
  const user = await requireAuthUser(supabase);

  // Fetch document metadata to verify ownership and path
  const doc = await getDocument(supabase, id);

  if (!validateStoragePath(doc.storage_path, user.id)) {
    throw new ValidationError(
      "Unauthorized document access: path does not belong to current user",
    );
  }

  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .download(doc.storage_path);

  if (error || !data) {
    throw new StorageError(
      `Storage download failed: ${error?.message || "File not found"}`,
      error,
    );
  }

  return data;
}
