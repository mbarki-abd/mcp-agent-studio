import { prisma } from '../index.js';
import type { TaskStatus, Priority, ExecutionMode, RecurrenceFreq, AssignmentMode } from '@prisma/client';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  serverId?: string;
  projectId?: string;
  agentId?: string;
  assignmentMode?: AssignmentMode;
  requiredCapabilities?: string[];
  prompt: string;
  promptVariables?: Record<string, string>;
  executionMode?: ExecutionMode;
  scheduledAt?: string;
  recurrenceFrequency?: RecurrenceFreq;
  recurrenceInterval?: number;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  createdById: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  agentId?: string;
  assignmentMode?: AssignmentMode;
  requiredCapabilities?: string[];
  prompt?: string;
  promptVariables?: Record<string, string>;
  executionMode?: ExecutionMode;
  scheduledAt?: string;
  recurrenceFrequency?: RecurrenceFreq;
  recurrenceInterval?: number;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  status?: TaskStatus;
}

export interface ListTasksFilters {
  status?: string;
  agentId?: string;
  serverId?: string;
  limit?: number;
  offset?: number;
}

export class TaskService {
  async list(userId: string, filters: ListTasksFilters = {}) {
    const { status, agentId, serverId, limit = 50, offset = 0 } = filters;

    const tasks = await prisma.task.findMany({
      where: {
        createdById: userId,
        ...(status && { status: status as TaskStatus }),
        ...(agentId && { agentId }),
        ...(serverId && { serverId }),
      },
      include: {
        agent: { select: { id: true, name: true, displayName: true } },
        server: { select: { id: true, name: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.task.count({
      where: {
        createdById: userId,
        ...(status && { status: status as TaskStatus }),
        ...(agentId && { agentId }),
        ...(serverId && { serverId }),
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
      limit,
      offset,
    };
  }

  async create(input: CreateTaskInput) {
    // Determine initial status
    let status: TaskStatus = 'DRAFT';
    if (input.executionMode === 'IMMEDIATE') {
      status = 'PENDING';
    } else if (input.executionMode === 'SCHEDULED' || input.executionMode === 'RECURRING') {
      status = 'SCHEDULED';
    }

    // Calculate next run time for scheduled/recurring tasks
    let nextRunAt: Date | null = null;
    if (input.scheduledAt) {
      nextRunAt = new Date(input.scheduledAt);
    } else if (input.startDate) {
      nextRunAt = new Date(input.startDate);
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority || 'MEDIUM',
        status,
        serverId: input.serverId,
        projectId: input.projectId,
        agentId: input.agentId,
        assignmentMode: input.assignmentMode || 'MANUAL',
        requiredCapabilities: input.requiredCapabilities || [],
        prompt: input.prompt,
        promptVariables: input.promptVariables || {},
        executionMode: input.executionMode || 'IMMEDIATE',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        recurrenceFrequency: input.recurrenceFrequency,
        recurrenceInterval: input.recurrenceInterval,
        cronExpression: input.cronExpression,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        timezone: input.timezone || 'UTC',
        timeout: input.timeout,
        maxRetries: input.maxRetries || 3,
        retryDelay: input.retryDelay || 60000,
        createdById: input.createdById,
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
  }

  async getById(id: string, userId: string) {
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

    return task;
  }

  async update(id: string, userId: string, input: UpdateTaskInput) {
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Don't allow updates to running tasks
    if (task.status === 'RUNNING' || task.status === 'QUEUED') {
      throw new Error('Cannot update running or queued tasks');
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...input,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
    };
  }

  async delete(id: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Delete executions first
    await prisma.taskExecution.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });
  }

  async execute(id: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
      include: { agent: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.agentId || !task.agent) {
      throw new Error('Task has no assigned agent');
    }

    if (task.agent.status !== 'ACTIVE') {
      throw new Error('Agent is not active');
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

    return {
      executionId: execution.id,
      taskId: task.id,
      status: 'QUEUED',
    };
  }

  async getExecutions(id: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id, createdById: userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const executions = await prisma.taskExecution.findMany({
      where: { taskId: id },
      include: {
        agent: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return executions.map((e) => ({
      id: e.id,
      agent: e.agent,
      status: e.status,
      exitCode: e.exitCode,
      error: e.error,
      tokensUsed: e.tokensUsed,
      durationMs: e.durationMs,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
    }));
  }

  async updateExecutionStatus(
    executionId: string,
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT',
    data?: { output?: string; error?: string; exitCode?: number; tokensUsed?: number; durationMs?: number }
  ) {
    const execution = await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status,
        ...data,
        completedAt: ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(status) ? new Date() : undefined,
      },
    });

    // Update task status based on execution status
    if (status === 'RUNNING') {
      await prisma.task.update({
        where: { id: execution.taskId },
        data: { status: 'RUNNING' },
      });
    } else if (status === 'COMPLETED') {
      await prisma.task.update({
        where: { id: execution.taskId },
        data: {
          status: 'COMPLETED',
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });
    } else if (status === 'FAILED' || status === 'TIMEOUT') {
      await prisma.task.update({
        where: { id: execution.taskId },
        data: {
          status: 'FAILED',
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });
    }

    return execution;
  }
}
