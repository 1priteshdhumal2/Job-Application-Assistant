import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { executeListJobs } from "@jobpilot/use-cases";
import type {
  Job,
  JobStatus,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import type { JobSortField, JobListFilters } from "@jobpilot/database";
import { useAuth } from "../auth/useAuth";

export interface JobsListFilterState {
  company_name?: string;
  job_title?: string;
  status?: JobStatus;
}

export interface UseJobsListOptions {
  initialFilters?: JobsListFilterState;
  initialSort?: SortParams<JobSortField>;
  initialPage?: number;
  initialPageSize?: number;
  debounceMs?: number;
}

export interface UseJobsListResult {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: JobsListFilterState;
  sort: SortParams<JobSortField>;
  loading: boolean;
  error: string | null;
  setFilters: (
    updater:
      | JobsListFilterState
      | ((prev: JobsListFilterState) => JobsListFilterState),
  ) => void;
  setSort: (
    updater:
      | SortParams<JobSortField>
      | ((prev: SortParams<JobSortField>) => SortParams<JobSortField>),
  ) => void;
  setPage: (updater: number | ((prev: number) => number)) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_SORT: SortParams<JobSortField> = {
  sortBy: "created_at",
  sortOrder: "desc",
};
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 300;

export function useJobsList(
  options: UseJobsListOptions = {},
): UseJobsListResult {
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
    useState<JobsListFilterState>(initialFilters);
  const [sort, setSortState] = useState<SortParams<JobSortField>>(initialSort);
  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize] = useState<number>(initialPageSize);

  // Debounced text filter state for company_name and job_title
  const [debouncedTextFilters, setDebouncedTextFilters] = useState<{
    company_name?: string;
    job_title?: string;
  }>({
    company_name: initialFilters.company_name,
    job_title: initialFilters.job_title,
  });

  // Query results and execution state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh and race-condition tracking
  const [refreshIndex, setRefreshIndex] = useState<number>(0);
  const requestIdRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  // Debounce text filters (company_name & job_title)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedTextFilters({
        company_name: filters.company_name,
        job_title: filters.job_title,
      });
      setPageState(1);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters.company_name, filters.job_title, debounceMs]);

  // Handle immediate filter changes (e.g. status)
  const setFilters = useCallback(
    (
      updater:
        | JobsListFilterState
        | ((prev: JobsListFilterState) => JobsListFilterState),
    ) => {
      setFiltersState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.status !== prev.status) {
          setPageState(1);
        }
        return next;
      });
    },
    [],
  );

  // Handle sort changes
  const setSort = useCallback(
    (
      updater:
        | SortParams<JobSortField>
        | ((prev: SortParams<JobSortField>) => SortParams<JobSortField>),
    ) => {
      setSortState(updater);
      setPageState(1);
    },
    [],
  );

  // Handle page changes
  const setPage = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setPageState(updater);
    },
    [],
  );

  // Active query parameters normalized for database consumption
  const activeFilters = useMemo<JobListFilters | undefined>(() => {
    const trimmedCompany = debouncedTextFilters.company_name?.trim();
    const trimmedTitle = debouncedTextFilters.job_title?.trim();
    const status = filters.status;

    const queryFilters: JobListFilters = {};
    if (trimmedCompany) queryFilters.company_name = trimmedCompany;
    if (trimmedTitle) queryFilters.job_title = trimmedTitle;
    if (status) queryFilters.status = status;

    return Object.keys(queryFilters).length > 0 ? queryFilters : undefined;
  }, [
    debouncedTextFilters.company_name,
    debouncedTextFilters.job_title,
    filters.status,
  ]);

  // Fetch execution with stale-response protection
  useEffect(() => {
    if (!supabase || authStatus !== "AUTHENTICATED") {
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const paginationParams: PaginationParams = {
      page,
      pageSize,
    };

    executeListJobs({ supabase }, activeFilters, paginationParams, sort)
      .then((result: PaginatedResult<Job>) => {
        if (currentRequestId === requestIdRef.current) {
          setJobs(result.data);
          setTotal(result.total);
          setTotalPages(result.totalPages);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (currentRequestId === requestIdRef.current) {
          const message =
            err instanceof Error ? err.message : "Failed to load jobs";
          setError(message);
          setLoading(false);
        }
      });
  }, [supabase, authStatus, activeFilters, sort, page, pageSize, refreshIndex]);

  // Explicit refresh action
  const refresh = useCallback(async () => {
    setRefreshIndex((idx) => idx + 1);
  }, []);

  return {
    jobs,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    sort,
    loading,
    error,
    setFilters,
    setSort,
    setPage,
    refresh,
  };
}
