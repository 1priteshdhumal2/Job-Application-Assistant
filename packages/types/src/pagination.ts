// ==============================================================================
// Pagination and Sorting Contracts
// ==============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortOrder = "asc" | "desc";

export interface SortParams<TField extends string = string> {
  sortBy?: TField;
  sortOrder?: SortOrder;
}
