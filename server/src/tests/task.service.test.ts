import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from '../services/task.service.js';
import { prisma } from '../index.js';

// Mock Prisma
vi.mock('../index.js', () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    taskExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaskService();
  });

  describe('list', () => {
    it('should list tasks with pagination', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          priority: 'HIGH',
          status: 'PENDING',
          agent: { id: 'agent-1', name: 'agent-1', displayName: 'Agent 1' },
          server: { id: 'server-1', name: 'Server 1' },
          executionMode: 'IMMEDIATE',
          scheduledAt: null,
          nextRunAt: null,
          lastRunAt: null,
          runCount: 0,
          _count: { executions: 2 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any);
      vi.mocked(prisma.task.count).mockResolvedValue(1);

      // Act
      const result = await service.list(userId, { limit: 10, offset: 0 });

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { createdById: userId },
        include: {
          agent: { select: { id: true, name: true, displayName: true } },
          server: { select: { id: true, name: true } },
          _count: { select: { executions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.tasks[0].executionCount).toBe(2);
    });

    it('should filter tasks by status', async () => {
      // Arrange
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      vi.mocked(prisma.task.count).mockResolvedValue(0);

      // Act
      await service.list('user-123', { status: 'COMPLETED' });

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'user-123', status: 'COMPLETED' },
        })
      );
    });

    it('should filter tasks by agentId', async () => {
      // Arrange
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      vi.mocked(prisma.task.count).mockResolvedValue(0);

      // Act
      await service.list('user-123', { agentId: 'agent-123' });

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'user-123', agentId: 'agent-123' },
        })
      );
    });

    it('should filter tasks by serverId', async () => {
      // Arrange
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      vi.mocked(prisma.task.count).mockResolvedValue(0);

      // Act
      await service.list('user-123', { serverId: 'server-123' });

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'user-123', serverId: 'server-123' },
        })
      );
    });

    it('should use default pagination values', async () => {
      // Arrange
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);
      vi.mocked(prisma.task.count).mockResolvedValue(0);

      // Act
      const result = await service.list('user-123');

      // Assert
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe('create', () => {
    it('should create a task with IMMEDIATE execution mode', async () => {
      // Arrange
      const input = {
        title: 'New Task',
        prompt: 'Do something',
        executionMode: 'IMMEDIATE' as const,
        createdById: 'user-123',
      };

      const mockTask = {
        id: 'task-123',
        title: 'New Task',
        status: 'PENDING',
        executionMode: 'IMMEDIATE',
        nextRunAt: null,
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Task',
          prompt: 'Do something',
          status: 'PENDING',
          executionMode: 'IMMEDIATE',
        }),
      });
      expect(result.status).toBe('PENDING');
    });

    it('should create a task with SCHEDULED execution mode', async () => {
      // Arrange
      const scheduledAt = '2025-01-15T10:00:00Z';
      const input = {
        title: 'Scheduled Task',
        prompt: 'Do later',
        executionMode: 'SCHEDULED' as const,
        scheduledAt,
        createdById: 'user-123',
      };

      const mockTask = {
        id: 'task-123',
        title: 'Scheduled Task',
        status: 'SCHEDULED',
        executionMode: 'SCHEDULED',
        nextRunAt: new Date(scheduledAt),
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'SCHEDULED',
          scheduledAt: new Date(scheduledAt),
          nextRunAt: new Date(scheduledAt),
        }),
      });
      expect(result.status).toBe('SCHEDULED');
    });

    it('should create a task with RECURRING execution mode', async () => {
      // Arrange
      const startDate = '2025-01-15T10:00:00Z';
      const input = {
        title: 'Recurring Task',
        prompt: 'Do repeatedly',
        executionMode: 'RECURRING' as const,
        recurrenceFrequency: 'DAILY' as const,
        recurrenceInterval: 1,
        startDate,
        createdById: 'user-123',
      };

      const mockTask = {
        id: 'task-123',
        title: 'Recurring Task',
        status: 'SCHEDULED',
        executionMode: 'RECURRING',
        nextRunAt: new Date(startDate),
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'SCHEDULED',
          executionMode: 'RECURRING',
          recurrenceFrequency: 'DAILY',
          recurrenceInterval: 1,
        }),
      });
    });

    it('should create a DRAFT task when no execution mode specified', async () => {
      // Arrange
      const input = {
        title: 'Draft Task',
        prompt: 'Do nothing yet',
        createdById: 'user-123',
      };

      const mockTask = {
        id: 'task-123',
        title: 'Draft Task',
        status: 'DRAFT',
        executionMode: 'IMMEDIATE',
        nextRunAt: null,
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      });
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const input = {
        title: 'Simple Task',
        prompt: 'Do it',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.create).mockResolvedValue({
        id: 'task-123',
        title: 'Simple Task',
        status: 'DRAFT',
      } as any);

      // Act
      await service.create(input);

      // Assert
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'MEDIUM',
          assignmentMode: 'MANUAL',
          requiredCapabilities: [],
          promptVariables: {},
          executionMode: 'IMMEDIATE',
          timezone: 'UTC',
          maxRetries: 3,
          retryDelay: 60000,
        }),
      });
    });
  });

  describe('getById', () => {
    it('should return task with agent, server, and executions', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        createdById: 'user-123',
        agent: { id: 'agent-1', name: 'agent-1', displayName: 'Agent 1', status: 'ACTIVE' },
        server: { id: 'server-1', name: 'Server 1', url: 'http://localhost:8080' },
        executions: [
          {
            id: 'exec-1',
            status: 'COMPLETED',
            exitCode: 0,
            tokensUsed: 100,
            durationMs: 1000,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act
      const result = await service.getById('task-123', 'user-123');

      // Assert
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-123', createdById: 'user-123' },
        include: {
          agent: { select: { id: true, name: true, displayName: true, status: true } },
          server: { select: { id: true, name: true, url: true } },
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              exitCode: true,
              tokensUsed: true,
              durationMs: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act
      const result = await service.getById('task-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update task successfully', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'Original Title',
        status: 'DRAFT',
        createdById: 'user-123',
      };

      const updatedTask = {
        id: 'task-123',
        title: 'Updated Title',
        status: 'DRAFT',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.task.update).mockResolvedValue(updatedTask as any);

      // Act
      const result = await service.update('task-123', 'user-123', { title: 'Updated Title' });

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { title: 'Updated Title' },
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('task-123', 'user-123', { title: 'New' })).rejects.toThrow(
        'Task not found'
      );
    });

    it('should throw error when updating RUNNING task', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: 'RUNNING',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.update('task-123', 'user-123', { title: 'New' })).rejects.toThrow(
        'Cannot update running or queued tasks'
      );
    });

    it('should throw error when updating QUEUED task', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: 'QUEUED',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.update('task-123', 'user-123', { title: 'New' })).rejects.toThrow(
        'Cannot update running or queued tasks'
      );
    });

    it('should convert date strings to Date objects', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: 'DRAFT',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.task.update).mockResolvedValue(mockTask as any);

      const scheduledAt = '2025-01-15T10:00:00Z';

      // Act
      await service.update('task-123', 'user-123', { scheduledAt });

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { scheduledAt: new Date(scheduledAt) },
      });
    });
  });

  describe('delete', () => {
    it('should delete task and its executions', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as any);

      // Act
      await service.delete('task-123', 'user-123');

      // Assert
      expect(prisma.taskExecution.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
      });
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-123' },
      });
    });

    it('should throw error when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('task-123', 'user-123')).rejects.toThrow('Task not found');
    });
  });

  describe('execute', () => {
    it('should create execution record and update task status', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        prompt: 'Do something',
        agentId: 'agent-123',
        createdById: 'user-123',
        agent: { id: 'agent-123', status: 'ACTIVE' },
      };

      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        agentId: 'agent-123',
        status: 'QUEUED',
        prompt: 'Do something',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.create).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, status: 'QUEUED' } as any);

      // Act
      const result = await service.execute('task-123', 'user-123');

      // Assert
      expect(prisma.taskExecution.create).toHaveBeenCalledWith({
        data: {
          taskId: 'task-123',
          agentId: 'agent-123',
          status: 'QUEUED',
          prompt: 'Do something',
        },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'QUEUED' },
      });
      expect(result.executionId).toBe('exec-123');
      expect(result.status).toBe('QUEUED');
    });

    it('should throw error when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.execute('task-123', 'user-123')).rejects.toThrow('Task not found');
    });

    it('should throw error when task has no agent', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        agentId: null,
        agent: null,
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.execute('task-123', 'user-123')).rejects.toThrow(
        'Task has no assigned agent'
      );
    });

    it('should throw error when agent is not active', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        agentId: 'agent-123',
        agent: { id: 'agent-123', status: 'ERROR' },
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act & Assert
      await expect(service.execute('task-123', 'user-123')).rejects.toThrow('Agent is not active');
    });
  });

  describe('getExecutions', () => {
    it('should return task executions', async () => {
      // Arrange
      const mockTask = { id: 'task-123', createdById: 'user-123' };
      const mockExecutions = [
        {
          id: 'exec-1',
          agent: { id: 'agent-1', name: 'agent-1', displayName: 'Agent 1' },
          status: 'COMPLETED',
          exitCode: 0,
          error: null,
          tokensUsed: 100,
          durationMs: 1000,
          startedAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'exec-2',
          agent: { id: 'agent-1', name: 'agent-1', displayName: 'Agent 1' },
          status: 'FAILED',
          exitCode: 1,
          error: 'Something went wrong',
          tokensUsed: 50,
          durationMs: 500,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue(mockExecutions as any);

      // Act
      const result = await service.getExecutions('task-123', 'user-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('COMPLETED');
      expect(result[1].error).toBe('Something went wrong');
    });

    it('should throw error when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getExecutions('task-123', 'user-123')).rejects.toThrow('Task not found');
    });
  });

  describe('updateExecutionStatus', () => {
    it('should update execution to RUNNING and update task status', async () => {
      // Arrange
      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        status: 'RUNNING',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.updateExecutionStatus('exec-123', 'RUNNING');

      // Assert
      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: { status: 'RUNNING' },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'RUNNING' },
      });
    });

    it('should update execution to COMPLETED with data', async () => {
      // Arrange
      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        status: 'COMPLETED',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.updateExecutionStatus('exec-123', 'COMPLETED', {
        output: 'Success',
        tokensUsed: 100,
        durationMs: 1500,
      });

      // Assert
      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'COMPLETED',
          output: 'Success',
          tokensUsed: 100,
          durationMs: 1500,
          completedAt: expect.any(Date),
        },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'COMPLETED',
          lastRunAt: expect.any(Date),
          runCount: { increment: 1 },
        },
      });
    });

    it('should update execution to FAILED', async () => {
      // Arrange
      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        status: 'FAILED',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.updateExecutionStatus('exec-123', 'FAILED', {
        error: 'Something went wrong',
        exitCode: 1,
      });

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'FAILED',
          lastRunAt: expect.any(Date),
          runCount: { increment: 1 },
        },
      });
    });

    it('should update execution to TIMEOUT', async () => {
      // Arrange
      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        status: 'TIMEOUT',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      // Act
      await service.updateExecutionStatus('exec-123', 'TIMEOUT');

      // Assert
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'FAILED',
          lastRunAt: expect.any(Date),
          runCount: { increment: 1 },
        },
      });
    });

    it('should update execution to CANCELLED', async () => {
      // Arrange
      const mockExecution = {
        id: 'exec-123',
        taskId: 'task-123',
        status: 'CANCELLED',
      };

      vi.mocked(prisma.taskExecution.update).mockResolvedValue(mockExecution as any);

      // Act
      const result = await service.updateExecutionStatus('exec-123', 'CANCELLED');

      // Assert
      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
        },
      });
      // Task status should not be updated for CANCELLED
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });
});
