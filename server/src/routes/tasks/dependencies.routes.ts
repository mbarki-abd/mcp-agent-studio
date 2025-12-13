import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../index.js';
import { getTenantContext, getOrganizationUserIds } from '../../utils/tenant.js';

export async function taskDependenciesRoutes(fastify: FastifyInstance) {
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
