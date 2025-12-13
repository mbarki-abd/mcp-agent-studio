import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { SchedulerService, getScheduler } from '../services/scheduler.service.js';
import { prisma } from '../index.js';
import { MonitoringService } from '../services/monitoring.service.js';
import { getMasterAgentService } from '../services/master-agent.service.js';

// Mock BullMQ
vi.mock('bullmq', () => {
  const mockQueue = {
    add: vi.fn(),
    getJobs: vi.fn(),
    removeRepeatable: vi.fn(),
    close: vi.fn(),
    getWaitingCount: vi.fn(),
    getActiveCount: vi.fn(),
    getCompletedCount: vi.fn(),
    getFailedCount: vi.fn(),
    getDelayedCount: vi.fn(),
  };

  const mockWorker = {
    on: vi.fn(),
    close: vi.fn(),
  };

  return {
    Queue: vi.fn(() => mockQueue),
    Worker: vi.fn(() => mockWorker),
  };
});

// Mock Prisma
vi.mock('../index.js', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    taskExecution: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock MonitoringService
vi.mock('../services/monitoring.service.js', () => ({
  MonitoringService: {
    getInstance: vi.fn(() => ({
      broadcastAgentStatus: vi.fn(),
      broadcastExecution: vi.fn(),
    })),
  },
}));

// Mock MasterAgentService
vi.mock('../services/master-agent.service.js', () => ({
  getMasterAgentService: vi.fn(),
  MasterAgentService: vi.fn(),
}));

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockQueue: any;
  let mockWorker: any;
  let mockMonitoring: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mock instances
    schedulerService = new SchedulerService();
    mockQueue = (schedulerService as any).taskQueue;

    // Setup default mock implementations
    mockMonitoring = MonitoringService.getInstance();

    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.taskExecution.create).mockResolvedValue({
      id: 'exec-123',
      taskId: 'task-123',
      agentId: 'agent-123',
      status: 'QUEUED',
      prompt: 'test prompt',
      startedAt: new Date(),
      completedAt: null,
      output: null,
      error: null,
      durationMs: null,
      tokensUsed: null,
      exitCode: null,
    });
  });

  afterEach(async () => {
    if (schedulerService) {
      await schedulerService.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create Queue instance with correct configuration', () => {
      expect(Queue).toHaveBeenCalledWith('task-execution', {
        connection: expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
        }),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
    });
  });

  describe('initialize', () => {
    it('should create Worker and setup event handlers', async () => {
      await schedulerService.initialize();

      expect(Worker).toHaveBeenCalledWith(
        'task-execution',
        expect.any(Function),
        {
          connection: expect.objectContaining({
            host: expect.any(String),
            port: expect.any(Number),
          }),
          concurrency: 5,
        }
      );

      mockWorker = (schedulerService as any).worker;
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should restore scheduled tasks from database', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          agentId: 'agent-1',
          prompt: 'Test task',
          cronExpression: '0 0 * * *',
          scheduledAt: null,
          status: 'SCHEDULED',
        },
      ];

      vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await schedulerService.initialize();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['SCHEDULED', 'QUEUED'] },
          OR: [
            { scheduledAt: { not: null } },
            { cronExpression: { not: null } },
          ],
        },
        include: {
          agent: true,
        },
      });
    });

    it('should not initialize twice', async () => {
      await schedulerService.initialize();
      const workerCallCount = (Worker as any).mock.calls.length;

      await schedulerService.initialize();

      expect((Worker as any).mock.calls.length).toBe(workerCallCount);
    });

    it('should handle empty task list during restore', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      await expect(schedulerService.initialize()).resolves.not.toThrow();
    });
  });

  describe('scheduleTask', () => {
    beforeEach(() => {
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      mockQueue.add.mockResolvedValue({ id: 'job-123' });
    });

    it('should schedule immediate task without delay', async () => {
      const taskId = 'task-123';
      const agentId = 'agent-123';
      const prompt = 'Execute this task';

      const jobId = await schedulerService.scheduleTask(taskId, agentId, prompt);

      expect(prisma.taskExecution.create).toHaveBeenCalledWith({
        data: {
          taskId,
          agentId,
          status: 'QUEUED',
          prompt,
          startedAt: expect.any(Date),
        },
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-task',
        {
          taskId,
          executionId: 'exec-123',
          agentId,
          prompt,
        },
        {
          delay: 0,
          priority: 0,
          jobId: `task-${taskId}-exec-123`,
        }
      );

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'QUEUED',
          nextRunAt: null,
        },
      });

      expect(jobId).toBe('job-123');
    });

    it('should schedule task with delay', async () => {
      const delay = 5000;

      await schedulerService.scheduleTask('task-123', 'agent-123', 'test', {
        delay,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-task',
        expect.any(Object),
        expect.objectContaining({
          delay: 5000,
        })
      );

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'SCHEDULED',
          nextRunAt: expect.any(Date),
        },
      });
    });

    it('should schedule task with scheduledAt date', async () => {
      const scheduledAt = new Date(Date.now() + 10000);

      await schedulerService.scheduleTask('task-123', 'agent-123', 'test', {
        scheduledAt,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-task',
        expect.any(Object),
        expect.objectContaining({
          delay: expect.any(Number),
        })
      );

      const delay = (mockQueue.add as any).mock.calls[0][2].delay;
      expect(delay).toBeGreaterThan(0);
    });

    it('should schedule task with custom priority', async () => {
      await schedulerService.scheduleTask('task-123', 'agent-123', 'test', {
        priority: 10,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-task',
        expect.any(Object),
        expect.objectContaining({
          priority: 10,
        })
      );
    });

    it('should handle past scheduledAt as immediate execution', async () => {
      const pastDate = new Date(Date.now() - 10000);

      await schedulerService.scheduleTask('task-123', 'agent-123', 'test', {
        scheduledAt: pastDate,
      });

      const delay = (mockQueue.add as any).mock.calls[0][2].delay;
      expect(delay).toBe(0);
    });
  });

  describe('scheduleRecurringTask', () => {
    beforeEach(() => {
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      mockQueue.add.mockResolvedValue({ id: 'recurring-job-123' });
    });

    it('should schedule recurring task with cron expression', async () => {
      const cronExpression = '0 0 * * *';

      await schedulerService.scheduleRecurringTask(
        'task-123',
        'agent-123',
        'Daily task',
        cronExpression
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-task',
        {
          taskId: 'task-123',
          executionId: '',
          agentId: 'agent-123',
          prompt: 'Daily task',
        },
        {
          repeat: {
            pattern: cronExpression,
          },
          jobId: 'recurring-task-123',
        }
      );

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: {
          status: 'SCHEDULED',
          cronExpression,
        },
      });
    });

    it('should accept different cron patterns', async () => {
      const patterns = [
        '*/5 * * * *', // Every 5 minutes
        '0 */2 * * *', // Every 2 hours
        '0 9 * * 1-5', // Weekdays at 9am
      ];

      for (const pattern of patterns) {
        await schedulerService.scheduleRecurringTask(
          `task-${pattern}`,
          'agent-123',
          'test',
          pattern
        );
      }

      expect(mockQueue.add).toHaveBeenCalledTimes(patterns.length);
    });
  });

  describe('cancelTask', () => {
    beforeEach(() => {
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      vi.mocked(prisma.taskExecution.updateMany).mockResolvedValue({ count: 2 } as any);
    });

    it('should cancel waiting and delayed jobs', async () => {
      const mockJobs = [
        { data: { taskId: 'task-123' }, remove: vi.fn() },
        { data: { taskId: 'task-456' }, remove: vi.fn() },
        { data: { taskId: 'task-123' }, remove: vi.fn() },
      ];

      mockQueue.getJobs.mockResolvedValue(mockJobs);

      const result = await schedulerService.cancelTask('task-123');

      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed', 'active']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
      expect(mockJobs[2].remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should update task status to CANCELLED', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      await schedulerService.cancelTask('task-123');

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should update pending executions to CANCELLED', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      await schedulerService.cancelTask('task-123');

      expect(prisma.taskExecution.updateMany).toHaveBeenCalledWith({
        where: {
          taskId: 'task-123',
          status: { in: ['QUEUED', 'RUNNING'] },
        },
        data: {
          status: 'CANCELLED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should remove repeatable jobs', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      await schedulerService.cancelTask('task-123');

      expect(mockQueue.removeRepeatable).toHaveBeenCalledWith('execute-task', {
        pattern: '',
      });
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(7);

      const stats = await schedulerService.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 7,
      });
    });

    it('should handle zero counts', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const stats = await schedulerService.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('processTask (via Worker)', () => {
    let processTaskFn: Function;

    beforeEach(async () => {
      // Recreate monitoring mock for each test
      const freshMonitoring = {
        broadcastAgentStatus: vi.fn(),
        broadcastExecution: vi.fn(),
      };
      vi.mocked(MonitoringService.getInstance).mockReturnValue(freshMonitoring as any);

      // Initialize to get the worker
      await schedulerService.initialize();

      // Extract the process function passed to Worker constructor
      const workerConstructorCall = (Worker as any).mock.calls[0];
      processTaskFn = workerConstructorCall[1];

      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: 'agent-123',
        serverId: 'server-123',
        server: { id: 'server-123' },
      } as any);

      vi.mocked(prisma.taskExecution.update).mockResolvedValue({} as any);
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);

      const mockMasterService = {
        executePrompt: vi.fn().mockResolvedValue({
          success: true,
          output: 'Task completed successfully',
          tokensUsed: 150,
        }),
      };

      vi.mocked(getMasterAgentService).mockResolvedValue(mockMasterService as any);
    });

    it('should process task successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          taskId: 'task-123',
          executionId: 'exec-123',
          agentId: 'agent-123',
          prompt: 'Test prompt',
        },
      } as Job;

      await processTaskFn(mockJob);

      expect(prisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        include: { server: true },
      });

      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'RUNNING',
          startedAt: expect.any(Date),
        },
      });

      const monitoring = MonitoringService.getInstance();
      expect(monitoring.broadcastAgentStatus).toHaveBeenCalledWith(
        'agent-123',
        'BUSY',
        'ACTIVE',
        'Executing task'
      );
    });

    it('should update execution as COMPLETED on success', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          taskId: 'task-123',
          executionId: 'exec-123',
          agentId: 'agent-123',
          prompt: 'Test prompt',
        },
      } as Job;

      await processTaskFn(mockJob);

      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: {
          status: 'COMPLETED',
          output: 'Task completed successfully',
          completedAt: expect.any(Date),
          durationMs: expect.any(Number),
          tokensUsed: 150,
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

    it('should handle agent not found error', async () => {
      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);

      const mockJob = {
        id: 'job-123',
        data: {
          taskId: 'task-123',
          executionId: 'exec-123',
          agentId: 'agent-999',
          prompt: 'Test',
        },
      } as Job;

      await expect(processTaskFn(mockJob)).rejects.toThrow('Agent not found');

      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: expect.stringContaining('Agent not found'),
        }),
      });
    });

    it('should handle execution failure', async () => {
      const mockMasterService = {
        executePrompt: vi.fn().mockResolvedValue({
          success: false,
          error: 'Execution failed',
        }),
      };

      vi.mocked(getMasterAgentService).mockResolvedValue(mockMasterService as any);

      const mockJob = {
        id: 'job-123',
        data: {
          taskId: 'task-123',
          executionId: 'exec-123',
          agentId: 'agent-123',
          prompt: 'Test',
        },
      } as Job;

      await expect(processTaskFn(mockJob)).rejects.toThrow();

      expect(prisma.taskExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Execution failed',
        }),
      });

      const monitoring = MonitoringService.getInstance();
      expect(monitoring.broadcastAgentStatus).toHaveBeenCalledWith(
        'agent-123',
        'ERROR',
        'BUSY',
        'Execution failed'
      );
    });

    it('should track execution duration', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          taskId: 'task-123',
          executionId: 'exec-123',
          agentId: 'agent-123',
          prompt: 'Test',
        },
      } as Job;

      await processTaskFn(mockJob);

      const updateCall = vi.mocked(prisma.taskExecution.update).mock.calls.find(
        (call) => call[0].data.status === 'COMPLETED'
      );

      expect(updateCall![0].data.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('shutdown', () => {
    it('should close worker and queue gracefully', async () => {
      await schedulerService.initialize();

      mockWorker = (schedulerService as any).worker;

      await schedulerService.shutdown();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(schedulerService.shutdown()).resolves.not.toThrow();
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should mark as not initialized after shutdown', async () => {
      await schedulerService.initialize();
      await schedulerService.shutdown();

      expect((schedulerService as any).isInitialized).toBe(false);
    });
  });

  describe('getScheduler (singleton)', () => {
    it('should return same instance', () => {
      const instance1 = getScheduler();
      const instance2 = getScheduler();

      expect(instance1).toBe(instance2);
    });

    it('should create instance on first call', () => {
      const instance = getScheduler();
      expect(instance).toBeInstanceOf(SchedulerService);
    });
  });
});
