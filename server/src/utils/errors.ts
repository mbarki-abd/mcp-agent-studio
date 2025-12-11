/**
 * Custom error classes for consistent error handling
 */

// HTTP status codes for common errors
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

// Error codes for categorization
export enum ErrorCode {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS = 'AUTH_1001',
  TOKEN_EXPIRED = 'AUTH_1002',
  TOKEN_INVALID = 'AUTH_1003',
  SESSION_EXPIRED = 'AUTH_1004',
  INSUFFICIENT_PERMISSIONS = 'AUTH_1005',

  // Validation errors (2xxx)
  VALIDATION_FAILED = 'VALID_2001',
  INVALID_INPUT = 'VALID_2002',
  MISSING_REQUIRED_FIELD = 'VALID_2003',

  // Resource errors (3xxx)
  RESOURCE_NOT_FOUND = 'RES_3001',
  RESOURCE_ALREADY_EXISTS = 'RES_3002',
  RESOURCE_CONFLICT = 'RES_3003',
  RESOURCE_LOCKED = 'RES_3004',

  // Server errors (4xxx)
  SERVER_NOT_REACHABLE = 'SRV_4001',
  SERVER_OFFLINE = 'SRV_4002',
  SERVER_CONNECTION_FAILED = 'SRV_4003',

  // Agent errors (5xxx)
  AGENT_NOT_ACTIVE = 'AGT_5001',
  AGENT_BUSY = 'AGT_5002',
  AGENT_VALIDATION_PENDING = 'AGT_5003',
  AGENT_EXECUTION_FAILED = 'AGT_5004',

  // Task errors (6xxx)
  TASK_NOT_SCHEDULED = 'TSK_6001',
  TASK_ALREADY_RUNNING = 'TSK_6002',
  TASK_CANCELLED = 'TSK_6003',
  TASK_EXECUTION_FAILED = 'TSK_6004',

  // External service errors (7xxx)
  REDIS_CONNECTION_FAILED = 'EXT_7001',
  DATABASE_ERROR = 'EXT_7002',
  MCP_CONNECTION_FAILED = 'EXT_7003',

  // General errors (9xxx)
  INTERNAL_ERROR = 'GEN_9001',
  NOT_IMPLEMENTED = 'GEN_9002',
  RATE_LIMIT_EXCEEDED = 'GEN_9003',
}

/**
 * Application error class with HTTP status and error codes
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

// Pre-defined error factories
export const Errors = {
  // Authentication
  invalidCredentials: (details?: Record<string, unknown>) =>
    new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, details),

  tokenExpired: () =>
    new AppError('Token has expired', HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED),

  tokenInvalid: () =>
    new AppError('Invalid token', HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_INVALID),

  insufficientPermissions: (action?: string, resource?: string) =>
    new AppError(
      `You don't have permission to ${action || 'access'} ${resource || 'this resource'}`,
      HttpStatus.FORBIDDEN,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      { action, resource }
    ),

  // Resources
  notFound: (resource: string, id?: string) =>
    new AppError(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      HttpStatus.NOT_FOUND,
      ErrorCode.RESOURCE_NOT_FOUND,
      { resource, id }
    ),

  alreadyExists: (resource: string, field?: string, value?: string) =>
    new AppError(
      field ? `${resource} with ${field} '${value}' already exists` : `${resource} already exists`,
      HttpStatus.CONFLICT,
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      { resource, field, value }
    ),

  // Validation
  validationFailed: (errors: Record<string, string[]>) =>
    new AppError('Validation failed', HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, { errors }),

  invalidInput: (message: string, field?: string) =>
    new AppError(message, HttpStatus.BAD_REQUEST, ErrorCode.INVALID_INPUT, { field }),

  // Server
  serverOffline: (serverId: string) =>
    new AppError('Server is offline', HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVER_OFFLINE, { serverId }),

  serverConnectionFailed: (serverId: string, error?: string) =>
    new AppError(
      `Failed to connect to server: ${error || 'Unknown error'}`,
      HttpStatus.BAD_GATEWAY,
      ErrorCode.SERVER_CONNECTION_FAILED,
      { serverId, error }
    ),

  // Agent
  agentNotActive: (agentId: string, status?: string) =>
    new AppError('Agent is not active', HttpStatus.BAD_REQUEST, ErrorCode.AGENT_NOT_ACTIVE, { agentId, status }),

  agentBusy: (agentId: string) =>
    new AppError('Agent is currently busy', HttpStatus.CONFLICT, ErrorCode.AGENT_BUSY, { agentId }),

  // Task
  taskAlreadyRunning: (taskId: string) =>
    new AppError('Task is already running', HttpStatus.CONFLICT, ErrorCode.TASK_ALREADY_RUNNING, { taskId }),

  taskCancelled: (taskId: string) =>
    new AppError('Task was cancelled', HttpStatus.CONFLICT, ErrorCode.TASK_CANCELLED, { taskId }),

  // General
  internal: (message?: string) =>
    new AppError(message || 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR),

  notImplemented: (feature?: string) =>
    new AppError(
      feature ? `Feature '${feature}' is not implemented` : 'Not implemented',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.NOT_IMPLEMENTED,
      { feature }
    ),

  rateLimitExceeded: () =>
    new AppError('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMIT_EXCEEDED),
};

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Wrap unknown errors into AppError
 */
export function wrapError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new AppError(
    typeof error === 'string' ? error : 'An unexpected error occurred',
    HttpStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_ERROR
  );
}
