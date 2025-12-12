// ============================================
// Billing Service - Stripe Integration
// ============================================

import { prisma } from '../index.js';
import type { Plan } from '@prisma/client';

// Plan configurations with Stripe Price IDs (to be configured in production)
export const PLAN_CONFIG: Record<Plan, {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  limits: {
    maxUsers: number;
    maxServers: number;
    maxAgents: number;
    maxTasksPerMonth: number;
  };
  features: string[];
}> = {
  FREE: {
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      maxUsers: 5,
      maxServers: 2,
      maxAgents: 10,
      maxTasksPerMonth: 1000,
    },
    features: [
      'Up to 5 users',
      'Up to 2 MCP servers',
      'Up to 10 agents',
      '1,000 tasks/month',
      'Basic monitoring',
      'Community support',
    ],
  },
  STARTER: {
    name: 'Starter',
    priceMonthly: 29,
    priceYearly: 290,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    limits: {
      maxUsers: 10,
      maxServers: 5,
      maxAgents: 25,
      maxTasksPerMonth: 5000,
    },
    features: [
      'Up to 10 users',
      'Up to 5 MCP servers',
      'Up to 25 agents',
      '5,000 tasks/month',
      'Advanced monitoring',
      'Email support',
      'API access',
      'Webhook integrations',
    ],
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 990,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    limits: {
      maxUsers: 50,
      maxServers: 20,
      maxAgents: 100,
      maxTasksPerMonth: 25000,
    },
    features: [
      'Up to 50 users',
      'Up to 20 MCP servers',
      'Up to 100 agents',
      '25,000 tasks/month',
      'Real-time monitoring',
      'Priority support',
      'Custom integrations',
      'Audit logs',
      'Advanced analytics',
      'Role-based access control',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceMonthly: -1, // Contact sales
    priceYearly: -1,
    limits: {
      maxUsers: -1, // Unlimited
      maxServers: -1,
      maxAgents: -1,
      maxTasksPerMonth: -1,
    },
    features: [
      'Unlimited users',
      'Unlimited MCP servers',
      'Unlimited agents',
      'Unlimited tasks',
      'Dedicated support',
      'SLA guarantee',
      'Custom deployment',
      'SSO/SAML',
      'Custom contracts',
      'Dedicated account manager',
    ],
  },
};

