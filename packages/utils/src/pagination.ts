import type { PaginationMeta } from "@strata/shared-types";

/**
 * Calculate pagination metadata from page, pageSize, and total count.
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
  };
}

/**
 * Build a pagination query with skip and take values for database queries.
 */
export function buildPaginationQuery(
  page: number,
  pageSize: number
): { skip: number; take: number } {
  const skip = (page - 1) * pageSize;
  return { skip, take: pageSize };
}
