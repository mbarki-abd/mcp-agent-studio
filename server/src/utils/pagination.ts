import { z } from 'zod';

// Default pagination values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Pagination query schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

// Cursor-based pagination schema (for large datasets)
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationSchema>;

// Pagination result interface
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Cursor-based pagination result
export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
  };
}

/**
 * Parse pagination parameters from query string
 */
export function parsePagination(query: unknown): PaginationQuery {
  return paginationSchema.parse(query || {});
}

/**
 * Parse cursor pagination parameters
 */
export function parseCursorPagination(query: unknown): CursorPaginationQuery {
  return cursorPaginationSchema.parse(query || {});
}

/**
 * Calculate skip value for Prisma
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Build paginated response
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Build cursor-based paginated response
 */
export function buildCursorPaginatedResponse<T extends { id: string }>(
  data: T[],
  limit: number,
  hasMore: boolean,
  prevCursor?: string
): CursorPaginatedResult<T> {
  const lastItem = data[data.length - 1];
  const firstItem = data[0];

  return {
    data,
    pagination: {
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      prevCursor: prevCursor || (firstItem ? firstItem.id : null),
      hasNext: hasMore,
      hasPrev: !!prevCursor,
      limit,
    },
  };
}

/**
 * Get Prisma orderBy object from sort parameters
 */
export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc',
  defaultSort: string = 'createdAt'
): Record<string, 'asc' | 'desc'> {
  const field = sortBy || defaultSort;
  return { [field]: sortOrder };
}

/**
 * Validate sort field against allowed fields
 */
export function validateSortField(
  sortBy: string | undefined,
  allowedFields: string[]
): string | undefined {
  if (!sortBy) return undefined;
  return allowedFields.includes(sortBy) ? sortBy : undefined;
}

/**
 * Build Prisma query with pagination
 */
export function buildPrismaQuery(pagination: PaginationQuery, allowedSortFields: string[] = []) {
  const { page, limit, sortBy, sortOrder } = pagination;
  const validSortBy = validateSortField(sortBy, allowedSortFields);

  return {
    skip: calculateSkip(page, limit),
    take: limit,
    orderBy: buildOrderBy(validSortBy, sortOrder),
  };
}

/**
 * Build cursor-based Prisma query
 */
export function buildCursorPrismaQuery(
  pagination: CursorPaginationQuery,
  allowedSortFields: string[] = []
) {
  const { cursor, limit, sortBy, sortOrder } = pagination;
  const validSortBy = validateSortField(sortBy, allowedSortFields);

  return {
    take: limit + 1, // Take one extra to check if there are more
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Skip the cursor itself
    }),
    orderBy: buildOrderBy(validSortBy, sortOrder),
  };
}

/**
 * Process cursor-based query results
 */
export function processCursorResults<T extends { id: string }>(
  data: T[],
  limit: number,
  cursor?: string
): { data: T[]; hasMore: boolean } {
  const hasMore = data.length > limit;
  const resultData = hasMore ? data.slice(0, limit) : data;

  return { data: resultData, hasMore };
}
