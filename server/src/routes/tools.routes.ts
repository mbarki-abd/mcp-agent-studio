import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { getToolInstallationService } from '../services/tool-installation.service.js';
import { getTenantContext, getOrganizationUserIds, getOrganizationServerIds } from '../utils/tenant.js';
import { Prisma, ToolCategory } from '@prisma/client';
import {
  parsePagination,
  buildPaginatedResponse,
  calculateSkip,
  buildOrderBy,
  validateSortField,
} from '../utils/pagination.js';
import { getCacheService, CacheService } from '../services/cache.service.js';

// Allowed sort fields for tools
const TOOL_SORT_FIELDS = ['name', 'displayName', 'category'];

const installToolSchema = z.object({
  toolId: z.string().uuid(),
  agentPermissions: z.array(z.object({
    agentId: z.string().uuid(),
    canUse: z.boolean().default(true),
    canSudo: z.boolean().default(false),
    rateLimit: z.number().optional(),
  })).optional(),
  allowAllAgents: z.boolean().optional(),
});

const updatePermissionSchema = z.object({
  canUse: z.boolean().optional(),
  canSudo: z.boolean().optional(),
  rateLimit: z.number().nullable().optional(),
  allowedCommands: z.array(z.string()).optional(),
  blockedCommands: z.array(z.string()).optional(),
});

