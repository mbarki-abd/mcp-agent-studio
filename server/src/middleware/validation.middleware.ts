/**
 * Request Validation Middleware
 *
 * Centralized Zod validation for request body, query, and params.
 * Provides consistent error responses and type safety.
 */
import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import { z, ZodSchema, ZodError } from 'zod';

// Validation error response type
interface ValidationErrorResponse {
  error: string;
  code: 'VALIDATION_ERROR';
  details: Array<{
    path: string;
    message: string;
  }>;
}

// Format Zod errors into a clean response
function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

// Validation options
interface ValidateOptions<TBody, TQuery, TParams> {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}

// Create a preHandler that validates request parts
export function validate<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
>(options: ValidateOptions<TBody, TQuery, TParams>): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate body
      if (options.body) {
        const result = options.body.safeParse(request.body);
        if (!result.success) {
          return reply.status(400).send(formatZodError(result.error));
        }
        request.body = result.data;
      }

      // Validate query
      if (options.query) {
        const result = options.query.safeParse(request.query);
        if (!result.success) {
          return reply.status(400).send(formatZodError(result.error));
        }
        request.query = result.data as typeof request.query;
      }

      // Validate params
      if (options.params) {
        const result = options.params.safeParse(request.params);
        if (!result.success) {
          return reply.status(400).send(formatZodError(result.error));
        }
        request.params = result.data as typeof request.params;
      }
    } catch (err) {
      request.log.error(err, 'Validation error');
      return reply.status(500).send({ error: 'Internal validation error' });
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  // UUID parameter
  uuid: z.string().uuid('Invalid UUID format'),

  // Pagination query
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // Date range query
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // Search query
  search: z.object({
    q: z.string().min(1).max(100).optional(),
  }),

  // Sort query
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};

// Validation plugin that adds helper to fastify
async function validationPlugin(fastify: FastifyInstance) {
  // Add validate function to fastify instance
  fastify.decorate('validate', validate);

  // Add common schemas
  fastify.decorate('schemas', commonSchemas);

  // Global error handler for Zod errors (catch any that slip through)
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(formatZodError(error));
    }

    // Check if it's a validation error from Fastify's built-in validation
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.validation.map((v: { instancePath: string; message?: string }) => ({
          path: v.instancePath || 'unknown',
          message: v.message || 'Invalid value',
        })),
      });
    }

    // Pass to default error handler
    throw error;
  });
}

// Declare types
declare module 'fastify' {
  interface FastifyInstance {
    validate: typeof validate;
    schemas: typeof commonSchemas;
  }
}

export default fp(validationPlugin, {
  name: 'validation-plugin',
});

// Re-export Zod for convenience
export { z };
