import { describe, it, expect } from 'vitest';
import {
  AppError,
  HttpStatus,
  ErrorCode,
  Errors,
  isAppError,
  wrapError
} from '../utils/errors.js';

describe('Error Utils', () => {
  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      // Act
      const error = new AppError('Test error');

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create an AppError with custom values', () => {
      // Arrange
      const details = { userId: '123' };

      // Act
      const error = new AppError(
        'Custom error',
        HttpStatus.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
        details,
        false
      );

      // Assert
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(false);
    });

    it('should have correct error name', () => {
      // Act
      const error = new AppError('Test');

      // Assert
      expect(error.name).toBe('AppError');
    });

    it('should capture stack trace', () => {
      // Act
      const error = new AppError('Test');

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    it('should serialize to JSON correctly', () => {
      // Arrange
      const error = new AppError(
        'JSON test',
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        { field: 'email' }
      );

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toEqual({
        error: {
          message: 'JSON test',
          code: ErrorCode.VALIDATION_FAILED,
          statusCode: HttpStatus.BAD_REQUEST,
          details: { field: 'email' },
          timestamp: error.timestamp.toISOString(),
        },
      });
    });
  });

  describe('Errors factory', () => {
    it('should create invalidCredentials error', () => {
      // Act
      const error = Errors.invalidCredentials();

      // Assert
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('should create invalidCredentials error with details', () => {
      // Act
      const error = Errors.invalidCredentials({ attempt: 3 });

      // Assert
      expect(error.details).toEqual({ attempt: 3 });
    });

    it('should create tokenExpired error', () => {
      // Act
      const error = Errors.tokenExpired();

      // Assert
      expect(error.message).toBe('Token has expired');
      expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
    });

    it('should create tokenInvalid error', () => {
      // Act
      const error = Errors.tokenInvalid();

      // Assert
      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe(ErrorCode.TOKEN_INVALID);
    });

    it('should create insufficientPermissions error', () => {
      // Act
      const error = Errors.insufficientPermissions('delete', 'Agent');

      // Assert
      expect(error.message).toBe("You don't have permission to delete Agent");
      expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS);
      expect(error.details).toEqual({ action: 'delete', resource: 'Agent' });
    });

    it('should create notFound error with id', () => {
      // Act
      const error = Errors.notFound('User', '123');

      // Assert
      expect(error.message).toBe("User with id '123' not found");
      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.details).toEqual({ resource: 'User', id: '123' });
    });

    it('should create notFound error without id', () => {
      // Act
      const error = Errors.notFound('Agent');

      // Assert
      expect(error.message).toBe('Agent not found');
    });

    it('should create alreadyExists error', () => {
      // Act
      const error = Errors.alreadyExists('User', 'email', 'test@example.com');

      // Assert
      expect(error.message).toBe("User with email 'test@example.com' already exists");
      expect(error.statusCode).toBe(HttpStatus.CONFLICT);
      expect(error.code).toBe(ErrorCode.RESOURCE_ALREADY_EXISTS);
    });

    it('should create validationFailed error', () => {
      // Arrange
      const errors = { email: ['Invalid format'], password: ['Too short'] };

      // Act
      const error = Errors.validationFailed(errors);

      // Assert
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.details).toEqual({ errors });
    });

    it('should create invalidInput error', () => {
      // Act
      const error = Errors.invalidInput('Invalid email format', 'email');

      // Assert
      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create serverOffline error', () => {
      // Act
      const error = Errors.serverOffline('server-123');

      // Assert
      expect(error.message).toBe('Server is offline');
      expect(error.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(error.code).toBe(ErrorCode.SERVER_OFFLINE);
    });

    it('should create serverConnectionFailed error', () => {
      // Act
      const error = Errors.serverConnectionFailed('server-123', 'Connection timeout');

      // Assert
      expect(error.message).toBe('Failed to connect to server: Connection timeout');
      expect(error.statusCode).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should create agentNotActive error', () => {
      // Act
      const error = Errors.agentNotActive('agent-123', 'VALIDATING');

      // Assert
      expect(error.message).toBe('Agent is not active');
      expect(error.code).toBe(ErrorCode.AGENT_NOT_ACTIVE);
    });

    it('should create agentBusy error', () => {
      // Act
      const error = Errors.agentBusy('agent-123');

      // Assert
      expect(error.message).toBe('Agent is currently busy');
      expect(error.code).toBe(ErrorCode.AGENT_BUSY);
    });

    it('should create taskAlreadyRunning error', () => {
      // Act
      const error = Errors.taskAlreadyRunning('task-123');

      // Assert
      expect(error.message).toBe('Task is already running');
      expect(error.code).toBe(ErrorCode.TASK_ALREADY_RUNNING);
    });

    it('should create taskCancelled error', () => {
      // Act
      const error = Errors.taskCancelled('task-123');

      // Assert
      expect(error.message).toBe('Task was cancelled');
      expect(error.code).toBe(ErrorCode.TASK_CANCELLED);
    });

    it('should create internal error', () => {
      // Act
      const error = Errors.internal('Database connection failed');

      // Assert
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should create internal error with default message', () => {
      // Act
      const error = Errors.internal();

      // Assert
      expect(error.message).toBe('Internal server error');
    });

    it('should create notImplemented error', () => {
      // Act
      const error = Errors.notImplemented('GraphQL API');

      // Assert
      expect(error.message).toBe("Feature 'GraphQL API' is not implemented");
      expect(error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
    });

    it('should create rateLimitExceeded error', () => {
      // Act
      const error = Errors.rateLimitExceeded();

      // Assert
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      // Arrange
      const error = new AppError('Test');

      // Act
      const result = isAppError(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for standard Error', () => {
      // Arrange
      const error = new Error('Standard error');

      // Act
      const result = isAppError(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Act
      const result = isAppError(null);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      // Act
      const result = isAppError(undefined);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for string', () => {
      // Act
      const result = isAppError('error string');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('should return AppError as is', () => {
      // Arrange
      const error = new AppError('Original error', HttpStatus.NOT_FOUND);

      // Act
      const result = wrapError(error);

      // Assert
      expect(result).toBe(error);
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should wrap standard Error', () => {
      // Arrange
      const error = new Error('Standard error');

      // Act
      const result = wrapError(error);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
      expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.details?.originalError).toBe('Error');
    });

    it('should wrap string error', () => {
      // Act
      const result = wrapError('String error');

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
    });

    it('should wrap unknown error types', () => {
      // Act
      const result = wrapError({ foo: 'bar' });

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should wrap null', () => {
      // Act
      const result = wrapError(null);

      // Assert
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should preserve stack trace from Error', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      const result = wrapError(error);

      // Assert
      expect(result.details?.stack).toBeDefined();
    });
  });
});
