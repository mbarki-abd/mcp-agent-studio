/**
 * Task Execution Service
 *
 * Handles real task execution via MCP protocol with:
 * - Real-time progress streaming via WebSocket
 * - Retry logic with exponential backoff
 * - Execution history tracking
 * - Agent workload balancing
 */

import { prisma } from '../index.js';
import { getMasterAgentService } from './master-agent.service.js';
import { MonitoringService } from './monitoring.service.js';
import { getScheduler } from './scheduler.service.js';
import type { Task, TaskExecution, Agent, ExecutionStatus } from '@prisma/client';
import { taskLogger } from '../utils/logger.js';

export interface ExecutionCallbacks {
  onStart?: (executionId: string) => void;
  onOutput?: (chunk: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onToolCall?: (name: string, params: Record<string, unknown>) => void;
  onFileChange?: (path: string, action: 'create' | 'edit' | 'delete') => void;
  onComplete?: (result: ExecutionResult) => void;
  onError?: (error: Error) => void;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  tokensUsed?: number;
  durationMs: number;
  toolCalls?: Array<{ name: string; params: Record<string, unknown> }>;
  fileChanges?: Array<{ path: string; action: string }>;
}

export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class TaskExecutionService {
  private monitoring = MonitoringService.getInstance();
  private runningExecutions = new Map<string, AbortController>();

  /**
   * Execute a task immediately
   */
  async executeTask(
    taskId: string,
    userId: string,
    callbacks?: ExecutionCallbacks,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    // Load task with related data
    const task = await prisma.task.findFirst({
      where: { id: taskId, createdById: userId },
      include: {
        agent: true,
        server: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!task.agent) {
      throw new Error('Task has no assigned agent');
    }

    if (!task.server) {
      throw new Error('Task has no assigned server');
    }

    if (task.agent.status !== 'ACTIVE') {
      throw new Error(`Agent is not active (status: ${task.agent.status})`);
    }

    // Check dependencies
    const uncompletedDeps = await this.checkDependencies(task.dependsOnIds);
    if (uncompletedDeps.length > 0) {
      const depNames = uncompletedDeps.map(d => d.title).join(', ');
      throw new Error(`Cannot execute: waiting for dependencies to complete (${depNames})`);
    }

    // Create execution record
    const execution = await prisma.taskExecution.create({
      data: {
        taskId,
        agentId: task.agent.id,
        status: 'QUEUED',
        prompt: this.buildPrompt(task),
      },
    });

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'QUEUED' },
    });

    // Broadcast status change
    this.monitoring.broadcastExecution(
      task.agent.id,
      taskId,
      'starting',
      'Task queued for execution'
    );

    callbacks?.onStart?.(execution.id);

    // Execute with retry logic
    return this.executeWithRetry(
      task,
      execution,
      callbacks,
      options || {
        timeout: task.timeout || 300000,
        maxRetries: task.maxRetries || 3,
        retryDelay: task.retryDelay || 60000,
      }
    );
  }

