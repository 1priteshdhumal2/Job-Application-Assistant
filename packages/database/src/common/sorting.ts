// ==============================================================================
// Sorting Allowlist Utilities
// ==============================================================================

import { SortParams, SortOrder } from "@jobpilot/types";
import { ValidationError } from "@jobpilot/shared";

export interface ResolvedSort<TField extends string> {
  column: TField;
  ascending: boolean;
}

/**
 * Validates requested sort field against a strict static allowlist and returns sanitized sort options.
 */
export function resolveSort<TField extends string>(
  params: SortParams<TField> | undefined,
  allowlist: readonly TField[],
  defaultField: TField,
  defaultOrder: SortOrder = "desc",
): ResolvedSort<TField> {
  const field = params?.sortBy ?? defaultField;
  const order = params?.sortOrder ?? defaultOrder;

  if (!allowlist.includes(field)) {
    throw new ValidationError(
      `Invalid sort field '${field}'. Allowed fields: ${allowlist.join(", ")}`,
    );
  }

  if (order !== "asc" && order !== "desc") {
    throw new ValidationError(
      `Invalid sort order '${order}'. Allowed values: 'asc', 'desc'`,
    );
  }

  return {
    column: field,
    ascending: order === "asc",
  };
}
