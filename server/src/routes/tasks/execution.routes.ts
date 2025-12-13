import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../index.js';
import { getTaskExecutionService } from '../../services/task-execution.service.js';
import { getTenantContext, getOrganizationUserIds } from '../../utils/tenant.js';

export async function taskExecutionRoutes(fastify: FastifyInstance) {
  // Execute task now (owner only)
  fastify.post('/:id/execute', {
    schema: {
      tags: ['Tasks'],
      description: 'Execute task immediately (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    try {
      const executionService = getTaskExecutionService();
      const result = await executionService.executeTask(id, userId);

      return {
        success: result.success,
        taskId: id,
        output: result.output,
        error: result.error,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      return reply.status(400).send({ error: message });
    }
  });

  // Execute prompt directly on an agent
  fastify.post('/execute-prompt', {
    schema: {
      tags: ['Tasks'],
      description: 'Execute a prompt directly on an agent without creating a task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      serverId: z.string().uuid(),
      agentId: z.string().uuid(),
      prompt: z.string().min(1),
    }).parse(request.body);

    try {
      const executionService = getTaskExecutionService();
      const result = await executionService.executePrompt(
        body.serverId,
        body.agentId,
        body.prompt
      );

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      return reply.status(400).send({ error: message });
    }
  });

  // Retry a failed execution (owner only)
  fastify.post('/executions/:executionId/retry', {
    schema: {
      tags: ['Tasks'],
      description: 'Retry a failed execution (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { executionId } = request.params as { executionId: string };

    try {
      const executionService = getTaskExecutionService();
      const result = await executionService.retryExecution(executionId, userId);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        tokensUsed: result.tokensUsed,
        durationMs: result.durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retry failed';
      return reply.status(400).send({ error: message });
    }
  });

  // Cancel task execution (owner only)
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Tasks'],
      description: 'Cancel a running or queued task (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Only owner can cancel
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (task.status !== 'RUNNING' && task.status !== 'QUEUED') {
      return reply.status(400).send({ error: 'Task is not running or queued' });
    }

    // Update task status
    await prisma.task.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Cancel any running executions
    await prisma.taskExecution.updateMany({
      where: {
        taskId: id,
        status: { in: ['RUNNING', 'QUEUED'] }
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    return {
      taskId: id,
      status: 'CANCELLED',
      message: 'Task cancelled successfully',
    };
  });

  // Get task executions (org visible)
  fastify.get('/:id/executions', {
    schema: {
      tags: ['Tasks'],
      description: 'Get task execution history',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    const orgUserIds = await getOrganizationUserIds(organizationId);
    const task = await prisma.task.findFirst({
      where: { id, createdById: { in: orgUserIds } },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const executions = await prisma.taskExecution.findMany({
      where: { taskId: id },
      include: {
        agent: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return {
      executions: executions.map((e) => ({
        id: e.id,
        agent: e.agent,
        status: e.status,
        exitCode: e.exitCode,
        error: e.error,
        tokensUsed: e.tokensUsed,
        durationMs: e.durationMs,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
      })),
    };
  });
}