  /**
   * Execute a prompt directly on an agent (without creating a task)
   */
  async executePrompt(
    serverId: string,
    agentId: string,
    prompt: string,
    callbacks?: ExecutionCallbacks
  ): Promise<ExecutionResult> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'ACTIVE') {
      throw new Error(`Agent is not active (status: ${agent.status})`);
    }

    const startTime = Date.now();
    const service = await getMasterAgentService(serverId);

    try {
      // Update agent status to BUSY
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'BUSY' },
      });

      this.monitoring.broadcastAgentStatus(agentId, 'BUSY', 'ACTIVE', 'Executing prompt');

      const result = await service.executePrompt(prompt, agentId, {
        onStart: () => callbacks?.onStart?.('direct'),
        onOutput: (chunk) => {
          callbacks?.onOutput?.(chunk);
          this.monitoring.broadcastExecution(agentId, 'direct', 'running', chunk);
        },
        onToolCall: callbacks?.onToolCall,
        onFileChange: callbacks?.onFileChange,
        onComplete: (res) => {
          const execResult: ExecutionResult = {
            success: res.success,
            output: res.output || '',
            error: res.error,
            tokensUsed: res.tokensUsed,
            durationMs: res.durationMs || 0,
          };
          callbacks?.onComplete?.(execResult);
        },
        onError: callbacks?.onError,
      });

      // Reset agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'ACTIVE' },
      });

      this.monitoring.broadcastAgentStatus(agentId, 'ACTIVE', 'BUSY', 'Execution complete');

      return {
        success: result.success,
        output: result.output || '',
        error: result.error,
        tokensUsed: result.tokensUsed,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      // Reset agent status on error
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'ERROR' },
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.monitoring.broadcastAgentStatus(agentId, 'ERROR', 'BUSY', errorMessage);

      return {
        success: false,
        output: '',
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const controller = this.runningExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.runningExecutions.delete(executionId);
    }

    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    const execution = await prisma.taskExecution.findUnique({
      where: { id: executionId },
      include: { task: true },
    });

    if (execution) {
      await prisma.task.update({
        where: { id: execution.taskId },
        data: { status: 'CANCELLED' },
      });

      this.monitoring.broadcastExecution(
        execution.agentId,
        execution.taskId,
        'failed',
        'Execution cancelled by user'
      );
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    executionId: string,
    userId: string,
    callbacks?: ExecutionCallbacks
  ): Promise<ExecutionResult> {
    const execution = await prisma.taskExecution.findUnique({
      where: { id: executionId },
      include: {
        task: {
          include: { agent: true, server: true },
        },
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.task.createdById !== userId) {
      throw new Error('Not authorized');
    }

    if (!['FAILED', 'TIMEOUT', 'CANCELLED'].includes(execution.status)) {
      throw new Error('Can only retry failed, timed out, or cancelled executions');
    }

    // Create new execution record
    const newExecution = await prisma.taskExecution.create({
      data: {
        taskId: execution.taskId,
        agentId: execution.agentId,
        status: 'QUEUED',
        prompt: execution.prompt,
      },
    });

    return this.executeWithRetry(
      execution.task as Task & { agent: Agent },
      newExecution,
      callbacks,
      {
        timeout: execution.task.timeout || 300000,
        maxRetries: 1, // Single retry for manual retries
        retryDelay: 0,
      }
    );
  }

  /**
   * Get execution output stream
   */
  async getExecutionOutput(executionId: string): Promise<string | null> {
    const execution = await prisma.taskExecution.findUnique({
      where: { id: executionId },
      select: { output: true },
    });

    return execution?.output || null;
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    task: Task & { agent: Agent | null; server?: { id: string } | null },
    execution: TaskExecution,
    callbacks?: ExecutionCallbacks,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 60000;
    const timeout = options?.timeout || 300000;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await this.performExecution(task, execution, callbacks, timeout);

        if (result.success) {
          return result;
        }

        lastError = new Error(result.error || 'Execution failed');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      attempt++;

      if (attempt <= maxRetries) {
        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        this.monitoring.broadcastExecution(
          task.agent!.id,
          task.id,
          'running',
          `Retry attempt ${attempt}/${maxRetries}`
        );
      }
    }

    // All retries exhausted
    const errorMessage = lastError?.message || 'Max retries exceeded';

    await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });

    // Reset agent status
    if (task.agent) {
      await prisma.agent.update({
        where: { id: task.agent.id },
        data: { status: 'ACTIVE' },
      });
    }

    callbacks?.onError?.(lastError || new Error('Execution failed'));

    return {
      success: false,
      output: '',
      error: errorMessage,
      exitCode: 1,
      durationMs: 0,
    };
  }

  /**
   * Perform the actual execution
   */
  private async performExecution(
    task: Task & { agent: Agent | null; server?: { id: string } | null },
    execution: TaskExecution,
    callbacks?: ExecutionCallbacks,
    timeout?: number
  ): Promise<ExecutionResult> {
    if (!task.agent || !task.server) {
      throw new Error('Task missing agent or server');
    }

    const startTime = Date.now();
    const abortController = new AbortController();
    this.runningExecutions.set(execution.id, abortController);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout || 300000);

    try {
      // Update execution status to RUNNING
      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Update task status
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'RUNNING' },
      });

      // Update agent status
      await prisma.agent.update({
        where: { id: task.agent.id },
        data: { status: 'BUSY' },
      });

      // Broadcast status changes
      this.monitoring.broadcastAgentStatus(task.agent.id, 'BUSY', 'ACTIVE', 'Executing task');
      this.monitoring.broadcastExecution(
        task.agent.id,
        execution.id,
        'running',
        'Task execution started'
      );

      // Get MasterAgentService and execute
      const service = await getMasterAgentService(task.server.id);

      const outputChunks: string[] = [];
      const toolCalls: Array<{ name: string; params: Record<string, unknown> }> = [];
      const fileChanges: Array<{ path: string; action: string }> = [];

      const result = await service.executePrompt(
        execution.prompt,
        task.agent.id,
        {
          onStart: () => {
            callbacks?.onStart?.(execution.id);
          },
          onOutput: (chunk) => {
            outputChunks.push(chunk);
            callbacks?.onOutput?.(chunk);
            this.monitoring.broadcastExecution(task.agent!.id, execution.id, 'running', chunk);
          },
          onToolCall: (name, params) => {
            toolCalls.push({ name, params });
            callbacks?.onToolCall?.(name, params);
          },
          onFileChange: (path, action) => {
            fileChanges.push({ path, action });
            callbacks?.onFileChange?.(path, action);
          },
          onError: (error) => {
            callbacks?.onError?.(error);
          },
        }
      );

      clearTimeout(timeoutId);
      this.runningExecutions.delete(execution.id);

      const durationMs = Date.now() - startTime;
      const output = outputChunks.join('');

      // Update execution record
      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          output,
          error: result.error,
          exitCode: result.success ? 0 : 1,
          tokensUsed: result.tokensUsed,
          durationMs,
          completedAt: new Date(),
        },
      });

      // Update task
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });

      // Reset agent status
      await prisma.agent.update({
        where: { id: task.agent.id },
        data: { status: 'ACTIVE' },
      });

      // Broadcast completion
      this.monitoring.broadcastAgentStatus(task.agent.id, 'ACTIVE', 'BUSY', 'Task completed');
      this.monitoring.broadcastExecution(
        task.agent.id,
        execution.id,
        result.success ? 'completed' : 'failed',
        result.success ? 'Task completed successfully' : result.error || 'Task failed'
      );

      const executionResult: ExecutionResult = {
        success: result.success,
        output,
        error: result.error,
        exitCode: result.success ? 0 : 1,
        tokensUsed: result.tokensUsed,
        durationMs,
        toolCalls,
        fileChanges,
      };

      callbacks?.onComplete?.(executionResult);

      // Schedule next run for recurring tasks
      if (result.success && task.executionMode === 'RECURRING') {
        await this.scheduleNextRun(task);
      }

      return executionResult;

    } catch (error) {
      clearTimeout(timeoutId);
      this.runningExecutions.delete(execution.id);

      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = abortController.signal.aborted;

      // Update execution record
      await prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: isTimeout ? 'TIMEOUT' : 'FAILED',
          error: isTimeout ? 'Execution timeout' : errorMessage,
          exitCode: 1,
          durationMs,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Build the prompt from task data
   */
  private buildPrompt(task: Task): string {
    let prompt = task.prompt;

    // Replace prompt variables
    const variables = task.promptVariables as Record<string, string> || {};
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return prompt;
  }

  /**
   * Schedule next run for recurring tasks
   */
  private async scheduleNextRun(task: Task): Promise<void> {
    if (task.executionMode !== 'RECURRING') return;

    try {
      const scheduler = getScheduler();
      if (task.cronExpression && task.agentId) {
        await scheduler.scheduleRecurringTask(
          task.id,
          task.agentId,
          task.prompt,
          task.cronExpression
        );
      }
    } catch (error) {
      taskLogger.warn({ err: error }, 'Failed to schedule next run');
    }
  }

  /**
   * Check if task dependencies are completed
   */
  async checkDependencies(dependsOnIds: string[]): Promise<Array<{ id: string; title: string; status: string }>> {
    if (!dependsOnIds || dependsOnIds.length === 0) {
      return [];
    }

    const dependencies = await prisma.task.findMany({
      where: { id: { in: dependsOnIds } },
      select: { id: true, title: true, status: true },
    });

    return dependencies.filter((dep) => dep.status !== 'COMPLETED');
  }

  /**
   * Check if a task can be executed based on its dependencies
   */
  async canExecute(taskId: string): Promise<{ canExecute: boolean; blockedBy?: string[] }> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { dependsOnIds: true },
    });

    if (!task) {
      return { canExecute: false, blockedBy: ['Task not found'] };
    }

    const uncompletedDeps = await this.checkDependencies(task.dependsOnIds);

    if (uncompletedDeps.length > 0) {
      return {
        canExecute: false,
        blockedBy: uncompletedDeps.map((d) => d.title),
      };
    }

    return { canExecute: true };
  }

  /**
   * Get tasks that depend on a given task
   */
  async getDependentTasks(taskId: string): Promise<Array<{ id: string; title: string; status: string }>> {
    const dependentTasks = await prisma.task.findMany({
      where: { dependsOnIds: { has: taskId } },
      select: { id: true, title: true, status: true },
    });

    return dependentTasks;
  }

  /**
   * Trigger execution of dependent tasks when a task completes
   */
  async triggerDependentTasks(completedTaskId: string, userId: string): Promise<void> {
    const dependentTasks = await this.getDependentTasks(completedTaskId);

    for (const depTask of dependentTasks) {
      // Only trigger if task is pending/scheduled and all dependencies are now complete
      if (depTask.status === 'PENDING' || depTask.status === 'SCHEDULED') {
        const { canExecute } = await this.canExecute(depTask.id);

        if (canExecute) {
          // Auto-trigger execution
          this.executeTask(depTask.id, userId).catch((err) => {
            taskLogger.warn({ err, taskId: depTask.id }, 'Failed to auto-trigger dependent task');
          });
        }
      }
    }
  }

  /**
   * Get execution statistics for an agent
   */
  async getAgentStats(agentId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    totalTokensUsed: number;
  }> {
    const executions = await prisma.taskExecution.findMany({
      where: { agentId },
      select: {
        status: true,
        durationMs: true,
        tokensUsed: true,
      },
    });

    const successful = executions.filter(e => e.status === 'COMPLETED');
    const failed = executions.filter(e => ['FAILED', 'TIMEOUT'].includes(e.status));

    const totalDuration = successful.reduce((sum, e) => sum + (e.durationMs || 0), 0);
    const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageDuration: successful.length > 0 ? totalDuration / successful.length : 0,
      totalTokensUsed: totalTokens,
    };
  }
}

// Singleton instance
let instance: TaskExecutionService | null = null;

export function getTaskExecutionService(): TaskExecutionService {
  if (!instance) {
    instance = new TaskExecutionService();
  }
  return instance;
}
