import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskExecutionService } from '../services/task-execution.service.js';
import { prisma } from '../index.js';
import { getMasterAgentService, type StreamCallback } from '../services/master-agent.service.js';
import { MonitoringService } from '../services/monitoring.service.js';
import { getScheduler } from '../services/scheduler.service.js';

// Mock dependencies
vi.mock('../index.js', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    taskExecution: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/master-agent.service.js', () => ({
  getMasterAgentService: vi.fn(),
}));

vi.mock('../services/monitoring.service.js', () => ({
  MonitoringService: {
    getInstance: vi.fn(() => ({
      broadcastExecution: vi.fn(),
      broadcastAgentStatus: vi.fn(),
    })),
  },
}));

vi.mock('../services/scheduler.service.js', () => ({
  getScheduler: vi.fn(() => ({
    scheduleRecurringTask: vi.fn(),
  })),
}));

describe('TaskExecutionService', () => {
  let service: TaskExecutionService;
  let mockMonitoring: any;
  let mockMasterAgentService: any;
  let mockScheduler: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMonitoring = {
      broadcastExecution: vi.fn(),
      broadcastAgentStatus: vi.fn(),
    };

    mockMasterAgentService = {
      executePrompt: vi.fn(),
    };

    mockScheduler = {
      scheduleRecurringTask: vi.fn(),
    };

    vi.mocked(MonitoringService.getInstance).mockReturnValue(mockMonitoring);
    vi.mocked(getMasterAgentService).mockResolvedValue(mockMasterAgentService);
    vi.mocked(getScheduler).mockReturnValue(mockScheduler);

    service = new TaskExecutionService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeTask', () => {
    it('should execute a task successfully', async () => {
      // Arrange
      const taskId = 'task-123';
      const userId = 'user-123';

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        prompt: 'Do something',
        status: 'PENDING',
        createdById: userId,
        dependsOnIds: [],
        timeout: 300000,
        maxRetries: 3,
        retryDelay: 60000,
        executionMode: 'IMMEDIATE',
        agentId: 'agent-123',
        promptVariables: {},
        agent: {
          id: 'agent-123',
          status: 'ACTIVE',
        },
        server: {
          id: 'server-123',
        },
      };

      const mockExecution = {
        id: 'exec-123',
        taskId,
        agentId: 'agent-123',
        status: 'QUEUED',
        prompt: 'Do something',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.agent.update).mockResolvedValue(mockTask.agent as any);

      mockMasterAgentService.executePrompt.mockImplementation((prompt: string, agentId?: string, cbs?: StreamCallback) => {
        cbs?.onOutput?.('Task completed');
        return Promise.resolve({
          success: true,
          output: 'Task completed',
          tokensUsed: 100,
          durationMs: 1000,
        });
      });

      // Act
      const result = await service.executeTask(taskId, userId);

      // Assert
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: taskId, createdById: userId },
        include: {
          agent: true,
          server: true,
        },
      });
      expect(result.success).toBe(true);
      expect(result.output).toBe('Task completed');
      expect(mockMonitoring.broadcastExecution).toHaveBeenCalled();
    });

    it('should throw error when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.executeTask('task-123', 'user-123')).rejects.toThrow('Task not found');
    });

    it('should throw error when task has no assigned agent', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        agent: null,
        server: { id: 'server-123' },
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.executeTask('task-123', 'user-123')).rejects.toThrow(
        'Task has no assigned agent'
      );
    });

    it('should throw error when task has no assigned server', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: null,
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.executeTask('task-123', 'user-123')).rejects.toThrow(
        'Task has no assigned server'
      );
    });

    it('should throw error when agent is not active', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        agent: { id: 'agent-123', status: 'ERROR' },
        server: { id: 'server-123' },
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.executeTask('task-123', 'user-123')).rejects.toThrow(
        'Agent is not active (status: ERROR)'
      );
    });

    it('should check dependencies before execution', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        dependsOnIds: ['task-1', 'task-2'],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
      };

      const mockUncompletedDeps = [
        { id: 'task-1', title: 'Dependency 1', status: 'PENDING' },
      ];

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.task.findMany).mockResolvedValue(mockUncompletedDeps as any);

      // Act & Assert
      await expect(service.executeTask('task-123', 'user-123')).rejects.toThrow(
        'Cannot execute: waiting for dependencies to complete (Dependency 1)'
      );
    });

    it('should update task status during execution', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        prompt: 'Test',
        dependsOnIds: [],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
        timeout: 300000,
        maxRetries: 1,
        retryDelay: 0,
        executionMode: 'IMMEDIATE',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockResolvedValue({
        success: true,
        output: 'Done',
      });

      // Act
      await service.executeTask('task-123', 'user-123');

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'QUEUED' },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'RUNNING' },
      });
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-123' },
          data: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should handle execution errors', async () => {
      // Arrange
      vi.useFakeTimers();

      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        prompt: 'Test',
        dependsOnIds: [],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
        timeout: 300000,
        maxRetries: 0,
        retryDelay: 0,
        executionMode: 'IMMEDIATE',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      // Mock execution error
      mockMasterAgentService.executePrompt.mockRejectedValue(new Error('Execution error'));

      // Act
      const resultPromise = service.executeTask('task-123', 'user-123');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution error');

      vi.useRealTimers();
    });

    it('should invoke callbacks during execution', async () => {
      // Arrange
      const callbacks = {
        onStart: vi.fn(),
        onOutput: vi.fn(),
        onComplete: vi.fn(),
      };

      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        prompt: 'Test',
        dependsOnIds: [],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
        timeout: 300000,
        maxRetries: 1,
        retryDelay: 0,
        executionMode: 'IMMEDIATE',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockImplementation((prompt: string, agentId?: string, cbs?: StreamCallback) => {
        cbs?.onOutput?.('chunk1');
        cbs?.onOutput?.('chunk2');
        return Promise.resolve({ success: true, output: 'Done' });
      });

      // Act
      await service.executeTask('task-123', 'user-123', callbacks);

      // Assert
      expect(callbacks.onStart).toHaveBeenCalledWith('exec-123');
      expect(callbacks.onOutput).toHaveBeenCalledWith('chunk1');
      expect(callbacks.onOutput).toHaveBeenCalledWith('chunk2');
      expect(callbacks.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          output: 'chunk1chunk2',
        })
      );
    });
  });

  describe('executePrompt', () => {
    it('should execute a prompt directly on an agent', async () => {
      // Arrange
      const serverId = 'server-123';
      const agentId = 'agent-123';
      const prompt = 'Test prompt';

      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: agentId,
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockResolvedValue({
        success: true,
        output: 'Result',
        tokensUsed: 50,
        durationMs: 500,
      });

      // Act
      const result = await service.executePrompt(serverId, agentId, prompt);

      // Assert
      expect(prisma.agent.findUnique).toHaveBeenCalledWith({ where: { id: agentId } });
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: agentId },
        data: { status: 'BUSY' },
      });
      expect(result.success).toBe(true);
      expect(result.output).toBe('Result');
      expect(mockMonitoring.broadcastAgentStatus).toHaveBeenCalled();
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(service.executePrompt('server-123', 'agent-123', 'Test')).rejects.toThrow(
        'Agent not found'
      );
    });

    it('should throw error when agent is not active', async () => {
      // Arrange
      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: 'agent-123',
        status: 'ERROR',
      } as any);

      // Act & Assert
      await expect(service.executePrompt('server-123', 'agent-123', 'Test')).rejects.toThrow(
        'Agent is not active (status: ERROR)'
      );
    });

    it('should reset agent status to ACTIVE after successful execution', async () => {
      // Arrange
      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: 'agent-123',
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockResolvedValue({
        success: true,
        output: 'Done',
      });

      // Act
      await service.executePrompt('server-123', 'agent-123', 'Test');

      // Assert
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { status: 'ACTIVE' },
      });
    });

    it('should set agent status to ERROR on execution failure', async () => {
      // Arrange
      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: 'agent-123',
        status: 'ACTIVE',
      } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockRejectedValue(new Error('Execution failed'));

      // Act
      const result = await service.executePrompt('server-123', 'agent-123', 'Test');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { status: 'ERROR' },
      });
    });
  });

  describe('cancelExecution', () => {
    it('should cancel a running execution', async () => {
      // Arrange
      const executionId = 'exec-123';
      const mockExecution = {
        id: executionId,
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'RUNNING',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        ...mockExecution,
        task: { id: 'task-123' },
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.cancelExecution(executionId);

      // Assert
      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
        },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should broadcast cancellation event', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        task: { id: 'task-123' },
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.cancelExecution('exec-123');

      // Assert
      expect(mockMonitoring.broadcastExecution).toHaveBeenCalledWith(
        'agent-123',
        'task-123',
        'failed',
        'Execution cancelled by user'
      );
    });
  });

  describe('retryExecution', () => {
    it('should retry a failed execution', async () => {
      // Arrange
      const executionId = 'exec-123';
      const userId = 'user-123';

      const mockExecution = {
        id: executionId,
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'FAILED',
        prompt: 'Test prompt',
        task: {
          id: 'task-123',
          createdById: userId,
          timeout: 300000,
          agent: { id: 'agent-123', status: 'ACTIVE' },
          server: { id: 'server-123' },
        },
      };

      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-456',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      mockMasterAgentService.executePrompt.mockResolvedValue({
        success: true,
        output: 'Retry successful',
      });

      // Act
      const result = await service.retryExecution(executionId, userId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.taskExecution.create).toHaveBeenCalledWith({
        data: {
          taskId: 'task-123',
          agentId: 'agent-123',
          status: 'QUEUED',
          prompt: 'Test prompt',
        },
      });
    });

    it('should throw error when execution not found', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(service.retryExecution('exec-123', 'user-123')).rejects.toThrow(
        'Execution not found'
      );
    });

    it('should throw error when user is not authorized', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        id: 'exec-123',
        task: { createdById: 'other-user' },
      } as any);

      // Act & Assert
      await expect(service.retryExecution('exec-123', 'user-123')).rejects.toThrow(
        'Not authorized'
      );
    });

    it('should throw error when execution status is not retryable', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        id: 'exec-123',
        status: 'COMPLETED',
        task: { createdById: 'user-123' },
      } as any);

      // Act & Assert
      await expect(service.retryExecution('exec-123', 'user-123')).rejects.toThrow(
        'Can only retry failed, timed out, or cancelled executions'
      );
    });
  });

  describe('checkDependencies', () => {
    it('should return empty array when no dependencies', async () => {
      // Act
      const result = await service.checkDependencies([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return uncompleted dependencies', async () => {
      // Arrange
      const dependsOnIds = ['task-1', 'task-2', 'task-3'];
      const mockDependencies = [
        { id: 'task-1', title: 'Task 1', status: 'PENDING' },
        { id: 'task-2', title: 'Task 2', status: 'COMPLETED' },
        { id: 'task-3', title: 'Task 3', status: 'RUNNING' },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockDependencies as any);

      // Act
      const result = await service.checkDependencies(dependsOnIds);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ id: 'task-1', title: 'Task 1', status: 'PENDING' });
      expect(result).toContainEqual({ id: 'task-3', title: 'Task 3', status: 'RUNNING' });
    });

    it('should return empty array when all dependencies completed', async () => {
      // Arrange
      const mockDependencies = [
        { id: 'task-1', title: 'Task 1', status: 'COMPLETED' },
        { id: 'task-2', title: 'Task 2', status: 'COMPLETED' },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockDependencies as any);

      // Act
      const result = await service.checkDependencies(['task-1', 'task-2']);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('canExecute', () => {
    it('should return true when task has no dependencies', async () => {
      // Arrange
      vi.mocked(prisma.task.findUnique).mockResolvedValue({
        id: 'task-123',
        dependsOnIds: [],
      } as any);

      // Act
      const result = await service.canExecute('task-123');

      // Assert
      expect(result).toEqual({ canExecute: true });
    });

    it('should return false when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

      // Act
      const result = await service.canExecute('task-123');

      // Assert
      expect(result).toEqual({ canExecute: false, blockedBy: ['Task not found'] });
    });

    it('should return false when dependencies not completed', async () => {
      // Arrange
      vi.mocked(prisma.task.findUnique).mockResolvedValue({
        id: 'task-123',
        dependsOnIds: ['task-1', 'task-2'],
      } as any);

      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 'task-1', title: 'Task 1', status: 'PENDING' },
        { id: 'task-2', title: 'Task 2', status: 'RUNNING' },
      ] as any);

      // Act
      const result = await service.canExecute('task-123');

      // Assert
      expect(result).toEqual({
        canExecute: false,
        blockedBy: ['Task 1', 'Task 2'],
      });
    });

    it('should return true when all dependencies completed', async () => {
      // Arrange
      vi.mocked(prisma.task.findUnique).mockResolvedValue({
        id: 'task-123',
        dependsOnIds: ['task-1', 'task-2'],
      } as any);

      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 'task-1', title: 'Task 1', status: 'COMPLETED' },
        { id: 'task-2', title: 'Task 2', status: 'COMPLETED' },
      ] as any);

      // Act
      const result = await service.canExecute('task-123');

      // Assert
      expect(result).toEqual({ canExecute: true });
    });
  });

  describe('getDependentTasks', () => {
    it('should return tasks that depend on given task', async () => {
      // Arrange
      const taskId = 'task-123';
      const mockDependentTasks = [
        { id: 'task-456', title: 'Dependent Task 1', status: 'PENDING' },
        { id: 'task-789', title: 'Dependent Task 2', status: 'SCHEDULED' },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockDependentTasks as any);

      // Act
      const result = await service.getDependentTasks(taskId);

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { dependsOnIds: { has: taskId } },
        select: { id: true, title: true, status: true },
      });
      expect(result).toEqual(mockDependentTasks);
    });

    it('should return empty array when no dependent tasks', async () => {
      // Arrange
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      // Act
      const result = await service.getDependentTasks('task-123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getAgentStats', () => {
    it('should return execution statistics for an agent', async () => {
      // Arrange
      const agentId = 'agent-123';
      const mockExecutions = [
        { status: 'COMPLETED', durationMs: 1000, tokensUsed: 100 },
        { status: 'COMPLETED', durationMs: 2000, tokensUsed: 200 },
        { status: 'FAILED', durationMs: 500, tokensUsed: 50 },
        { status: 'TIMEOUT', durationMs: 3000, tokensUsed: 300 },
      ];

      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue(mockExecutions as any);

      // Act
      const result = await service.getAgentStats(agentId);

      // Assert
      expect(result).toEqual({
        totalExecutions: 4,
        successfulExecutions: 2,
        failedExecutions: 2,
        averageDuration: 1500, // (1000 + 2000) / 2
        totalTokensUsed: 650,
      });
    });

    it('should return zero stats when no executions', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue([]);

      // Act
      const result = await service.getAgentStats('agent-123');

      // Assert
      expect(result).toEqual({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
        totalTokensUsed: 0,
      });
    });

    it('should handle null durationMs and tokensUsed values', async () => {
      // Arrange
      const mockExecutions = [
        { status: 'COMPLETED', durationMs: null, tokensUsed: null },
        { status: 'COMPLETED', durationMs: 1000, tokensUsed: 100 },
      ];

      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue(mockExecutions as any);

      // Act
      const result = await service.getAgentStats('agent-123');

      // Assert
      expect(result).toEqual({
        totalExecutions: 2,
        successfulExecutions: 2,
        failedExecutions: 0,
        averageDuration: 500, // (0 + 1000) / 2
        totalTokensUsed: 100,
      });
    });
  });

  describe('getExecutionOutput', () => {
    it('should return execution output', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        id: 'exec-123',
        output: 'Task output',
      } as any);

      // Act
      const result = await service.getExecutionOutput('exec-123');

      // Assert
      expect(result).toBe('Task output');
    });

    it('should return null when execution not found', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue(null);

      // Act
      const result = await service.getExecutionOutput('exec-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when output is null', async () => {
      // Arrange
      vi.mocked(prisma.taskExecution.findUnique).mockResolvedValue({
        id: 'exec-123',
        output: null,
      } as any);

      // Act
      const result = await service.getExecutionOutput('exec-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('retry logic', () => {
    it('should retry execution on failure and succeed', async () => {
      // Arrange
      vi.useFakeTimers();

      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        prompt: 'Test',
        dependsOnIds: [],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
        timeout: 300000,
        maxRetries: 2,
        retryDelay: 0,
        executionMode: 'IMMEDIATE',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      let attemptCount = 0;
      mockMasterAgentService.executePrompt.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.resolve({ success: false, error: 'Temporary failure' });
        }
        return Promise.resolve({ success: true, output: 'Success on retry' });
      });

      // Act
      const resultPromise = service.executeTask('task-123', 'user-123');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2);

      vi.useRealTimers();
    });

    it('should respect maxRetries limit', async () => {
      // Arrange
      vi.useFakeTimers();

      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
        prompt: 'Test',
        dependsOnIds: [],
        agent: { id: 'agent-123', status: 'ACTIVE' },
        server: { id: 'server-123' },
        timeout: 300000,
        maxRetries: 2,
        retryDelay: 0,
        executionMode: 'IMMEDIATE',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue({
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
      } as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({} as any);

      // Always return failure
      mockMasterAgentService.executePrompt.mockImplementation(() => {
        return Promise.resolve({
          success: false,
          error: 'Always fails',
        });
      });

      // Act
      const resultPromise = service.executeTask('task-123', 'user-123');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Always fails');
      expect(mockMasterAgentService.executePrompt).toHaveBeenCalledTimes(3); // Initial + 2 retries

      vi.useRealTimers();
    });
  });
});
