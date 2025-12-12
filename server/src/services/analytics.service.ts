// ============================================
// Analytics Service - Metrics & Reporting
// ============================================

import { prisma } from '../index.js';
import { getOrganizationServerIds, getOrganizationUserIds } from '../utils/tenant.js';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  successRate: number;
  averageDuration: number;
  totalTokensUsed: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  taskTrend: TimeSeriesPoint[];
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  agentsByRole: Record<string, number>;
  agentsByStatus: Record<string, number>;
  topPerformingAgents: Array<{
    id: string;
    name: string;
    displayName: string;
    completedTasks: number;
    successRate: number;
    avgDuration: number;
  }>;
  agentActivityTrend: TimeSeriesPoint[];
}

export interface ServerAnalytics {
  totalServers: number;
  onlineServers: number;
  serversByStatus: Record<string, number>;
  serverUptime: Array<{
    id: string;
    name: string;
    uptimePercentage: number;
    lastCheck: Date | null;
  }>;
  toolsInstalled: number;
  toolsByCategory: Record<string, number>;
}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  averageDurationMs: number;
  totalTokensConsumed: number;
  executionsByDay: TimeSeriesPoint[];
  executionsByHour: Array<{ hour: number; count: number }>;
  peakHours: number[];
}

export interface OverviewAnalytics {
  tasks: TaskAnalytics;
  agents: AgentAnalytics;
  servers: ServerAnalytics;
  executions: ExecutionAnalytics;
  period: { start: Date; end: Date };
}

class AnalyticsService {
  // Get comprehensive analytics for an organization
  async getOverview(
    organizationId: string,
    periodDays: number = 30
  ): Promise<OverviewAnalytics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [tasks, agents, servers, executions] = await Promise.all([
      this.getTaskAnalytics(organizationId, startDate, endDate),
      this.getAgentAnalytics(organizationId, startDate, endDate),
      this.getServerAnalytics(organizationId),
      this.getExecutionAnalytics(organizationId, startDate, endDate),
    ]);

