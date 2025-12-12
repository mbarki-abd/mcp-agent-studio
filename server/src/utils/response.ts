import { FastifyReply } from 'fastify';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp: string;
  duration?: number;
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Business logic
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_STATE: 'INVALID_STATE',
  DEPENDENCY_FAILED: 'DEPENDENCY_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a success response
 */
export function success<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create an error response
 */
export function error(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  field?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(field && { field }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Send success response via Fastify reply
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode: number = 200,
  meta?: Partial<ResponseMeta>
): void {
  reply.status(statusCode).send(success(data, meta));
}

/**
 * Send error response via Fastify reply
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  field?: string
): void {
  reply.status(statusCode).send(error(code, message, details, field));
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    error(ErrorCodes.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') =>
    error(ErrorCodes.FORBIDDEN, message),

  notFound: (resource: string, id?: string) =>
    error(ErrorCodes.NOT_FOUND, `${resource} not found`, id ? { id } : undefined),

  validationError: (message: string, field?: string, details?: Record<string, unknown>) =>
    error(ErrorCodes.VALIDATION_ERROR, message, details, field),

  alreadyExists: (resource: string, field?: string) =>
    error(ErrorCodes.ALREADY_EXISTS, `${resource} already exists`, undefined, field),

  rateLimited: (retryAfter: number) =>
    error(ErrorCodes.RATE_LIMITED, 'Rate limit exceeded', { retryAfter }),

  internalError: (message = 'An unexpected error occurred') =>
    error(ErrorCodes.INTERNAL_ERROR, message),

  serviceUnavailable: (service: string) =>
    error(ErrorCodes.SERVICE_UNAVAILABLE, `${service} is temporarily unavailable`),

  conflict: (message: string, details?: Record<string, unknown>) =>
    error(ErrorCodes.CONFLICT, message, details),

  invalidState: (message: string, currentState?: string) =>
    error(ErrorCodes.INVALID_STATE, message, currentState ? { currentState } : undefined),
};

/**
 * Reply helpers for common scenarios
 */
export const Reply = {
  success: <T>(reply: FastifyReply, data: T, meta?: Partial<ResponseMeta>) =>
    sendSuccess(reply, data, 200, meta),

  created: <T>(reply: FastifyReply, data: T, meta?: Partial<ResponseMeta>) =>
    sendSuccess(reply, data, 201, meta),

  noContent: (reply: FastifyReply) =>
    reply.status(204).send(),

  badRequest: (reply: FastifyReply, message: string, field?: string) =>
    sendError(reply, 400, ErrorCodes.VALIDATION_ERROR, message, undefined, field),

  unauthorized: (reply: FastifyReply, message = 'Authentication required') =>
    sendError(reply, 401, ErrorCodes.UNAUTHORIZED, message),

  forbidden: (reply: FastifyReply, message = 'Access denied') =>
    sendError(reply, 403, ErrorCodes.FORBIDDEN, message),

  notFound: (reply: FastifyReply, resource: string, id?: string) =>
    sendError(reply, 404, ErrorCodes.NOT_FOUND, `${resource} not found`, id ? { id } : undefined),

  conflict: (reply: FastifyReply, message: string, details?: Record<string, unknown>) =>
    sendError(reply, 409, ErrorCodes.CONFLICT, message, details),

  rateLimited: (reply: FastifyReply, retryAfter: number) => {
    reply.header('Retry-After', retryAfter);
    sendError(reply, 429, ErrorCodes.RATE_LIMITED, 'Rate limit exceeded', { retryAfter });
  },

  internalError: (reply: FastifyReply, message = 'An unexpected error occurred') =>
    sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, message),

  serviceUnavailable: (reply: FastifyReply, service: string) =>
    sendError(reply, 503, ErrorCodes.SERVICE_UNAVAILABLE, `${service} is temporarily unavailable`),
};
