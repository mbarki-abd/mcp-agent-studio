import { prisma } from '../index.js';
import type { ToolCategory, ToolStatus, HealthStatus } from '@prisma/client';

export interface InstallToolInput {
  serverId: string;
  toolId: string;
  userId: string;
  agentPermissions?: {
    agentId: string;
    canUse: boolean;
    canSudo: boolean;
    rateLimit?: number;
  }[];
  allowAllAgents?: boolean;
}

export interface UpdatePermissionInput {
  canUse?: boolean;
  canSudo?: boolean;
  rateLimit?: number | null;
  allowedCommands?: string[];
  blockedCommands?: string[];
}

export class ToolsService {
  async listDefinitions(category?: string) {
    const tools = await prisma.toolDefinition.findMany({
      where: category ? { category: category as ToolCategory } : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return tools.map((t) => ({
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
  }

  async getServerTools(serverId: string, userId: string) {
    // Verify server belongs to user
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const serverTools = await prisma.serverTool.findMany({
      where: { serverId },
      include: { tool: true },
    });

    return serverTools.map((st) => ({
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
    }));
  }

  async installTool(input: InstallToolInput) {
    // Verify server belongs to user
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: input.serverId, userId: input.userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Check if tool exists
    const tool = await prisma.toolDefinition.findUnique({
      where: { id: input.toolId },
    });

    if (!tool) {
      throw new Error('Tool not found');
    }

    // Check if already installed
    const existing = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId: input.serverId, toolId: input.toolId } },
    });

    if (existing) {
      throw new Error('Tool already installed on this server');
    }

    // Create server tool record
    const serverTool = await prisma.serverTool.create({
      data: {
        serverId: input.serverId,
        toolId: input.toolId,
        status: 'INSTALLING',
        installedBy: input.userId,
      },
    });

    // Create agent permissions if specified
    if (input.allowAllAgents) {
      // Get all agents on this server
      const agents = await prisma.agent.findMany({
        where: { serverId: input.serverId },
        select: { id: true },
      });

      if (agents.length > 0) {
        await prisma.agentToolPermission.createMany({
          data: agents.map((a) => ({
            agentId: a.id,
            toolId: input.toolId,
            canUse: true,
            canSudo: false,
            grantedBy: input.userId,
          })),
        });
      }
    } else if (input.agentPermissions && input.agentPermissions.length > 0) {
      await prisma.agentToolPermission.createMany({
        data: input.agentPermissions.map((p) => ({
          agentId: p.agentId,
          toolId: input.toolId,
          canUse: p.canUse,
          canSudo: p.canSudo,
          rateLimit: p.rateLimit,
          grantedBy: input.userId,
        })),
      });
    }

    return {
      id: serverTool.id,
      toolName: tool.name,
      status: 'INSTALLING',
    };
  }

  async uninstallTool(serverId: string, toolId: string, userId: string) {
    // Verify server belongs to user
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const serverTool = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId, toolId } },
    });

    if (!serverTool) {
      throw new Error('Tool not installed on this server');
    }

    // Delete agent permissions
    await prisma.agentToolPermission.deleteMany({
      where: {
        toolId,
        agent: { serverId },
      },
    });

    // Delete server tool
    await prisma.serverTool.delete({
      where: { id: serverTool.id },
    });
  }

  async checkToolHealth(serverId: string, toolId: string, userId: string) {
    // Verify server belongs to user
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const serverTool = await prisma.serverTool.findUnique({
      where: { serverId_toolId: { serverId, toolId } },
      include: { tool: true },
    });

    if (!serverTool) {
      throw new Error('Tool not installed on this server');
    }

    // TODO: Execute health check via master agent
    // For now, just update the timestamp
    await prisma.serverTool.update({
      where: { id: serverTool.id },
      data: {
        lastHealthCheck: new Date(),
        healthStatus: 'HEALTHY',
      },
    });

    return {
      toolName: serverTool.tool.name,
      healthStatus: 'HEALTHY' as HealthStatus,
      lastHealthCheck: new Date(),
    };
  }

  async getAgentPermissions(agentId: string, userId: string) {
    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const permissions = await prisma.agentToolPermission.findMany({
      where: { agentId },
      include: { tool: true },
    });

    return permissions.map((p) => ({
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
    }));
  }

  async updateAgentPermission(agentId: string, toolId: string, userId: string, input: UpdatePermissionInput) {
    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Upsert permission
    const permission = await prisma.agentToolPermission.upsert({
      where: { agentId_toolId: { agentId, toolId } },
      create: {
        agentId,
        toolId,
        canUse: input.canUse ?? true,
        canSudo: input.canSudo ?? false,
        rateLimit: input.rateLimit,
        allowedCommands: input.allowedCommands || [],
        blockedCommands: input.blockedCommands || [],
        grantedBy: userId,
      },
      update: input,
    });

    return {
      id: permission.id,
      canUse: permission.canUse,
      canSudo: permission.canSudo,
      rateLimit: permission.rateLimit,
    };
  }

  async updateToolStatus(serverToolId: string, status: ToolStatus, data?: { installedVersion?: string; lastError?: string }) {
    return prisma.serverTool.update({
      where: { id: serverToolId },
      data: {
        status,
        ...data,
        installedAt: status === 'INSTALLED' ? new Date() : undefined,
      },
    });
  }

  async seedDefaultTools() {
    const defaultTools = [
      { name: 'git', displayName: 'Git', category: 'VERSION_CONTROL' as ToolCategory, installCommand: 'apt-get install -y git', versionCommand: 'git --version', description: 'Distributed version control system' },
      { name: 'docker', displayName: 'Docker', category: 'CONTAINER' as ToolCategory, installCommand: 'curl -fsSL https://get.docker.com | sh', versionCommand: 'docker --version', description: 'Container runtime', requiresSudo: true },
      { name: 'node', displayName: 'Node.js', category: 'LANGUAGE_RUNTIME' as ToolCategory, installCommand: 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs', versionCommand: 'node --version', description: 'JavaScript runtime' },
      { name: 'python3', displayName: 'Python 3', category: 'LANGUAGE_RUNTIME' as ToolCategory, installCommand: 'apt-get install -y python3 python3-pip', versionCommand: 'python3 --version', description: 'Python interpreter' },
      { name: 'kubectl', displayName: 'kubectl', category: 'KUBERNETES' as ToolCategory, installCommand: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl', versionCommand: 'kubectl version --client', description: 'Kubernetes CLI' },
      { name: 'azure-cli', displayName: 'Azure CLI', category: 'CLOUD_CLI' as ToolCategory, installCommand: 'curl -sL https://aka.ms/InstallAzureCLIDeb | bash', versionCommand: 'az --version', description: 'Microsoft Azure CLI' },
      { name: 'gcloud', displayName: 'Google Cloud CLI', category: 'CLOUD_CLI' as ToolCategory, installCommand: 'apt-get install -y apt-transport-https ca-certificates gnupg && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && apt-get update && apt-get install -y google-cloud-cli', versionCommand: 'gcloud --version', description: 'Google Cloud CLI' },
      { name: 'aws-cli', displayName: 'AWS CLI', category: 'CLOUD_CLI' as ToolCategory, installCommand: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install', versionCommand: 'aws --version', description: 'Amazon Web Services CLI' },
      { name: 'terraform', displayName: 'Terraform', category: 'DEVOPS' as ToolCategory, installCommand: 'apt-get install -y gnupg software-properties-common && wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | tee /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && apt-get update && apt-get install -y terraform', versionCommand: 'terraform --version', description: 'Infrastructure as Code tool' },
      { name: 'helm', displayName: 'Helm', category: 'KUBERNETES' as ToolCategory, installCommand: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash', versionCommand: 'helm version', description: 'Kubernetes package manager' },
    ];

    let count = 0;
    for (const tool of defaultTools) {
      await prisma.toolDefinition.upsert({
        where: { name: tool.name },
        create: {
          ...tool,
          requiresSudo: tool.requiresSudo ?? true,
          dependencies: [],
          tags: [],
        },
        update: {},
      });
      count++;
    }

    return count;
  }
}
