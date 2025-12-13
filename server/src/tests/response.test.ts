import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyReply } from 'fastify';
import {
  success,
  error,
  sendSuccess,
  sendError,
  Errors,
  Reply,
  ErrorCodes,
} from '../utils/response.js';

describe('Response Utils', () => {
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
  });

  describe('success', () => {
    it('should create success response with data', () => {
      // Arrange
      const data = { id: '123', name: 'Test' };

      // Act
      const result = success(data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta).toBeDefined();
      expect(result.meta?.timestamp).toBeDefined();
    });

    it('should include custom meta data', () => {
      // Arrange
      const data = { test: true };
      const meta = { requestId: 'req-123', duration: 150 };

      // Act
      const result = success(data, meta);

      // Assert
      expect(result.meta?.requestId).toBe('req-123');
      expect(result.meta?.duration).toBe(150);
      expect(result.meta?.timestamp).toBeDefined();
    });

    it('should handle null data', () => {
      // Act
      const result = success(null);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      // Arrange
      const data = [1, 2, 3];

      // Act
      const result = success(data);

      // Assert
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should create error response', () => {
      // Act
      const result = error(ErrorCodes.NOT_FOUND, 'Resource not found');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
      expect(result.error?.message).toBe('Resource not found');
      expect(result.meta?.timestamp).toBeDefined();
    });

    it('should include details in error', () => {
      // Arrange
      const details = { resourceId: '123' };

      // Act
      const result = error(ErrorCodes.NOT_FOUND, 'Not found', details);

      // Assert
      expect(result.error?.details).toEqual(details);
    });

    it('should include field in error', () => {
      // Act
      const result = error(ErrorCodes.VALIDATION_ERROR, 'Invalid email', undefined, 'email');

      // Assert
      expect(result.error?.field).toBe('email');
    });

    it('should not include field when undefined', () => {
      // Act
      const result = error(ErrorCodes.INTERNAL_ERROR, 'Error');

      // Assert
      expect(result.error?.field).toBeUndefined();
    });
  });

  describe('sendSuccess', () => {
    it('should send success with default status 200', () => {
      // Arrange
      const data = { test: true };

      // Act
      sendSuccess(mockReply as FastifyReply, data);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data,
        })
      );
    });

    it('should send success with custom status code', () => {
      // Arrange
      const data = { id: '123' };

      // Act
      sendSuccess(mockReply as FastifyReply, data, 201);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(201);
    });

    it('should include meta in response', () => {
      // Arrange
      const data = {};
      const meta = { requestId: 'req-456' };

      // Act
      sendSuccess(mockReply as FastifyReply, data, 200, meta);

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ requestId: 'req-456' }),
        })
      );
    });
  });

  describe('sendError', () => {
    it('should send error with status code', () => {
      // Act
      sendError(mockReply as FastifyReply, 404, ErrorCodes.NOT_FOUND, 'Not found');

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCodes.NOT_FOUND,
            message: 'Not found',
          }),
        })
      );
    });

    it('should include details and field', () => {
      // Arrange
      const details = { userId: '123' };

      // Act
      sendError(
        mockReply as FastifyReply,
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        details,
        'email'
      );

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details,
            field: 'email',
          }),
        })
      );
    });
  });

  describe('Errors factory', () => {
    it('should create unauthorized error', () => {
      // Act
      const result = Errors.unauthorized();

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(result.error?.message).toBe('Authentication required');
    });

    it('should create unauthorized error with custom message', () => {
      // Act
      const result = Errors.unauthorized('Token expired');

      // Assert
      expect(result.error?.message).toBe('Token expired');
    });

    it('should create forbidden error', () => {
      // Act
      const result = Errors.forbidden();

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.FORBIDDEN);
      expect(result.error?.message).toBe('Access denied');
    });

    it('should create notFound error', () => {
      // Act
      const result = Errors.notFound('User', '123');

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
      expect(result.error?.message).toBe('User not found');
      expect(result.error?.details).toEqual({ id: '123' });
    });

    it('should create validationError', () => {
      // Arrange
      const details = { email: 'invalid' };

      // Act
      const result = Errors.validationError('Invalid input', 'email', details);

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.error?.field).toBe('email');
      expect(result.error?.details).toEqual(details);
    });

    it('should create alreadyExists error', () => {
      // Act
      const result = Errors.alreadyExists('User', 'email');

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.ALREADY_EXISTS);
      expect(result.error?.message).toBe('User already exists');
      expect(result.error?.field).toBe('email');
    });

    it('should create rateLimited error', () => {
      // Act
      const result = Errors.rateLimited(60);

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(result.error?.details).toEqual({ retryAfter: 60 });
    });

    it('should create internalError', () => {
      // Act
      const result = Errors.internalError('Database error');

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe('Database error');
    });

    it('should create serviceUnavailable error', () => {
      // Act
      const result = Errors.serviceUnavailable('Redis');

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
      expect(result.error?.message).toBe('Redis is temporarily unavailable');
    });

    it('should create conflict error', () => {
      // Arrange
      const details = { current: 'RUNNING' };

      // Act
      const result = Errors.conflict('Resource is locked', details);

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.CONFLICT);
      expect(result.error?.details).toEqual(details);
    });

    it('should create invalidState error', () => {
      // Act
      const result = Errors.invalidState('Cannot delete active resource', 'ACTIVE');

      // Assert
      expect(result.error?.code).toBe(ErrorCodes.INVALID_STATE);
      expect(result.error?.details).toEqual({ currentState: 'ACTIVE' });
    });
  });

  describe('Reply helpers', () => {
    it('should send success with status 200', () => {
      // Arrange
      const data = { test: true };

      // Act
      Reply.success(mockReply as FastifyReply, data);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should send created with status 201', () => {
      // Arrange
      const data = { id: '123' };

      // Act
      Reply.created(mockReply as FastifyReply, data);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(201);
    });

    it('should send noContent with status 204', () => {
      // Act
      Reply.noContent(mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should send badRequest with status 400', () => {
      // Act
      Reply.badRequest(mockReply as FastifyReply, 'Invalid input', 'email');

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
    });

    it('should send unauthorized with status 401', () => {
      // Act
      Reply.unauthorized(mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
    });

    it('should send forbidden with status 403', () => {
      // Act
      Reply.forbidden(mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should send notFound with status 404', () => {
      // Act
      Reply.notFound(mockReply as FastifyReply, 'Agent', '123');

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
    });

    it('should send conflict with status 409', () => {
      // Act
      Reply.conflict(mockReply as FastifyReply, 'Resource conflict');

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(409);
    });

    it('should send rateLimited with status 429 and header', () => {
      // Act
      Reply.rateLimited(mockReply as FastifyReply, 120);

      // Assert
      expect(mockReply.header).toHaveBeenCalledWith('Retry-After', 120);
      expect(mockReply.status).toHaveBeenCalledWith(429);
    });

    it('should send internalError with status 500', () => {
      // Act
      Reply.internalError(mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
    });

    it('should send serviceUnavailable with status 503', () => {
      // Act
      Reply.serviceUnavailable(mockReply as FastifyReply, 'Database');

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(503);
    });
  });
});
