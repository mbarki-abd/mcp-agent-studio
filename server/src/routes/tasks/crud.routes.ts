import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../index.js';
import { getTenantContext, getOrganizationUserIds } from '../../utils/tenant.js';
import {
  parsePagination,
  buildPaginatedResponse,
  calculateSkip,
  buildOrderBy,
  validateSortField,
} from '../../utils/pagination.js';

// Allowed sort fields for tasks
const TASK_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority', 'scheduledAt', 'nextRunAt'];

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

export async function taskCrudRoutes(fastify: FastifyInstance) {
  // List tasks (all org tasks)
  fastify.get('/', {
    schema: {
      tags: ['Tasks'],
      description: 'List all tasks in the organization',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', enum: TASK_SORT_FIELDS },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          status: { type: 'string' },
          priority: { type: 'string' },
          agentId: { type: 'string' },
          serverId: { type: 'string' },
          executionMode: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = request.query as {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: string;
      priority?: string;
      agentId?: string;
      serverId?: string;
      executionMode?: string;
      search?: string;
    };

    // Parse pagination
    const pagination = parsePagination(query);
    const validSortBy = validateSortField(pagination.sortBy, TASK_SORT_FIELDS);

    // Get all user IDs in the organization
    const orgUserIds = await getOrganizationUserIds(organizationId);

    // Build where clause
    const where: any = {
      createdById: { in: orgUserIds },
      ...(query.status && { status: query.status as any }),
      ...(query.priority && { priority: query.priority as any }),
      ...(query.agentId && { agentId: query.agentId }),
      ...(query.serverId && { serverId: query.serverId }),
      ...(query.executionMode && { executionMode: query.executionMode as any }),
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { prompt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.task.count({ where });

    const tasks = await prisma.task.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true, displayName: true } },
        server: { select: { id: true, name: true } },
        _count: { select: { executions: true } },
      },
      skip: calculateSkip(pagination.page, pagination.limit),
      take: pagination.limit,
      orderBy: buildOrderBy(validSortBy, pagination.sortOrder),
    });

    const data = tasks.map((t) => ({
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
    }));

    return buildPaginatedResponse(data, total, pagination.page, pagination.limit);
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
    const { userId, organizationId } = getTenantContext(request.user);
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

    // Validate dependencies exist and belong to organization
    if (body.dependsOnIds && body.dependsOnIds.length > 0) {
      const orgUserIds = await getOrganizationUserIds(organizationId);
      const deps = await prisma.task.findMany({
        where: {
          id: { in: body.dependsOnIds },
          createdById: { in: orgUserIds },
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
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Get all user IDs in the organization
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const task = await prisma.task.findFirst({
      where: { id, createdById: { in: orgUserIds } },
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
        createdById: { in: orgUserIds },
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

  // Update task (owner only)
  fastify.put('/:id', {
    schema: {
      tags: ['Tasks'],
      description: 'Update task (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const body = updateTaskSchema.parse(request.body);

    // Only owner can update
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

  // Delete task (owner only)
  fastify.delete('/:id', {
    schema: {
      tags: ['Tasks'],
      description: 'Delete task (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Only owner can delete
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
}