export interface BillingInfo {
  organizationId: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export interface UpgradePreview {
  currentPlan: Plan;
  newPlan: Plan;
  proratedAmount: number;
  newMonthlyAmount: number;
  effectiveDate: Date;
}

export interface UsageReport {
  organizationId: string;
  period: { start: Date; end: Date };
  usage: {
    users: { current: number; limit: number; percentage: number };
    servers: { current: number; limit: number; percentage: number };
    agents: { current: number; limit: number; percentage: number };
    tasks: { current: number; limit: number; percentage: number };
  };
  overage: boolean;
  overageDetails: string[];
}

class BillingService {
  // Get billing info for organization
  async getBillingInfo(organizationId: string): Promise<BillingInfo | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        plan: true,
        settings: true,
      },
    });

    if (!org) return null;

    const settings = org.settings as Record<string, unknown> || {};

    return {
      organizationId: org.id,
      plan: org.plan,
      stripeCustomerId: settings.stripeCustomerId as string | undefined,
      stripeSubscriptionId: settings.stripeSubscriptionId as string | undefined,
      billingCycle: (settings.billingCycle as 'monthly' | 'yearly') || 'monthly',
      currentPeriodStart: settings.currentPeriodStart ? new Date(settings.currentPeriodStart as string) : undefined,
      currentPeriodEnd: settings.currentPeriodEnd ? new Date(settings.currentPeriodEnd as string) : undefined,
      cancelAtPeriodEnd: (settings.cancelAtPeriodEnd as boolean) || false,
    };
  }

  // Preview upgrade/downgrade
  async previewPlanChange(organizationId: string, newPlan: Plan): Promise<UpgradePreview> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const currentConfig = PLAN_CONFIG[org.plan];
    const newConfig = PLAN_CONFIG[newPlan];

    // Calculate prorated amount (simplified - real implementation would use Stripe)
    const daysInMonth = 30;
    const today = new Date();
    const daysRemaining = daysInMonth - today.getDate();
    const dailyRate = (newConfig.priceMonthly - currentConfig.priceMonthly) / daysInMonth;
    const proratedAmount = Math.max(0, dailyRate * daysRemaining);

    return {
      currentPlan: org.plan,
      newPlan,
      proratedAmount: Math.round(proratedAmount * 100) / 100,
      newMonthlyAmount: newConfig.priceMonthly,
      effectiveDate: new Date(),
    };
  }

  // Change plan (simplified - real implementation would use Stripe API)
  async changePlan(organizationId: string, newPlan: Plan): Promise<{ success: boolean; message: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if downgrade is possible (current usage must fit new limits)
    if (this.isPlanDowngrade(org.plan, newPlan)) {
      const usageReport = await this.getUsageReport(organizationId);
      if (usageReport.overage) {
        throw new Error(`Cannot downgrade: ${usageReport.overageDetails.join(', ')}`);
      }
    }

    const newConfig = PLAN_CONFIG[newPlan];

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: newPlan,
        maxUsers: newConfig.limits.maxUsers === -1 ? 999999 : newConfig.limits.maxUsers,
        maxServers: newConfig.limits.maxServers === -1 ? 999999 : newConfig.limits.maxServers,
        maxAgents: newConfig.limits.maxAgents === -1 ? 999999 : newConfig.limits.maxAgents,
        maxTasksPerMonth: newConfig.limits.maxTasksPerMonth === -1 ? 999999 : newConfig.limits.maxTasksPerMonth,
      },
    });

    return {
      success: true,
      message: `Plan changed to ${newConfig.name}`,
    };
  }

  // Get usage report
  async getUsageReport(organizationId: string): Promise<UsageReport> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get server IDs for this org
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);

    const servers = await prisma.serverConfiguration.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const serverIds = servers.map(s => s.id);

    // Current month boundaries
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Count resources
    const [agentCount, taskCount] = await Promise.all([
      prisma.agent.count({ where: { serverId: { in: serverIds } } }),
      prisma.task.count({
        where: {
          createdById: { in: userIds },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    const usage = {
      users: {
        current: org._count.users,
        limit: org.maxUsers,
        percentage: org.maxUsers > 0 ? Math.round((org._count.users / org.maxUsers) * 100) : 0,
      },
      servers: {
        current: serverIds.length,
        limit: org.maxServers,
        percentage: org.maxServers > 0 ? Math.round((serverIds.length / org.maxServers) * 100) : 0,
      },
      agents: {
        current: agentCount,
        limit: org.maxAgents,
        percentage: org.maxAgents > 0 ? Math.round((agentCount / org.maxAgents) * 100) : 0,
      },
      tasks: {
        current: taskCount,
        limit: org.maxTasksPerMonth,
        percentage: org.maxTasksPerMonth > 0 ? Math.round((taskCount / org.maxTasksPerMonth) * 100) : 0,
      },
    };

    // Check for overage
    const overageDetails: string[] = [];
    if (usage.users.percentage >= 100) overageDetails.push(`Users: ${usage.users.current}/${usage.users.limit}`);
    if (usage.servers.percentage >= 100) overageDetails.push(`Servers: ${usage.servers.current}/${usage.servers.limit}`);
    if (usage.agents.percentage >= 100) overageDetails.push(`Agents: ${usage.agents.current}/${usage.agents.limit}`);
    if (usage.tasks.percentage >= 100) overageDetails.push(`Tasks: ${usage.tasks.current}/${usage.tasks.limit}`);

    return {
      organizationId,
      period: { start: startOfMonth, end: endOfMonth },
      usage,
      overage: overageDetails.length > 0,
      overageDetails,
    };
  }

  // Check if user can perform action based on quota
  async checkQuota(
    organizationId: string,
    resource: 'users' | 'servers' | 'agents' | 'tasks'
  ): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
    const report = await this.getUsageReport(organizationId);
    const usage = report.usage[resource];

    if (usage.limit === -1) {
      return { allowed: true, current: usage.current, limit: -1 };
    }

    const allowed = usage.current < usage.limit;
    return {
      allowed,
      current: usage.current,
      limit: usage.limit,
      message: allowed ? undefined : `${resource} limit reached (${usage.current}/${usage.limit}). Upgrade your plan.`,
    };
  }

  // Get all available plans
  getPlans() {
    return Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      id: key as Plan,
      ...config,
    }));
  }

  // Helper: Check if plan change is a downgrade
  private isPlanDowngrade(currentPlan: Plan, newPlan: Plan): boolean {
    const planOrder: Plan[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    return planOrder.indexOf(newPlan) < planOrder.indexOf(currentPlan);
  }
}

export const billingService = new BillingService();