    return {
      tasks,
      agents,
      servers,
      executions,
      period: { start: startDate, end: endDate },
    };
  }

  // Task Analytics
  async getTaskAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TaskAnalytics> {
    const userIds = await getOrganizationUserIds(organizationId);

    const whereClause = {
      createdById: { in: userIds },
      createdAt: { gte: startDate, lte: endDate },
    };

    // Get task counts by status
    const [
      totalTasks,
      completedTasks,
      failedTasks,
      cancelledTasks,
      statusGroups,
      priorityGroups,
      executionStats,
    ] = await Promise.all([
      prisma.task.count({ where: whereClause }),
      prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...whereClause, status: 'FAILED' } }),
      prisma.task.count({ where: { ...whereClause, status: 'CANCELLED' } }),
      prisma.task.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: true,
      }),
      prisma.taskExecution.aggregate({
        where: {
          task: { createdById: { in: userIds } },
          startedAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _avg: { durationMs: true },
        _sum: { tokensUsed: true },
      }),
    ]);

    // Build status and priority maps
    const tasksByStatus: Record<string, number> = {};
    statusGroups.forEach(g => { tasksByStatus[g.status] = g._count; });

    const tasksByPriority: Record<string, number> = {};
    priorityGroups.forEach(g => { tasksByPriority[g.priority] = g._count; });

    // Get task trend (daily)
    const taskTrend = await this.getTaskTrend(userIds, startDate, endDate);

    const successRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      cancelledTasks,
      successRate,
      averageDuration: Math.round(executionStats._avg.durationMs || 0),
      totalTokensUsed: executionStats._sum.tokensUsed || 0,
      tasksByStatus,
      tasksByPriority,
      taskTrend,
    };
  }

  // Agent Analytics
  async getAgentAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AgentAnalytics> {
    const serverIds = await getOrganizationServerIds(organizationId);

    const whereClause = { serverId: { in: serverIds } };

    const [
      totalAgents,
      activeAgents,
      roleGroups,
      statusGroups,
      topAgents,
    ] = await Promise.all([
      prisma.agent.count({ where: whereClause }),
      prisma.agent.count({ where: { ...whereClause, status: 'ACTIVE' } }),
      prisma.agent.groupBy({
        by: ['role'],
        where: whereClause,
        _count: true,
      }),
      prisma.agent.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      this.getTopPerformingAgents(serverIds, startDate, endDate),
    ]);

    const agentsByRole: Record<string, number> = {};
    roleGroups.forEach(g => { agentsByRole[g.role] = g._count; });

    const agentsByStatus: Record<string, number> = {};
    statusGroups.forEach(g => { agentsByStatus[g.status] = g._count; });

    // Get agent activity trend
    const agentActivityTrend = await this.getAgentActivityTrend(serverIds, startDate, endDate);

    return {
      totalAgents,
      activeAgents,
      agentsByRole,
      agentsByStatus,
      topPerformingAgents: topAgents,
      agentActivityTrend,
    };
  }

  // Server Analytics
  async getServerAnalytics(organizationId: string): Promise<ServerAnalytics> {
    const serverIds = await getOrganizationServerIds(organizationId);

    const [
      totalServers,
      onlineServers,
      statusGroups,
      servers,
      toolStats,
    ] = await Promise.all([
      prisma.serverConfiguration.count({ where: { id: { in: serverIds } } }),
      prisma.serverConfiguration.count({ where: { id: { in: serverIds }, status: 'ONLINE' } }),
      prisma.serverConfiguration.groupBy({
        by: ['status'],
        where: { id: { in: serverIds } },
        _count: true,
      }),
      prisma.serverConfiguration.findMany({
        where: { id: { in: serverIds } },
        select: {
          id: true,
          name: true,
          status: true,
          lastHealthCheck: true,
          createdAt: true,
        },
      }),
      this.getToolStats(serverIds),
    ]);

    const serversByStatus: Record<string, number> = {};
    statusGroups.forEach(g => { serversByStatus[g.status] = g._count; });

    // Calculate uptime (simplified - based on current status)
    const serverUptime = servers.map(s => ({
      id: s.id,
      name: s.name,
      uptimePercentage: s.status === 'ONLINE' ? 99.9 : s.status === 'DEGRADED' ? 80 : 0,
      lastCheck: s.lastHealthCheck,
    }));

    return {
      totalServers,
      onlineServers,
      serversByStatus,
      serverUptime,
      toolsInstalled: toolStats.total,
      toolsByCategory: toolStats.byCategory,
    };
  }

  // Execution Analytics
  async getExecutionAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExecutionAnalytics> {
    const userIds = await getOrganizationUserIds(organizationId);

    const whereClause = {
      task: { createdById: { in: userIds } },
      startedAt: { gte: startDate, lte: endDate },
    };

    const [
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      timeoutExecutions,
      stats,
      dailyExecutions,
      hourlyExecutions,
    ] = await Promise.all([
      prisma.taskExecution.count({ where: whereClause }),
      prisma.taskExecution.count({ where: { ...whereClause, status: 'COMPLETED' } }),
      prisma.taskExecution.count({ where: { ...whereClause, status: 'FAILED' } }),
      prisma.taskExecution.count({ where: { ...whereClause, status: 'TIMEOUT' } }),
      prisma.taskExecution.aggregate({
        where: whereClause,
        _avg: { durationMs: true },
        _sum: { tokensUsed: true },
      }),
      this.getExecutionsByDay(userIds, startDate, endDate),
      this.getExecutionsByHour(userIds, startDate, endDate),
    ]);

    // Find peak hours (top 3)
    const sortedHours = [...hourlyExecutions].sort((a, b) => b.count - a.count);
    const peakHours = sortedHours.slice(0, 3).map(h => h.hour);

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      timeoutExecutions,
      averageDurationMs: Math.round(stats._avg.durationMs || 0),
      totalTokensConsumed: stats._sum.tokensUsed || 0,
      executionsByDay: dailyExecutions,
      executionsByHour: hourlyExecutions,
      peakHours,
    };
  }

  // Helper: Get task trend by day
  private async getTaskTrend(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesPoint[]> {
    const tasks = await prisma.task.findMany({
      where: {
        createdById: { in: userIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    tasks.forEach(t => {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    // Fill in missing dates
    const result: TimeSeriesPoint[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        value: dateMap.get(dateKey) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // Helper: Get top performing agents
  private async getTopPerformingAgents(
    serverIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<AgentAnalytics['topPerformingAgents']> {
    const agents = await prisma.agent.findMany({
      where: { serverId: { in: serverIds } },
      include: {
        executions: {
          where: {
            startedAt: { gte: startDate, lte: endDate },
          },
          select: {
            status: true,
            durationMs: true,
          },
        },
      },
    });

    return agents
      .map(agent => {
        const total = agent.executions.length;
        const completed = agent.executions.filter(e => e.status === 'COMPLETED').length;
        const durations = agent.executions
          .filter(e => e.durationMs)
          .map(e => e.durationMs!);
        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

        return {
          id: agent.id,
          name: agent.name,
          displayName: agent.displayName,
          completedTasks: completed,
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgDuration,
        };
      })
      .filter(a => a.completedTasks > 0)
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 10);
  }

  // Helper: Get agent activity trend
  private async getAgentActivityTrend(
    serverIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesPoint[]> {
    const executions = await prisma.taskExecution.findMany({
      where: {
        agent: { serverId: { in: serverIds } },
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true },
    });

    const dateMap = new Map<string, number>();
    executions.forEach(e => {
      const dateKey = e.startedAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    const result: TimeSeriesPoint[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        value: dateMap.get(dateKey) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // Helper: Get tool stats
  private async getToolStats(serverIds: string[]): Promise<{
    total: number;
    byCategory: Record<string, number>;
  }> {
    const tools = await prisma.serverTool.findMany({
      where: {
        serverId: { in: serverIds },
        status: 'INSTALLED',
      },
      include: {
        tool: { select: { category: true } },
      },
    });

    const byCategory: Record<string, number> = {};
    tools.forEach(t => {
      const cat = t.tool.category;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return { total: tools.length, byCategory };
  }

  // Helper: Get executions by day
  private async getExecutionsByDay(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesPoint[]> {
    const executions = await prisma.taskExecution.findMany({
      where: {
        task: { createdById: { in: userIds } },
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true },
    });

    const dateMap = new Map<string, number>();
    executions.forEach(e => {
      const dateKey = e.startedAt.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    const result: TimeSeriesPoint[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        value: dateMap.get(dateKey) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // Helper: Get executions by hour
  private async getExecutionsByHour(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ hour: number; count: number }>> {
    const executions = await prisma.taskExecution.findMany({
      where: {
        task: { createdById: { in: userIds } },
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true },
    });

    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, 0);
    }

    executions.forEach(e => {
      const hour = e.startedAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));
  }
}

export const analyticsService = new AnalyticsService();
