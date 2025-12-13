/**
 * Tool Installation Service
 *
 * Manages installation, verification, and health checks of tools on MCP servers.
 * Tools are installed via the Master Agent on each server.
 */

import { prisma } from '../index.js';
import { getMasterAgentService } from './master-agent.service.js';
import { MonitoringService } from './monitoring.service.js';
import type { ToolStatus, HealthStatus, ServerTool, ToolDefinition } from '@prisma/client';

export interface InstallResult {
  success: boolean;
  serverToolId?: string;
  installedVersion?: string;
  error?: string;
  output?: string;
}

export interface VerifyResult {
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface ToolHealthCheck {
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  lastCheck: Date;
}

export class ToolInstallationService {
  private monitoring = MonitoringService.getInstance();

  /**
   * List all available tools in the catalog
   */
  async listAvailableTools(): Promise<ToolDefinition[]> {
    return prisma.toolDefinition.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get tools installed on a specific server
   */
  async getServerTools(serverId: string): Promise<Array<ServerTool & { tool: ToolDefinition }>> {
    return prisma.serverTool.findMany({
      where: { serverId },
      include: { tool: true },
      orderBy: { installedAt: 'desc' },
    });
  }

  /**
   * Check if a tool is installed on a server
   */
  async isToolInstalled(serverId: string, toolId: string): Promise<boolean> {
    const serverTool = await prisma.serverTool.findFirst({
      where: {
        serverId,
        toolId,
        status: 'INSTALLED',
      },
    });

    return serverTool !== null;
  }

  /**
   * Install a tool on a server via Master Agent
   */
  async installTool(
    serverId: string,
    toolId: string,
    userId: string,
    callbacks?: {
      onProgress?: (message: string) => void;
      onOutput?: (chunk: string) => void;
    }
  ): Promise<InstallResult> {
    // Get tool definition
    const tool = await prisma.toolDefinition.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    // Check if already installed
    const existing = await prisma.serverTool.findFirst({
      where: { serverId, toolId },
    });

    if (existing && existing.status === 'INSTALLED') {
      return {
        success: true,
        serverToolId: existing.id,
        installedVersion: existing.installedVersion || undefined,
      };
    }

    // Create or update server tool record
    const serverTool = existing
      ? await prisma.serverTool.update({
          where: { id: existing.id },
          data: { status: 'INSTALLING' },
        })
      : await prisma.serverTool.create({
          data: {
            serverId,
            toolId,
            status: 'INSTALLING',
          },
        });

    callbacks?.onProgress?.(`Installing ${tool.displayName}...`);

    try {
      // Get MasterAgentService for the server
      const masterService = await getMasterAgentService(serverId);

      // Build installation prompt
      const installPrompt = this.buildInstallPrompt(tool);

      // Execute installation via Master Agent
      const result = await masterService.executePrompt(installPrompt, undefined, {
        onOutput: (chunk) => {
          callbacks?.onOutput?.(chunk);
        },
      });

      if (result.success) {
        // Verify installation
        const verification = await this.verifyInstallation(serverId, tool);

        if (verification.installed) {
          await prisma.serverTool.update({
            where: { id: serverTool.id },
            data: {
              status: 'INSTALLED',
              installedVersion: verification.version || undefined,
              installedAt: new Date(),
              healthStatus: 'HEALTHY',
              lastHealthCheck: new Date(),
            },
          });

          this.monitoring.broadcastToolStatus(serverId, tool.name, 'INSTALLED');

          return {
            success: true,
            serverToolId: serverTool.id,
            installedVersion: verification.version,
            output: result.output,
          };
        } else {
          await prisma.serverTool.update({
            where: { id: serverTool.id },
            data: {
              status: 'FAILED',
              healthStatus: 'UNHEALTHY',
              lastHealthCheck: new Date(),
            },
          });

          return {
            success: false,
            serverToolId: serverTool.id,
            error: verification.error || 'Installation verification failed',
            output: result.output,
          };
        }
      } else {
        await prisma.serverTool.update({
          where: { id: serverTool.id },
          data: {
            status: 'FAILED',
            healthStatus: 'UNHEALTHY',
            lastHealthCheck: new Date(),
          },
        });

        return {
          success: false,
          serverToolId: serverTool.id,
          error: result.error || 'Installation failed',
          output: result.output,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.serverTool.update({
        where: { id: serverTool.id },
        data: {
          status: 'FAILED',
          healthStatus: 'UNHEALTHY',
          lastHealthCheck: new Date(),
        },
      });

      return {
        success: false,
        serverToolId: serverTool.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Uninstall a tool from a server
   */
  async uninstallTool(
    serverId: string,
    toolId: string,
    callbacks?: {
      onProgress?: (message: string) => void;
      onOutput?: (chunk: string) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const tool = await prisma.toolDefinition.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    const serverTool = await prisma.serverTool.findFirst({
      where: { serverId, toolId },
    });

    if (!serverTool) {
      return { success: false, error: 'Tool not installed on this server' };
    }

    callbacks?.onProgress?.(`Uninstalling ${tool.displayName}...`);

    try {
      // Get MasterAgentService
      const masterService = await getMasterAgentService(serverId);

      // Build uninstallation prompt
      const uninstallPrompt = this.buildUninstallPrompt(tool);

      const result = await masterService.executePrompt(uninstallPrompt, undefined, {
        onOutput: callbacks?.onOutput,
      });

      if (result.success) {
        // Remove permissions for this tool
        await prisma.agentToolPermission.deleteMany({
          where: { toolId },
        });

        // Remove server tool record
        await prisma.serverTool.delete({
          where: { id: serverTool.id },
        });

        this.monitoring.broadcastToolStatus(serverId, tool.name, 'UNINSTALLED');

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Uninstallation failed' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify tool installation
   */
  async verifyInstallation(serverId: string, tool: ToolDefinition): Promise<VerifyResult> {
    try {
      const masterService = await getMasterAgentService(serverId);

      // Execute check command
      const checkPrompt = `Run the following command and report the output: ${tool.versionCommand}`;

      const result = await masterService.executePrompt(checkPrompt);

      if (result.success && result.output) {
        // Parse version from output
        const versionMatch = result.output.match(/(\d+\.[\d.]+)/);

        return {
          installed: true,
          version: versionMatch ? versionMatch[1] : undefined,
        };
      }

      return {
        installed: false,
        error: result.error || 'Verification failed',
      };
    } catch (error) {
      return {
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform health check on installed tools
   */
  async healthCheckServer(serverId: string): Promise<Map<string, ToolHealthCheck>> {
    const results = new Map<string, ToolHealthCheck>();

    const serverTools = await prisma.serverTool.findMany({
      where: { serverId, status: 'INSTALLED' },
      include: { tool: true },
    });

    // Collect all updates to batch them in a single transaction
    const updates: Array<{ id: string; healthStatus: HealthStatus; lastHealthCheck: Date }> = [];

    for (const serverTool of serverTools) {
      const startTime = Date.now();

      try {
        const verification = await this.verifyInstallation(serverId, serverTool.tool);
        const responseTime = Date.now() - startTime;

        const healthStatus: HealthStatus = verification.installed ? 'HEALTHY' : 'UNHEALTHY';
        const lastHealthCheck = new Date();

        // Collect update data
        updates.push({
          id: serverTool.id,
          healthStatus,
          lastHealthCheck,
        });

        results.set(serverTool.tool.name, {
          status: healthStatus,
          responseTime,
          lastCheck: lastHealthCheck,
        });
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const lastHealthCheck = new Date();

        // Collect update data
        updates.push({
          id: serverTool.id,
          healthStatus: 'UNHEALTHY',
          lastHealthCheck,
        });

        results.set(serverTool.tool.name, {
          status: 'UNHEALTHY',
          message: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
          lastCheck: lastHealthCheck,
        });
      }
    }

    // Batch all updates in a single transaction to avoid N+1 queries
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.serverTool.update({
            where: { id: update.id },
            data: {
              healthStatus: update.healthStatus,
              lastHealthCheck: update.lastHealthCheck,
            },
          })
        )
      );
    }

    return results;
  }

  /**
   * Grant tool permission to an agent
   */
  async grantPermission(
    agentId: string,
    toolId: string,
    grantedById: string,
    options?: {
      rateLimit?: number;
    }
  ): Promise<void> {
    // Check if permission already exists
    const existing = await prisma.agentToolPermission.findFirst({
      where: { agentId, toolId },
    });

    if (existing) {
      await prisma.agentToolPermission.update({
        where: { id: existing.id },
        data: {
          canUse: true,
          rateLimit: options?.rateLimit,
          grantedBy: grantedById,
          grantedAt: new Date(),
        },
      });
    } else {
      await prisma.agentToolPermission.create({
        data: {
          agentId,
          toolId,
          canUse: true,
          rateLimit: options?.rateLimit,
          grantedBy: grantedById,
        },
      });
    }
  }

  /**
   * Revoke tool permission from an agent
   */
  async revokePermission(agentId: string, toolId: string): Promise<void> {
    await prisma.agentToolPermission.deleteMany({
      where: { agentId, toolId },
    });
  }

  /**
   * Get agent's tool permissions
   */
  async getAgentPermissions(agentId: string): Promise<
    Array<{
      tool: ToolDefinition;
      canUse: boolean;
      rateLimit?: number | null;
    }>
  > {
    const permissions = await prisma.agentToolPermission.findMany({
      where: { agentId },
      include: {
        tool: true,
      },
    });

    return permissions.map((p) => ({
      tool: p.tool,
      canUse: p.canUse,
      rateLimit: p.rateLimit,
    }));
  }

  /**
   * Build installation prompt for a tool
   */
  private buildInstallPrompt(tool: ToolDefinition): string {
    return `
Install the following tool on this server:

Tool: ${tool.displayName} (${tool.name})
Description: ${tool.description || 'No description'}
Category: ${tool.category}

Installation command:
${tool.installCommand}

After installation, verify by running:
${tool.versionCommand}

Please execute the installation and report the result.
    `.trim();
  }

  /**
   * Build uninstallation prompt for a tool
   */
  private buildUninstallPrompt(tool: ToolDefinition): string {
    // Derive uninstall command from install command
    let uninstallCmd = tool.uninstallCommand || 'echo "Manual uninstallation required"';

    if (!tool.uninstallCommand) {
      if (tool.installCommand.includes('apt-get install')) {
        const pkg = tool.installCommand.replace(/.*apt-get install\s+(-y\s+)?/, '').split(' ')[0];
        uninstallCmd = `sudo apt-get remove -y ${pkg}`;
      } else if (tool.installCommand.includes('apt install')) {
        const pkg = tool.installCommand.replace(/.*apt install\s+(-y\s+)?/, '').split(' ')[0];
        uninstallCmd = `sudo apt remove -y ${pkg}`;
      } else if (tool.installCommand.includes('npm install -g')) {
        const pkg = tool.installCommand.replace(/.*npm install -g\s+/, '').split(' ')[0];
        uninstallCmd = `npm uninstall -g ${pkg}`;
      } else if (tool.installCommand.includes('pip install')) {
        const pkg = tool.installCommand.replace(/.*pip install\s+/, '').split(' ')[0];
        uninstallCmd = `pip uninstall -y ${pkg}`;
      }
    }

    return `
Uninstall the following tool from this server:

Tool: ${tool.displayName} (${tool.name})

Uninstallation command:
${uninstallCmd}

Please execute the uninstallation and report the result.
    `.trim();
  }
}

// Singleton instance
let instance: ToolInstallationService | null = null;

export function getToolInstallationService(): ToolInstallationService {
  if (!instance) {
    instance = new ToolInstallationService();
  }
  return instance;
}