export async function toolRoutes(fastify: FastifyInstance) {
  // List all tool definitions
  fastify.get('/definitions', {
    schema: {
      tags: ['Tools'],
      description: 'List all available tool definitions',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', enum: TOOL_SORT_FIELDS },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          category: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const query = request.query as {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      category?: string;
      search?: string;
    };

    // Parse pagination
    const pagination = parsePagination(query);
    const validSortBy = validateSortField(pagination.sortBy, TOOL_SORT_FIELDS);

    // Build cache key from query parameters
    const cache = getCacheService();
    const cacheParams = JSON.stringify({
      page: pagination.page,
      limit: pagination.limit,
      sortBy: validSortBy,
      sortOrder: pagination.sortOrder,
      category: query.category,
      search: query.search,
    });
    const cacheKey = CacheService.keys.toolDefinitions(cacheParams);

    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      fastify.log.debug({ cacheKey }, 'Cache HIT - tool definitions');
      return cached;
    }

    // Cache miss - fetch from database
    fastify.log.debug({ cacheKey }, 'Cache MISS - tool definitions');

    // Build where clause
    const where: Prisma.ToolDefinitionWhereInput = {};
    if (query.category) {
      where.category = query.category as any;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.toolDefinition.count({ where });

    const tools = await prisma.toolDefinition.findMany({
      where,
      skip: calculateSkip(pagination.page, pagination.limit),
      take: pagination.limit,
      orderBy: buildOrderBy(validSortBy, pagination.sortOrder, 'name'),
    });

    const data = tools.map((t) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      website: t.website,
      documentation: t.documentation,
      icon: t.icon,
      tags: t.tags,
      requiresSudo: t.requiresSudo,
    }));

    const response = buildPaginatedResponse(data, total, pagination.page, pagination.limit);

    // Cache for 1 hour (3600 seconds) - tool definitions are relatively static
    await cache.set(cacheKey, response, 3600);

    return response;
  });

  // Get tools installed on a server (org visible)
  fastify.get('/servers/:serverId', {
    schema: {
      tags: ['Tools'],
      description: 'Get tools installed on a server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { serverId } = request.params as { serverId: string };

    // Verify server belongs to organization
    const orgUserIds = await getOrganizationUserIds(organizationId);
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const serverTools = await prisma.serverTool.findMany({
      where: { serverId },
      include: { tool: true },
    });

    return {
      tools: serverTools.map((st) => ({
        id: st.id,
        tool: {
          id: st.tool.id,
          name: st.tool.name,
          displayName: st.tool.displayName,
          category: st.tool.category,
        },
        status: st.status,
        installedVersion: st.installedVersion,
        installedAt: st.installedAt,
        healthStatus: st.healthStatus,
        lastHealthCheck: st.lastHealthCheck,
        lastError: st.lastError,
      })),
    };
  });

  // Install tool on server (server owner only)
  fastify.post('/servers/:serverId/install', {
    schema: {
      tags: ['Tools'],
      description: 'Install a tool on a server (server owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { serverId } = request.params as { serverId: string };
    const body = installToolSchema.parse(request.body);

    // Only server owner can install tools
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Check if tool exists
    const tool = await prisma.toolDefinition.findUnique({
      where: { id: body.toolId },
    });

    if (!tool) {
      return reply.status(404).send({ error: 'Tool not found' });
    }

    // Check if already installed
    const existing = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId, toolId: body.toolId } },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Tool already installed on this server' });
    }

    // Use ToolInstallationService to install
    const toolService = getToolInstallationService();
    const result = await toolService.installTool(serverId, body.toolId, userId);

    if (!result.success) {
      return reply.status(400).send({
        error: result.error || 'Installation failed',
        output: result.output,
      });
    }

    // Create agent permissions if specified
    if (result.serverToolId) {
      if (body.allowAllAgents) {
        const agents = await prisma.agent.findMany({
          where: { serverId },
          select: { id: true },
        });

        for (const agent of agents) {
          await toolService.grantPermission(agent.id, result.serverToolId, userId);
        }
      } else if (body.agentPermissions) {
        for (const perm of body.agentPermissions) {
          await toolService.grantPermission(perm.agentId, result.serverToolId, userId, {
            rateLimit: perm.rateLimit,
          });
        }
      }
    }

    return {
      id: result.serverToolId,
      toolName: tool.name,
      installedVersion: result.installedVersion,
      status: 'INSTALLED',
      message: 'Tool installed successfully',
    };
  });

  // Uninstall tool from server (server owner only)
  fastify.delete('/servers/:serverId/tools/:toolId', {
    schema: {
      tags: ['Tools'],
      description: 'Uninstall a tool from a server (server owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { serverId, toolId } = request.params as { serverId: string; toolId: string };

    // Only server owner can uninstall tools
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const serverTool = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId, toolId } },
    });

    if (!serverTool) {
      return reply.status(404).send({ error: 'Tool not installed on this server' });
    }

    // Use ToolInstallationService to uninstall
    const toolService = getToolInstallationService();
    const result = await toolService.uninstallTool(serverId, toolId);

    if (!result.success) {
      return reply.status(400).send({ error: result.error || 'Uninstallation failed' });
    }

    return { message: 'Tool uninstalled successfully' };
  });

  // Check tool health (org visible)
  fastify.post('/servers/:serverId/tools/:toolId/health', {
    schema: {
      tags: ['Tools'],
      description: 'Check tool health on server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { serverId, toolId } = request.params as { serverId: string; toolId: string };

    // Verify server belongs to organization
    const orgUserIds = await getOrganizationUserIds(organizationId);
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const serverTool = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId, toolId } },
      include: { tool: true },
    });

    if (!serverTool) {
      return reply.status(404).send({ error: 'Tool not installed on this server' });
    }

    // Execute health check via master agent
    try {
      const { getMasterAgentService } = await import('../services/master-agent.service.js');
      const masterService = await getMasterAgentService(serverId);

      // Use master agent to run health check via MCP client
      const healthCheckPrompt = `Check if the tool "${serverTool.tool.name}" is properly installed and working. Run: ${serverTool.tool.versionCommand || `which ${serverTool.tool.name}`}`;

      const result = await masterService.executePrompt(healthCheckPrompt);

      const healthStatus = result.success ? 'HEALTHY' : 'UNHEALTHY';
      const lastError = result.success ? null : (result.error || 'Health check failed');

      // Update health status in database
      await prisma.serverTool.update({
        where: { id: serverTool.id },
        data: {
          lastHealthCheck: new Date(),
          healthStatus,
          lastError,
        },
      });

      return {
        toolName: serverTool.tool.name,
        healthStatus,
        lastHealthCheck: new Date(),
        output: result.output,
        error: lastError,
      };
    } catch (error) {
      // Log error and mark as unhealthy
      fastify.log.error({ err: error, serverId, toolId }, 'Failed to run health check via master agent');

      // Update to unhealthy status
      await prisma.serverTool.update({
        where: { id: serverTool.id },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: 'UNHEALTHY',
          lastError: error instanceof Error ? error.message : 'Health check failed',
        },
      });

      return {
        toolName: serverTool.tool.name,
        healthStatus: 'UNHEALTHY',
        lastHealthCheck: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  });

  // Get agent tool permissions (org visible)
  fastify.get('/agents/:agentId/permissions', {
    schema: {
      tags: ['Tools'],
      description: 'Get tool permissions for an agent',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { agentId } = request.params as { agentId: string };

    // Get org's server IDs
    const serverIds = await getOrganizationServerIds(organizationId);

    // Verify agent belongs to organization
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const permissions = await prisma.agentToolPermission.findMany({
      where: { agentId },
      include: { tool: true },
    });

    return {
      permissions: permissions.map((p) => ({
        id: p.id,
        tool: {
          id: p.tool.id,
          name: p.tool.name,
          displayName: p.tool.displayName,
          category: p.tool.category,
        },
        canUse: p.canUse,
        canSudo: p.canSudo,
        rateLimit: p.rateLimit,
        allowedCommands: p.allowedCommands,
        blockedCommands: p.blockedCommands,
        grantedAt: p.grantedAt,
      })),
    };
  });

  // Update agent tool permission (server owner only)
  fastify.put('/agents/:agentId/permissions/:toolId', {
    schema: {
      tags: ['Tools'],
      description: 'Update tool permission for an agent (server owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { agentId, toolId } = request.params as { agentId: string; toolId: string };
    const body = updatePermissionSchema.parse(request.body);

    // Get user's servers (only owner can modify permissions)
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    // Verify agent belongs to one of user's servers
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // Upsert permission
    const permission = await prisma.agentToolPermission.upsert({
      where: { agentId_toolId: { agentId, toolId } },
      create: {
        agentId,
        toolId,
        canUse: body.canUse ?? true,
        canSudo: body.canSudo ?? false,
        rateLimit: body.rateLimit,
        allowedCommands: body.allowedCommands || [],
        blockedCommands: body.blockedCommands || [],
        grantedBy: userId,
      },
      update: {
        ...body,
      },
    });

    return {
      id: permission.id,
      canUse: permission.canUse,
      canSudo: permission.canSudo,
      rateLimit: permission.rateLimit,
    };
  });

  // Seed default tool definitions
  fastify.post('/seed', {
    schema: {
      tags: ['Tools'],
      description: 'Seed default tool definitions (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user as { role: string };

    if (role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin only' });
    }

    const defaultTools: Array<{
      name: string;
      displayName: string;
      category: ToolCategory;
      installCommand: string;
      versionCommand: string;
      description: string;
      requiresSudo?: boolean;
    }> = [
      { name: 'git', displayName: 'Git', category: 'VERSION_CONTROL', installCommand: 'apt-get install -y git', versionCommand: 'git --version', description: 'Distributed version control system' },
      { name: 'docker', displayName: 'Docker', category: 'CONTAINER', installCommand: 'curl -fsSL https://get.docker.com | sh', versionCommand: 'docker --version', description: 'Container runtime', requiresSudo: true },
      { name: 'node', displayName: 'Node.js', category: 'LANGUAGE_RUNTIME', installCommand: 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs', versionCommand: 'node --version', description: 'JavaScript runtime' },
      { name: 'python3', displayName: 'Python 3', category: 'LANGUAGE_RUNTIME', installCommand: 'apt-get install -y python3 python3-pip', versionCommand: 'python3 --version', description: 'Python interpreter' },
      { name: 'kubectl', displayName: 'kubectl', category: 'KUBERNETES', installCommand: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl', versionCommand: 'kubectl version --client', description: 'Kubernetes CLI' },
      { name: 'azure-cli', displayName: 'Azure CLI', category: 'CLOUD_CLI', installCommand: 'curl -sL https://aka.ms/InstallAzureCLIDeb | bash', versionCommand: 'az --version', description: 'Microsoft Azure CLI' },
      { name: 'gcloud', displayName: 'Google Cloud CLI', category: 'CLOUD_CLI', installCommand: 'apt-get install -y apt-transport-https ca-certificates gnupg && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && apt-get update && apt-get install -y google-cloud-cli', versionCommand: 'gcloud --version', description: 'Google Cloud CLI' },
      { name: 'aws-cli', displayName: 'AWS CLI', category: 'CLOUD_CLI', installCommand: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install', versionCommand: 'aws --version', description: 'Amazon Web Services CLI' },
      { name: 'terraform', displayName: 'Terraform', category: 'DEVOPS', installCommand: 'apt-get install -y gnupg software-properties-common && wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | tee /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && apt-get update && apt-get install -y terraform', versionCommand: 'terraform --version', description: 'Infrastructure as Code tool' },
      { name: 'helm', displayName: 'Helm', category: 'KUBERNETES', installCommand: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash', versionCommand: 'helm version', description: 'Kubernetes package manager' },
    ];

    for (const tool of defaultTools) {
      await prisma.toolDefinition.upsert({
        where: { name: tool.name },
        create: {
          ...tool,
          category: tool.category,
          requiresSudo: tool.requiresSudo ?? true,
          dependencies: [],
          tags: [],
        },
        update: {},
      });
    }

    // Invalidate tool definitions cache
    const cache = getCacheService();
    await cache.invalidate(CacheService.keys.toolDefinitionsPattern());

    return { message: `Seeded ${defaultTools.length} tool definitions` };
  });
}
