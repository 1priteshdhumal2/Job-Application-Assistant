import { useState, useEffect, useRef, useCallback } from "react";
import { executeListDocuments } from "@jobpilot/use-cases";
import type {
  DocumentRecord,
  DocumentType,
  UserDocumentCategory,
  SortParams,
} from "@jobpilot/types";
import type {
  DocumentSortField,
  DocumentListFilters,
} from "@jobpilot/database";
import { useAuth } from "../auth/useAuth";

export interface DocumentsListFilterState {
  name?: string;
  document_type?: DocumentType;
  category?: UserDocumentCategory;
}

export interface UseDocumentsListOptions {
  initialFilters?: DocumentsListFilterState;
  initialSort?: SortParams<DocumentSortField>;
  initialPage?: number;
  initialPageSize?: number;
  debounceMs?: number;
}

export interface UseDocumentsListResult {
  documents: DocumentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: DocumentsListFilterState;
  sort: SortParams<DocumentSortField>;
  loading: boolean;
  error: string | null;
  setFilters: (
    updater:
      | DocumentsListFilterState
      | ((prev: DocumentsListFilterState) => DocumentsListFilterState),
  ) => void;
  setPage: (updater: number | ((prev: number) => number)) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_SORT: SortParams<DocumentSortField> = {
  sortBy: "created_at",
  sortOrder: "desc",
};
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 300;

export function useDocumentsList(
  options: UseDocumentsListOptions = {},
): UseDocumentsListResult {
  const {
    initialFilters = {},
    initialSort = DEFAULT_SORT,
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  const { supabase, status: authStatus } = useAuth();

  // User-facing interactive state
  const [filters, setFiltersState] =
    useState<DocumentsListFilterState>(initialFilters);
  const [sort] = useState<SortParams<DocumentSortField>>(initialSort);
  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize] = useState<number>(initialPageSize);

  // Debounced text filter state for document name
  const [debouncedName, setDebouncedName] = useState<string | undefined>(
    initialFilters.name,
  );

  // Query results and execution state
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh and race-condition tracking
  const [refreshIndex, setRefreshIndex] = useState<number>(0);
  const requestIdRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  // Debounce text filter (name)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedName(filters.name);
      setPageState(1);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters.name, debounceMs]);

  // Handle dropdown filter changes immediately
  const setFilters = useCallback(
    (
      updater:
        | DocumentsListFilterState
        | ((prev: DocumentsListFilterState) => DocumentsListFilterState),
    ) => {
      setFiltersState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (
          next.document_type !== prev.document_type ||
          next.category !== prev.category
        ) {
          setPageState(1);
        }
        return next;
      });
    },
    [],
  );

  // Page updater
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setPageState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return Math.max(1, next);
      });
    },
    [],
  );

  // Refresh trigger
  const refresh = useCallback(async () => {
    setRefreshIndex((idx) => idx + 1);
  }, []);

  // Main data fetching effect
  useEffect(() => {
    // If not authenticated or no client, wait
    if (authStatus !== "AUTHENTICATED" || !supabase) {
      if (authStatus === "UNAUTHENTICATED") {
        setLoading(false);
        setError("User must be authenticated to view documents.");
      }
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const activeFilters: DocumentListFilters = {
      // Main list shows active documents only
      is_active: true,
    };

    if (debouncedName && debouncedName.trim().length > 0) {
      activeFilters.name = debouncedName.trim();
    }
    if (filters.document_type) {
      activeFilters.document_type = filters.document_type;
    }
    if (filters.category) {
      activeFilters.category = filters.category;
    }

    executeListDocuments({ supabase }, activeFilters, { page, pageSize }, sort)
      .then((result) => {
        if (currentRequestId === requestIdRef.current) {
          setDocuments(result.data);
          setTotal(result.total);
          setTotalPages(Math.max(1, result.totalPages));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (currentRequestId === requestIdRef.current) {
          const message =
            err instanceof Error ? err.message : "Failed to load documents.";
          setError(message);
          setLoading(false);
        }
      });
  }, [
    supabase,
    authStatus,
    debouncedName,
    filters.document_type,
    filters.category,
    page,
    pageSize,
    sort,
    refreshIndex,
  ]);

  return {
    documents,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    sort,
    loading,
    error,
    setFilters,
    setPage,
    refresh,
  };
}
