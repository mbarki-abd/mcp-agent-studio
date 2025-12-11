import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';

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
      },
    });

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      executionMode: task.executionMode,
      nextRunAt: task.nextRunAt,
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

    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
      include: { agent: true },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (!task.agentId || !task.agent) {
      return reply.status(400).send({ error: 'Task has no assigned agent' });
    }

    if (task.agent.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Agent is not active' });
    }

    // Create execution record
    const execution = await prisma.taskExecution.create({
      data: {
        taskId: id,
        agentId: task.agentId,
        status: 'QUEUED',
        prompt: task.prompt,
      },
    });

    // Update task status
    await prisma.task.update({
      where: { id },
      data: { status: 'QUEUED' },
    });

    // TODO: Send to execution queue

    return {
      executionId: execution.id,
      taskId: task.id,
      status: 'QUEUED',
      message: 'Task queued for execution',
    };
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
}
