/**
 * Pagination metadata for list responses.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API success response wrapper.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/**
 * Paginated API response with an array of items.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Field-level validation error detail.
 */
export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Standard API error response.
 */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: FieldError[];
  timestamp: string;
  path: string;
  requestId: string;
}
