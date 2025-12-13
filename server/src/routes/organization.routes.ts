import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { getTenantContext, getOrganizationServerIds, getOrganizationUserIds } from '../utils/tenant.js';
import { emailService } from '../services/email.service.js';

const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  billingEmail: z.string().email().optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
});

const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER', 'USER']).optional().default('USER'),
});

export async function organizationRoutes(fastify: FastifyInstance) {
  // Get current organization details
  fastify.get('/', {
    schema: {
      tags: ['Organization'],
      description: 'Get current organization details',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { users: true, invitations: { where: { acceptedAt: null } } },
        },
      },
    });

    if (!org) {
      return { error: 'Organization not found' };
    }

    // Get usage stats
    const [serverIds, userIds] = await Promise.all([
      getOrganizationServerIds(organizationId),
      getOrganizationUserIds(organizationId),
    ]);

    const [serverCount, agentCount, taskCount] = await Promise.all([
      Promise.resolve(serverIds.length),
      prisma.agent.count({ where: { serverId: { in: serverIds } } }),
      prisma.task.count({
        where: {
          createdById: { in: userIds },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logoUrl: org.logoUrl,
      website: org.website,
      plan: org.plan,
      settings: org.settings,
      limits: {
        maxUsers: org.maxUsers,
        maxServers: org.maxServers,
        maxAgents: org.maxAgents,
        maxTasksPerMonth: org.maxTasksPerMonth,
      },
      usage: {
        users: org._count.users,
        servers: serverCount,
        agents: agentCount,
        tasksThisMonth: taskCount,
      },
      pendingInvitations: org._count.invitations,
      billing: {
        email: org.billingEmail,
        address: org.billingAddress,
      },
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  });

  // Update organization (admin only)
  fastify.patch('/', {
    schema: {
      tags: ['Organization'],
      description: 'Update organization details (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const body = updateOrganizationSchema.parse(request.body);

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: body,
    });

    return {
      id: org.id,
      name: org.name,
      description: org.description,
      logoUrl: org.logoUrl,
      website: org.website,
      billingEmail: org.billingEmail,
      billingAddress: org.billingAddress,
      updatedAt: org.updatedAt,
    };
  });

  // Update organization settings (admin only)
  fastify.patch('/settings', {
    schema: {
      tags: ['Organization'],
      description: 'Update organization settings (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const body = updateSettingsSchema.parse(request.body);

    // Merge with existing settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, ...body.settings } as Prisma.InputJsonValue;

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: newSettings },
    });

    return {
      settings: updated.settings,
      updatedAt: updated.updatedAt,
    };
  });

  // Get organization members
  fastify.get('/members', {
    schema: {
      tags: ['Organization'],
      description: 'Get organization members',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const members = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      members,
      total: members.length,
    };
  });

  // Update member role (admin only)
  fastify.patch('/members/:memberId/role', {
    schema: {
      tags: ['Organization'],
      description: 'Update member role (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { memberId } = request.params as { memberId: string };
    const body = z.object({
      role: z.enum(['ADMIN', 'MANAGER', 'VIEWER', 'USER']),
    }).parse(request.body);

    // Check member exists in org
    const member = await prisma.user.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    // Prevent self-demotion for last admin
    if (memberId === userId && body.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { organizationId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return reply.status(400).send({
          error: 'Cannot demote the last admin',
          hint: 'Promote another user to admin first',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      member: updated,
      message: `Role updated to ${body.role}`,
    };
  });

  // Remove member (admin only)
  fastify.delete('/members/:memberId', {
    schema: {
      tags: ['Organization'],
      description: 'Remove member from organization (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { memberId } = request.params as { memberId: string };

    // Prevent self-removal
    if (memberId === userId) {
      return reply.status(400).send({
        error: 'Cannot remove yourself',
        hint: 'Transfer ownership first or ask another admin',
      });
    }

    // Check member exists in org
    const member = await prisma.user.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    // Delete user's sessions first
    await prisma.session.deleteMany({ where: { userId: memberId } });

    // Delete user
    await prisma.user.delete({ where: { id: memberId } });

    return {
      message: 'Member removed successfully',
      removedEmail: member.email,
    };
  });

  // ========================================
  // INVITATIONS
  // ========================================

  // Invite user (admin/manager only)
  fastify.post('/invitations', {
    schema: {
      tags: ['Organization'],
      description: 'Invite a user to the organization',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('MANAGER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const body = inviteUserSchema.parse(request.body);

    // Check org limits
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { _count: { select: { users: true } } },
    });

    if (!org) {
      return reply.status(404).send({ error: 'Organization not found' });
    }

    if (org._count.users >= org.maxUsers) {
      return reply.status(400).send({
        error: 'User limit reached',
        limit: org.maxUsers,
        current: org._count.users,
        hint: 'Upgrade your plan to add more users',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      if (existingUser.organizationId === organizationId) {
        return reply.status(400).send({ error: 'User is already a member' });
      }
      return reply.status(400).send({
        error: 'User already belongs to another organization',
      });
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.organizationInvitation.findUnique({
      where: {
        organizationId_email: { organizationId, email: body.email },
      },
    });

    // Get inviter and organization details for email
    const [inviter, organization] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
      prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    ]);

    if (!inviter || !organization) {
      return reply.status(500).send({ error: 'Failed to retrieve organization details' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (existingInvitation && !existingInvitation.acceptedAt) {
      // Update existing invitation
      const token = crypto.randomBytes(32).toString('hex');
      const updated = await prisma.organizationInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          token,
          role: body.role,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          invitedById: userId,
        },
      });

      // Send invitation email
      const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;
      await emailService.sendInvitation(
        updated.email,
        organization.name,
        inviter.name || inviter.email,
        acceptUrl
      );

      return {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        expiresAt: updated.expiresAt,
        message: 'Invitation resent',
      };
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: body.email,
        role: body.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedById: userId,
      },
    });

    // Send invitation email
    const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;
    await emailService.sendInvitation(
      invitation.email,
      organization.name,
      inviter.name || inviter.email,
      acceptUrl
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      message: 'Invitation sent',
    };
  });

  // List pending invitations
  fastify.get('/invitations', {
    schema: {
      tags: ['Organization'],
      description: 'List pending invitations',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      invitations,
      total: invitations.length,
    };
  });

  // Cancel invitation (admin/manager only)
  fastify.delete('/invitations/:invitationId', {
    schema: {
      tags: ['Organization'],
      description: 'Cancel a pending invitation',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('MANAGER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { invitationId } = request.params as { invitationId: string };

    const invitation = await prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId, acceptedAt: null },
    });

    if (!invitation) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    await prisma.organizationInvitation.delete({
      where: { id: invitationId },
    });

    return {
      message: 'Invitation cancelled',
      email: invitation.email,
    };
  });

  // Get organization usage and limits
  fastify.get('/usage', {
    schema: {
      tags: ['Organization'],
      description: 'Get detailed usage statistics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { error: 'Organization not found' };
    }

    const [serverIds, userIds] = await Promise.all([
      getOrganizationServerIds(organizationId),
      getOrganizationUserIds(organizationId),
    ]);

    // Current month boundaries
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Get detailed usage
    const [
      userCount,
      serverCount,
      agentCount,
      taskCount,
      executionCount,
      tokenUsage,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      Promise.resolve(serverIds.length),
      prisma.agent.count({ where: { serverId: { in: serverIds } } }),
      prisma.task.count({
        where: {
          createdById: { in: userIds },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.taskExecution.count({
        where: {
          task: { createdById: { in: userIds } },
          startedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.taskExecution.aggregate({
        where: {
          task: { createdById: { in: userIds } },
          startedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { tokensUsed: true },
      }),
    ]);

    return {
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      },
      usage: {
        users: {
          current: userCount,
          limit: org.maxUsers,
          percentage: Math.round((userCount / org.maxUsers) * 100),
        },
        servers: {
          current: serverCount,
          limit: org.maxServers,
          percentage: Math.round((serverCount / org.maxServers) * 100),
        },
        agents: {
          current: agentCount,
          limit: org.maxAgents,
          percentage: Math.round((agentCount / org.maxAgents) * 100),
        },
        tasks: {
          current: taskCount,
          limit: org.maxTasksPerMonth,
          percentage: Math.round((taskCount / org.maxTasksPerMonth) * 100),
        },
      },
      metrics: {
        executions: executionCount,
        tokensUsed: tokenUsage._sum.tokensUsed || 0,
      },
      plan: org.plan,
    };
  });

  // Get plan limits comparison
  fastify.get('/plans', {
    schema: {
      tags: ['Organization'],
      description: 'Get available plans and their limits',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plans = {
      FREE: {
        name: 'Free',
        maxUsers: 5,
        maxServers: 2,
        maxAgents: 10,
        maxTasksPerMonth: 1000,
        features: ['Basic monitoring', 'Community support'],
        price: 0,
      },
      STARTER: {
        name: 'Starter',
        maxUsers: 10,
        maxServers: 5,
        maxAgents: 25,
        maxTasksPerMonth: 5000,
        features: ['Advanced monitoring', 'Email support', 'API access'],
        price: 29,
      },
      PRO: {
        name: 'Pro',
        maxUsers: 50,
        maxServers: 20,
        maxAgents: 100,
        maxTasksPerMonth: 25000,
        features: ['Real-time monitoring', 'Priority support', 'Custom integrations', 'Audit logs'],
        price: 99,
      },
      ENTERPRISE: {
        name: 'Enterprise',
        maxUsers: -1, // Unlimited
        maxServers: -1,
        maxAgents: -1,
        maxTasksPerMonth: -1,
        features: ['Unlimited everything', 'Dedicated support', 'SLA', 'Custom deployment', 'SSO'],
        price: -1, // Contact sales
      },
    };

    return {
      currentPlan: org?.plan || 'FREE',
      plans,
    };
  });
}
