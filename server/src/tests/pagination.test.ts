import { describe, it, expect } from 'vitest';
import {
  parsePagination,
  parseCursorPagination,
  calculateSkip,
  buildPaginatedResponse,
  buildCursorPaginatedResponse,
  buildOrderBy,
  validateSortField,
  buildPrismaQuery,
  buildCursorPrismaQuery,
  processCursorResults,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../utils/pagination.js';

describe('Pagination Utils', () => {
  describe('parsePagination', () => {
    it('should parse valid pagination query', () => {
      // Arrange
      const query = { page: '2', limit: '50', sortBy: 'name', sortOrder: 'asc' };

      // Act
      const result = parsePagination(query);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });

    it('should use default values for empty query', () => {
      // Act
      const result = parsePagination({});

      // Assert
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.sortOrder).toBe('desc');
      expect(result.sortBy).toBeUndefined();
    });

    it('should use default values for null query', () => {
      // Act
      const result = parsePagination(null);

      // Assert
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it('should enforce MAX_LIMIT', () => {
      // Arrange
      const query = { limit: '200' };

      // Act & Assert
      expect(() => parsePagination(query)).toThrow();
    });

    it('should enforce minimum page value', () => {
      // Arrange
      const query = { page: '0' };

      // Act & Assert
      expect(() => parsePagination(query)).toThrow();
    });

    it('should enforce minimum limit value', () => {
      // Arrange
      const query = { limit: '0' };

      // Act & Assert
      expect(() => parsePagination(query)).toThrow();
    });

    it('should coerce string numbers to integers', () => {
      // Arrange
      const query = { page: '3', limit: '25' };

      // Act
      const result = parsePagination(query);

      // Assert
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
    });
  });

  describe('parseCursorPagination', () => {
    it('should parse cursor pagination query', () => {
      // Arrange
      const query = { cursor: 'abc123', limit: '30', sortBy: 'createdAt' };

      // Act
      const result = parseCursorPagination(query);

      // Assert
      expect(result.cursor).toBe('abc123');
      expect(result.limit).toBe(30);
      expect(result.sortBy).toBe('createdAt');
    });

    it('should use defaults when cursor is not provided', () => {
      // Act
      const result = parseCursorPagination({});

      // Assert
      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });
  });

  describe('calculateSkip', () => {
    it('should calculate skip for page 1', () => {
      // Act
      const result = calculateSkip(1, 20);

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate skip for page 2', () => {
      // Act
      const result = calculateSkip(2, 20);

      // Assert
      expect(result).toBe(20);
    });

    it('should calculate skip for page 5 with limit 10', () => {
      // Act
      const result = calculateSkip(5, 10);

      // Assert
      expect(result).toBe(40);
    });

    it('should handle large page numbers', () => {
      // Act
      const result = calculateSkip(100, 50);

      // Assert
      expect(result).toBe(4950);
    });
  });

  describe('buildPaginatedResponse', () => {
    it('should build paginated response for first page', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }];
      const total = 50;
      const page = 1;
      const limit = 20;

      // Act
      const result = buildPaginatedResponse(data, total, page, limit);

      // Assert
      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should build paginated response for middle page', () => {
      // Arrange
      const data = [{ id: '3' }];
      const total = 50;
      const page = 2;
      const limit = 20;

      // Act
      const result = buildPaginatedResponse(data, total, page, limit);

      // Assert
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should build paginated response for last page', () => {
      // Arrange
      const data = [{ id: '10' }];
      const total = 50;
      const page = 3;
      const limit = 20;

      // Act
      const result = buildPaginatedResponse(data, total, page, limit);

      // Assert
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle empty results', () => {
      // Arrange
      const data: any[] = [];
      const total = 0;
      const page = 1;
      const limit = 20;

      // Act
      const result = buildPaginatedResponse(data, total, page, limit);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should calculate totalPages correctly', () => {
      // Arrange
      const data: any[] = [];
      const total = 25;
      const limit = 10;

      // Act
      const result = buildPaginatedResponse(data, total, 1, limit);

      // Assert
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('buildCursorPaginatedResponse', () => {
    it('should build cursor response with hasMore true', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const limit = 3;
      const hasMore = true;

      // Act
      const result = buildCursorPaginatedResponse(data, limit, hasMore);

      // Assert
      expect(result.data).toEqual(data);
      expect(result.pagination.nextCursor).toBe('3');
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.limit).toBe(3);
    });

    it('should build cursor response with hasMore false', () => {
      // Arrange
      const data = [{ id: '1' }];
      const limit = 3;
      const hasMore = false;

      // Act
      const result = buildCursorPaginatedResponse(data, limit, hasMore);

      // Assert
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should include prevCursor when provided', () => {
      // Arrange
      const data = [{ id: '2' }, { id: '3' }];
      const prevCursor = 'prev-cursor';

      // Act
      const result = buildCursorPaginatedResponse(data, 2, false, prevCursor);

      // Assert
      expect(result.pagination.prevCursor).toBe(prevCursor);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle empty data', () => {
      // Arrange
      const data: any[] = [];

      // Act
      const result = buildCursorPaginatedResponse(data, 10, false);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.prevCursor).toBeNull();
    });
  });

  describe('buildOrderBy', () => {
    it('should build orderBy with provided field', () => {
      // Act
      const result = buildOrderBy('name', 'asc');

      // Assert
      expect(result).toEqual({ name: 'asc' });
    });

    it('should use default sort field when sortBy is undefined', () => {
      // Act
      const result = buildOrderBy(undefined, 'desc', 'createdAt');

      // Assert
      expect(result).toEqual({ createdAt: 'desc' });
    });

    it('should use createdAt as default when no default provided', () => {
      // Act
      const result = buildOrderBy(undefined, 'asc');

      // Assert
      expect(result).toEqual({ createdAt: 'asc' });
    });
  });

  describe('validateSortField', () => {
    it('should return sortBy if in allowed fields', () => {
      // Arrange
      const allowedFields = ['name', 'email', 'createdAt'];

      // Act
      const result = validateSortField('name', allowedFields);

      // Assert
      expect(result).toBe('name');
    });

    it('should return undefined if not in allowed fields', () => {
      // Arrange
      const allowedFields = ['name', 'email'];

      // Act
      const result = validateSortField('invalidField', allowedFields);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined if sortBy is undefined', () => {
      // Arrange
      const allowedFields = ['name'];

      // Act
      const result = validateSortField(undefined, allowedFields);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('buildPrismaQuery', () => {
    it('should build complete Prisma query', () => {
      // Arrange
      const pagination = { page: 2, limit: 10, sortBy: 'name', sortOrder: 'asc' as const };
      const allowedFields = ['name', 'email'];

      // Act
      const result = buildPrismaQuery(pagination, allowedFields);

      // Assert
      expect(result.skip).toBe(10);
      expect(result.take).toBe(10);
      expect(result.orderBy).toEqual({ name: 'asc' });
    });

    it('should exclude invalid sortBy field', () => {
      // Arrange
      const pagination = { page: 1, limit: 20, sortBy: 'invalid', sortOrder: 'desc' as const };
      const allowedFields = ['name'];

      // Act
      const result = buildPrismaQuery(pagination, allowedFields);

      // Assert
      expect(result.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('buildCursorPrismaQuery', () => {
    it('should build cursor query with cursor', () => {
      // Arrange
      const pagination = { cursor: 'abc123', limit: 20, sortOrder: 'desc' as const };

      // Act
      const result = buildCursorPrismaQuery(pagination);

      // Assert
      expect(result.take).toBe(21); // limit + 1
      expect(result.cursor).toEqual({ id: 'abc123' });
      expect(result.skip).toBe(1);
    });

    it('should build cursor query without cursor', () => {
      // Arrange
      const pagination = { limit: 10, sortOrder: 'asc' as const };

      // Act
      const result = buildCursorPrismaQuery(pagination);

      // Assert
      expect(result.take).toBe(11);
      expect(result.cursor).toBeUndefined();
      expect(result.skip).toBeUndefined();
    });
  });

  describe('processCursorResults', () => {
    it('should detect hasMore when results exceed limit', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const limit = 2;

      // Act
      const result = processCursorResults(data, limit);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should return all data when no more results', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }];
      const limit = 5;

      // Act
      const result = processCursorResults(data, limit);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should handle exact limit match', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }];
      const limit = 2;

      // Act
      const result = processCursorResults(data, limit);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });
  });
});
