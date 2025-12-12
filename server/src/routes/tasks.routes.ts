import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { getTaskExecutionService } from '../services/task-execution.service.js';
import { getTenantContext, getOrganizationUserIds } from '../utils/tenant.js';
import {
  parsePagination,
  buildPaginatedResponse,
  calculateSkip,
  buildOrderBy,
  validateSortField,
} from '../utils/pagination.js';

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

export async function taskRoutes(fastify: FastifyInstance) {
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

  // Check task dependencies status (org visible)
  fastify.get('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Check task dependencies status',
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

    // Manually fetch dependency tasks
    const dependsOn = task.dependsOnIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: task.dependsOnIds } },
          select: { id: true, title: true, status: true },
        })
      : [];

    // Manually fetch dependent tasks (within org)
    const dependentTasks = await prisma.task.findMany({
      where: {
        dependsOnIds: { has: id },
        createdById: { in: orgUserIds },
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

  // Add dependencies to a task (owner only)
  fastify.post('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Add dependencies to a task (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const body = z.object({
      dependsOnIds: z.array(z.string().uuid()).min(1),
    }).parse(request.body);

    // Only owner can modify dependencies
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Validate dependencies exist and belong to organization
    const orgUserIds = await getOrganizationUserIds(organizationId);
    const deps = await prisma.task.findMany({
      where: {
        id: { in: body.dependsOnIds },
        createdById: { in: orgUserIds },
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

  // ========================================
  // BULK OPERATIONS
  // ========================================

  // Bulk cancel tasks
  fastify.post('/bulk/cancel', {
    schema: {
      tags: ['Tasks'],
      description: 'Cancel multiple tasks at once',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const body = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
    }).parse(request.body);

    // Get tasks owned by user that are cancellable
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: body.taskIds },
        createdById: userId,
        status: { in: ['RUNNING', 'QUEUED', 'PENDING', 'SCHEDULED'] },
      },
      select: { id: true, status: true },
    });

    if (tasks.length === 0) {
      return reply.status(400).send({
        error: 'No cancellable tasks found',
        details: 'Tasks must be owned by you and in RUNNING, QUEUED, PENDING, or SCHEDULED status',
      });
    }

    const taskIds = tasks.map(t => t.id);

    // Cancel tasks
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status: 'CANCELLED' },
    });

    // Cancel any running executions
    await prisma.taskExecution.updateMany({
      where: {
        taskId: { in: taskIds },
        status: { in: ['RUNNING', 'QUEUED'] },
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    const notFound = body.taskIds.filter(id => !taskIds.includes(id));

    return {
      cancelled: taskIds.length,
      taskIds,
      notCancelled: notFound.length,
      notCancelledIds: notFound,
      message: `${taskIds.length} task(s) cancelled successfully`,
    };
  });

  // Bulk delete tasks
  fastify.post('/bulk/delete', {
    schema: {
      tags: ['Tasks'],
      description: 'Delete multiple tasks at once',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const body = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
      force: z.boolean().optional().default(false),
    }).parse(request.body);

    // Get tasks owned by user
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: body.taskIds },
        createdById: userId,
      },
      select: { id: true, status: true },
    });

    if (tasks.length === 0) {
      return reply.status(400).send({
        error: 'No deletable tasks found',
        details: 'Tasks must be owned by you',
      });
    }

    // Check for running tasks unless force is true
    const runningTasks = tasks.filter(t => t.status === 'RUNNING' || t.status === 'QUEUED');
    if (runningTasks.length > 0 && !body.force) {
      return reply.status(400).send({
        error: 'Cannot delete running tasks',
        runningTaskIds: runningTasks.map(t => t.id),
        hint: 'Set force=true to cancel and delete running tasks',
      });
    }

    const taskIds = tasks.map(t => t.id);

    // If force, cancel running tasks first
    if (body.force && runningTasks.length > 0) {
      const runningIds = runningTasks.map(t => t.id);
      await prisma.task.updateMany({
        where: { id: { in: runningIds } },
        data: { status: 'CANCELLED' },
      });
      await prisma.taskExecution.updateMany({
        where: {
          taskId: { in: runningIds },
          status: { in: ['RUNNING', 'QUEUED'] },
        },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
        },
      });
    }

    // Delete executions first
    await prisma.taskExecution.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    // Delete tasks
    await prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });

    const notFound = body.taskIds.filter(id => !taskIds.includes(id));

    return {
      deleted: taskIds.length,
      taskIds,
      notDeleted: notFound.length,
      notDeletedIds: notFound,
      message: `${taskIds.length} task(s) deleted successfully`,
    };
  });

  // Bulk update task status
  fastify.post('/bulk/status', {
    schema: {
      tags: ['Tasks'],
      description: 'Update status of multiple tasks at once',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const body = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
      status: z.enum(['DRAFT', 'PENDING', 'SCHEDULED', 'CANCELLED']),
    }).parse(request.body);

    // Cannot set to RUNNING/QUEUED/COMPLETED via bulk update
    if (['RUNNING', 'QUEUED', 'COMPLETED'].includes(body.status)) {
      return reply.status(400).send({
        error: 'Invalid status for bulk update',
        hint: 'Use bulk/cancel to cancel tasks, or execute them to change to RUNNING',
      });
    }

    // Get tasks owned by user that are not currently running
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: body.taskIds },
        createdById: userId,
        status: { notIn: ['RUNNING', 'QUEUED'] },
      },
      select: { id: true, status: true },
    });

    if (tasks.length === 0) {
      return reply.status(400).send({
        error: 'No updateable tasks found',
        details: 'Tasks must be owned by you and not in RUNNING or QUEUED status',
      });
    }

    const taskIds = tasks.map(t => t.id);

    // Update tasks
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status: body.status },
    });

    const notUpdated = body.taskIds.filter(id => !taskIds.includes(id));

    return {
      updated: taskIds.length,
      taskIds,
      newStatus: body.status,
      notUpdated: notUpdated.length,
      notUpdatedIds: notUpdated,
      message: `${taskIds.length} task(s) updated to ${body.status}`,
    };
  });

  // Bulk execute tasks
  fastify.post('/bulk/execute', {
    schema: {
      tags: ['Tasks'],
      description: 'Execute multiple tasks at once',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const body = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(20), // Lower limit for execution
      sequential: z.boolean().optional().default(false),
    }).parse(request.body);

    // Get tasks owned by user that can be executed
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: body.taskIds },
        createdById: userId,
        status: { in: ['DRAFT', 'PENDING', 'SCHEDULED', 'COMPLETED', 'FAILED'] },
      },
      select: { id: true, title: true, status: true },
    });

    if (tasks.length === 0) {
      return reply.status(400).send({
        error: 'No executable tasks found',
        details: 'Tasks must be owned by you and not currently running',
      });
    }

    const taskIds = tasks.map(t => t.id);
    const executionService = getTaskExecutionService();
    const results: Array<{
      taskId: string;
      title: string;
      success: boolean;
      error?: string;
    }> = [];

    if (body.sequential) {
      // Execute sequentially
      for (const task of tasks) {
        try {
          await executionService.executeTask(task.id, userId);
          results.push({ taskId: task.id, title: task.title, success: true });
        } catch (error) {
          results.push({
            taskId: task.id,
            title: task.title,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } else {
      // Execute in parallel
      const execPromises = tasks.map(async (task) => {
        try {
          await executionService.executeTask(task.id, userId);
          return { taskId: task.id, title: task.title, success: true };
        } catch (error) {
          return {
            taskId: task.id,
            title: task.title,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });
      results.push(...await Promise.all(execPromises));
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const notFound = body.taskIds.filter(id => !taskIds.includes(id));

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      notFound: notFound.length,
      results,
      notFoundIds: notFound,
      message: `${successful.length}/${results.length} task(s) executed successfully`,
    };
  });

  // Bulk retry failed tasks
  fastify.post('/bulk/retry', {
    schema: {
      tags: ['Tasks'],
      description: 'Retry multiple failed tasks',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const body = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(20),
    }).parse(request.body);

    // Get tasks owned by user that failed
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: body.taskIds },
        createdById: userId,
        status: 'FAILED',
      },
      select: { id: true, title: true },
    });

    if (tasks.length === 0) {
      return reply.status(400).send({
        error: 'No failed tasks found to retry',
        details: 'Tasks must be owned by you and in FAILED status',
      });
    }

    const taskIds = tasks.map(t => t.id);
    const executionService = getTaskExecutionService();
    const results: Array<{
      taskId: string;
      title: string;
      success: boolean;
      error?: string;
    }> = [];

    // Execute retries in parallel
    const execPromises = tasks.map(async (task) => {
      try {
        await executionService.executeTask(task.id, userId);
        return { taskId: task.id, title: task.title, success: true };
      } catch (error) {
        return {
          taskId: task.id,
          title: task.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    results.push(...await Promise.all(execPromises));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const notFound = body.taskIds.filter(id => !taskIds.includes(id));

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      notFound: notFound.length,
      results,
      notFoundIds: notFound,
      message: `${successful.length}/${results.length} task(s) retried successfully`,
    };
  });

  // Remove dependencies from a task (owner only)
  fastify.delete('/:id/dependencies', {
    schema: {
      tags: ['Tasks'],
      description: 'Remove dependencies from a task (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const body = z.object({
      dependsOnIds: z.array(z.string().uuid()).min(1),
    }).parse(request.body);

    // Only owner can modify dependencies
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
