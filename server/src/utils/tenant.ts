/**
 * Multi-tenancy utilities
 *
 * Provides helpers for enforcing organization-based data isolation.
 */

import { prisma } from '../index.js';

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Extract tenant context from the request user
 */
export function getTenantContext(user: unknown): TenantContext {
  const u = user as {
    userId?: string;
    organizationId?: string;
    role?: string;
  };

  if (!u?.userId || !u?.organizationId) {
    throw new Error('Invalid user context: missing userId or organizationId');
  }

  return {
    userId: u.userId,
    organizationId: u.organizationId,
    role: u.role || 'USER',
  };
}

/**
 * Get all user IDs belonging to the same organization
 * Useful for querying resources that can be shared within an org
 */
export async function getOrganizationUserIds(organizationId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Get server IDs accessible to the organization
 * Servers are owned by users, but visible to all org members
 */
export async function getOrganizationServerIds(organizationId: string): Promise<string[]> {
  const userIds = await getOrganizationUserIds(organizationId);
  const servers = await prisma.serverConfiguration.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  return servers.map((s) => s.id);
}

/**
 * Check if a server belongs to the user's organization
 */
export async function serverBelongsToOrg(
  serverId: string,
  organizationId: string
): Promise<boolean> {
  const userIds = await getOrganizationUserIds(organizationId);
  const server = await prisma.serverConfiguration.findFirst({
    where: { id: serverId, userId: { in: userIds } },
    select: { id: true },
  });
  return !!server;
}

/**
 * Check if an agent belongs to the user's organization
 */
export async function agentBelongsToOrg(
  agentId: string,
  organizationId: string
): Promise<boolean> {
  const serverIds = await getOrganizationServerIds(organizationId);
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, serverId: { in: serverIds } },
    select: { id: true },
  });
  return !!agent;
}

/**
 * Check if a task belongs to the user's organization
 */
export async function taskBelongsToOrg(
  taskId: string,
  organizationId: string
): Promise<boolean> {
  const userIds = await getOrganizationUserIds(organizationId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, createdById: { in: userIds } },
    select: { id: true },
  });
  return !!task;
}

/**
 * Create a Prisma where clause for filtering by organization
 * Use this in findMany queries for resources owned by org users
 */
export function orgUserFilter(organizationId: string, userIds: string[]) {
  return { userId: { in: userIds } };
}

/**
 * Create a Prisma where clause for filtering servers by organization
 */
export function orgServerFilter(serverIds: string[]) {
  return { serverId: { in: serverIds } };
}
