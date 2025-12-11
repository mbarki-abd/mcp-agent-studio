import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { getTaskExecutionService } from '../services/task-execution.service.js';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  serverId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  assignmentMode: z.enum(['MANUAL', 'AUTO', 'BY_CAPABILITY']).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
  prompt: z.string().min(1),
  promptVariables: z.record(z.string()).optional(),
  executionMode: z.enum(['IMMEDIATE', 'SCHEDULED', 'RECURRING']).optional(),
  scheduledAt: z.string().datetime().optional(),
  recurrenceFrequency: z.enum(['MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
  recurrenceInterval: z.number().min(1).optional(),
  cronExpression: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  timeout: z.number().optional(),
  maxRetries: z.number().optional(),
  retryDelay: z.number().optional(),
  dependsOnIds: z.array(z.string().uuid()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['DRAFT', 'PENDING', 'SCHEDULED', 'CANCELLED']).optional(),
});

export async function taskRoutes(fastify: FastifyInstance) {
  // List tasks
  fastify.get('/', {
    schema: {
      tags: ['Tasks'],
      description: 'List all tasks',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          agentId: { type: 'string' },
          serverId: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };
    const query = request.query as {
      status?: string;
      agentId?: string;
      serverId?: string;
      limit: number;
      offset: number;
    };

    const tasks = await prisma.task.findMany({
      where: {
        createdById: userId,
        ...(query.status && { status: query.status as any }),
        ...(query.agentId && { agentId: query.agentId }),
        ...(query.serverId && { serverId: query.serverId }),
      },
      include: {
        agent: { select: { id: true, name: true, displayName: true } },
        server: { select: { id: true, name: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    });

    const total = await prisma.task.count({
      where: {
        createdById: userId,
        ...(query.status && { status: query.status as any }),
        ...(query.agentId && { agentId: query.agentId }),
        ...(query.serverId && { serverId: query.serverId }),
      },
    });

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        agent: t.agent,
        server: t.server,
        executionMode: t.executionMode,
        scheduledAt: t.scheduledAt,
        nextRunAt: t.nextRunAt,
        lastRunAt: t.lastRunAt,
        runCount: t.runCount,
        executionCount: t._count.executions,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  });

  // Create task
  fastify.post('/', {
    schema: {
      tags: ['Tasks'],
      description: 'Create a new task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const body = createTaskSchema.parse(request.body);

    // Determine initial status
    let status: any = 'DRAFT';
    if (body.executionMode === 'IMMEDIATE') {
      status = 'PENDING';
    } else if (body.executionMode === 'SCHEDULED' || body.executionMode === 'RECURRING') {
      status = 'SCHEDULED';
    }

    // Calculate next run time for scheduled/recurring tasks
    let nextRunAt: Date | null = null;
    if (body.scheduledAt) {
      nextRunAt = new Date(body.scheduledAt);
    } else if (body.startDate) {
      nextRunAt = new Date(body.startDate);
    }

    // Validate dependencies exist and belong to user
    if (body.dependsOnIds && body.dependsOnIds.length > 0) {
      const deps = await prisma.task.findMany({
        where: {
          id: { in: body.dependsOnIds },
          createdById: userId,
        },
        select: { id: true },
      });
      const foundIds = deps.map(d => d.id);
      const missingIds = body.dependsOnIds.filter(id => !foundIds.includes(id));
      if (missingIds.length > 0) {
        return reply.status(400).send({
          error: `Dependencies not found: ${missingIds.join(', ')}`
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || 'MEDIUM',
        status,
        serverId: body.serverId,
        projectId: body.projectId,
        agentId: body.agentId,
        assignmentMode: body.assignmentMode || 'MANUAL',
        requiredCapabilities: body.requiredCapabilities || [],
        prompt: body.prompt,
        promptVariables: body.promptVariables || {},
        executionMode: body.executionMode || 'IMMEDIATE',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        recurrenceFrequency: body.recurrenceFrequency,
        recurrenceInterval: body.recurrenceInterval,
        cronExpression: body.cronExpression,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        timezone: body.timezone || 'UTC',
        timeout: body.timeout,
        maxRetries: body.maxRetries || 3,
        retryDelay: body.retryDelay || 60000,
        createdById: userId,
        nextRunAt,
        dependsOnIds: body.dependsOnIds || [],
      },
    });

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      executionMode: task.executionMode,
      nextRunAt: task.nextRunAt,
      dependsOnIds: task.dependsOnIds,
    };
  });

  // Get task by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Tasks'],
      description: 'Get task by ID',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
      include: {
        agent: { select: { id: true, name: true, displayName: true, status: true } },
        server: { select: { id: true, name: true, url: true } },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            exitCode: true,
            tokensUsed: true,
            durationMs: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Manually fetch dependency tasks
    const dependsOn = task.dependsOnIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: task.dependsOnIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    // Manually fetch dependent tasks (tasks that depend on this one)
    const dependentTasks = await prisma.task.findMany({
      where: {
        dependsOnIds: { has: id },
        createdById: userId,
      },
      select: { id: true, title: true, status: true },
    });

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      agent: task.agent,
      server: task.server,
      assignmentMode: task.assignmentMode,
      requiredCapabilities: task.requiredCapabilities,
      prompt: task.prompt,
      promptVariables: task.promptVariables,
      executionMode: task.executionMode,
      scheduledAt: task.scheduledAt,
      recurrenceFrequency: task.recurrenceFrequency,
      recurrenceInterval: task.recurrenceInterval,
      cronExpression: task.cronExpression,
      startDate: task.startDate,
      endDate: task.endDate,
      timezone: task.timezone,
      timeout: task.timeout,
      maxRetries: task.maxRetries,
      retryDelay: task.retryDelay,
      lastRunAt: task.lastRunAt,
      nextRunAt: task.nextRunAt,
      runCount: task.runCount,
      dependsOnIds: task.dependsOnIds,
      dependsOn,
      dependentTasks,
      executions: task.executions,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  });

  // Update task
  fastify.put('/:id', {
    schema: {
      tags: ['Tasks'],
      description: 'Update task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Don't allow updates to running tasks
    if (task.status === 'RUNNING' || task.status === 'QUEUED') {
      return reply.status(400).send({ error: 'Cannot update running or queued tasks' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
    };
  });

  // Delete task
  fastify.delete('/:id', {
    schema: {
      tags: ['Tasks'],
      description: 'Delete task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Delete executions first
    await prisma.taskExecution.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });

    return { message: 'Task deleted successfully' };
  });

  // Execute task now
  fastify.post('/:id/execute', {
    schema: {
      tags: ['Tasks'],
      description: 'Execute task immediately',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
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

  // Retry a failed execution
  fastify.post('/executions/:executionId/retry', {
    schema: {
      tags: ['Tasks'],
      description: 'Retry a failed execution',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
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

  // Cancel task execution
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Tasks'],
      description: 'Cancel a running or queued task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

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

  // Get task executions
  fastify.get('/:id/executions', {
    schema: {
      tags: ['Tasks'],
      description: 'Get task execution history',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
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

  // Check task dependencies status
  fastify.get('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Check task dependencies status',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Manually fetch dependency tasks
    const dependsOn = task.dependsOnIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: task.dependsOnIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    // Manually fetch dependent tasks
    const dependentTasks = await prisma.task.findMany({
      where: {
        dependsOnIds: { has: id },
        createdById: userId,
      },
      select: { id: true, title: true, status: true },
    });

    const completedDeps = dependsOn.filter(d => d.status === 'COMPLETED');
    const pendingDeps = dependsOn.filter(d => d.status !== 'COMPLETED');

    return {
      taskId: task.id,
      canExecute: pendingDeps.length === 0,
      dependencies: {
        total: dependsOn.length,
        completed: completedDeps.length,
        pending: pendingDeps.length,
        items: dependsOn,
      },
      dependentTasks: {
        total: dependentTasks.length,
        items: dependentTasks,
      },
    };
  });

  // Add dependencies to a task
  fastify.post('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Add dependencies to a task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    const body = z.object({
      dependsOnIds: z.array(z.string().uuid()).min(1),
    }).parse(request.body);

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Validate dependencies exist and belong to user
    const deps = await prisma.task.findMany({
      where: {
        id: { in: body.dependsOnIds },
        createdById: userId,
      },
      select: { id: true },
    });

    const foundIds = deps.map(d => d.id);
    const missingIds = body.dependsOnIds.filter(depId => !foundIds.includes(depId));
    if (missingIds.length > 0) {
      return reply.status(400).send({
        error: `Dependencies not found: ${missingIds.join(', ')}`
      });
    }

    // Prevent circular dependencies
    if (body.dependsOnIds.includes(id)) {
      return reply.status(400).send({ error: 'Task cannot depend on itself' });
    }

    // Merge with existing dependencies
    const existingIds = task.dependsOnIds as string[];
    const newIds = [...new Set([...existingIds, ...body.dependsOnIds])];

    const updated = await prisma.task.update({
      where: { id },
      data: { dependsOnIds: newIds },
    });

    // Manually fetch dependency tasks for response
    const dependsOn = newIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: newIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    return {
      taskId: updated.id,
      dependsOnIds: updated.dependsOnIds,
      dependsOn,
    };
  });

  // Remove dependencies from a task
  fastify.delete('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Remove dependencies from a task',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    const body = z.object({
      dependsOnIds: z.array(z.string().uuid()).min(1),
    }).parse(request.body);

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const existingIds = task.dependsOnIds as string[];
    const newIds = existingIds.filter(depId => !body.dependsOnIds.includes(depId));

    const updated = await prisma.task.update({
      where: { id },
      data: { dependsOnIds: newIds },
    });

    // Manually fetch dependency tasks for response
    const dependsOn = newIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: newIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    return {
      taskId: updated.id,
      dependsOnIds: updated.dependsOnIds,
      dependsOn,
    };
  });
}
