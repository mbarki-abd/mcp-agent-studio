import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../index.js';
import { getTaskExecutionService } from '../../services/task-execution.service.js';
import { getTenantContext } from '../../utils/tenant.js';

export async function taskBulkRoutes(fastify: FastifyInstance) {
  // Bulk cancel tasks
  fastify.post('/cancel', {
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
  fastify.post('/delete', {
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
  fastify.post('/status', {
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
  fastify.post('/execute', {
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
  fastify.post('/retry', {
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
}
