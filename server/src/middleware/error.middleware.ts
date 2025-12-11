import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError, Errors, HttpStatus, isAppError, wrapError } from '../utils/errors.js';

async function errorHandlerPlugin(fastify: ReturnType<typeof import('fastify').default>) {
  // Global error handler
  fastify.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    // Log the error
    request.log.error({
      err: error,
      requestId,
      url: request.url,
      method: request.method,
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(issue.message);
      }

      const appError = Errors.validationFailed(validationErrors);
      return reply.status(appError.statusCode).send({
        ...appError.toJSON(),
        requestId,
      });
    }

    // Handle Fastify validation errors
    if ('validation' in error && error.validation) {
      const validationErrors: Record<string, string[]> = {};
      for (const issue of error.validation as Array<{ instancePath?: string; keyword?: string; message?: string }>) {
        const path = issue.instancePath || issue.keyword || 'unknown';
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(issue.message || 'Validation failed');
      }

      const appError = Errors.validationFailed(validationErrors);
      return reply.status(appError.statusCode).send({
        ...appError.toJSON(),
        requestId,
      });
    }

    // Handle AppError
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        ...error.toJSON(),
        requestId,
      });
    }

    // Handle Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;

      // Unique constraint violation
      if (prismaError.code === 'P2002') {
        const field = prismaError.meta?.target?.[0] || 'field';
        const appError = Errors.alreadyExists('Resource', field);
        return reply.status(appError.statusCode).send({
          ...appError.toJSON(),
          requestId,
        });
      }

      // Record not found
      if (prismaError.code === 'P2025') {
        const appError = Errors.notFound('Resource');
        return reply.status(appError.statusCode).send({
          ...appError.toJSON(),
          requestId,
        });
      }
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.message?.includes('jwt')) {
      const appError = Errors.tokenInvalid();
      return reply.status(appError.statusCode).send({
        ...appError.toJSON(),
        requestId,
      });
    }

    if (error.name === 'TokenExpiredError') {
      const appError = Errors.tokenExpired();
      return reply.status(appError.statusCode).send({
        ...appError.toJSON(),
        requestId,
      });
    }

    // Wrap unknown errors
    const wrappedError = wrapError(error);

    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';

    return reply.status(wrappedError.statusCode).send({
      error: {
        message: isProduction ? 'Internal server error' : wrappedError.message,
        code: wrappedError.code,
        statusCode: wrappedError.statusCode,
        timestamp: wrappedError.timestamp.toISOString(),
        ...(isProduction ? {} : { details: wrappedError.details }),
      },
      requestId,
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const appError = Errors.notFound(`Route ${request.method} ${request.url}`);
    return reply.status(appError.statusCode).send({
      ...appError.toJSON(),
      requestId: request.id,
    });
  });
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler-plugin',
});
