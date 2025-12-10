import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../index.js';
import { TaskService } from './task.service.js';
import { MonitoringService } from './monitoring.service.js';

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Queue names
const TASK_QUEUE = 'task-execution';

// Job data interface
interface TaskJobData {
  taskId: string;
  executionId: string;
  agentId: string;
  prompt: string;
}

export class SchedulerService {
  private taskQueue: Queue<TaskJobData>;
  private worker: Worker<TaskJobData> | null = null;
  private isInitialized = false;

  constructor() {
    this.taskQueue = new Queue<TaskJobData>(TASK_QUEUE, {
      connection: redisConnection,
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
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create worker to process jobs
    this.worker = new Worker<TaskJobData>(
      TASK_QUEUE,
      async (job: Job<TaskJobData>) => {
        return this.processTask(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed for task ${job.data.taskId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    // Restore scheduled tasks from database
    await this.restoreScheduledTasks();

    this.isInitialized = true;
    console.log('Scheduler service initialized');
  }

  private async processTask(job: Job<TaskJobData>): Promise<void> {
    const { taskId, executionId, agentId, prompt } = job.data;

    try {
      // Update execution status to RUNNING
      await prisma.taskExecution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Broadcast status change
      MonitoringService.getInstance().broadcastAgentStatus(agentId, 'BUSY', 'ACTIVE', 'Executing task');

      // TODO: Actually execute the task via the agent
      // This would involve SSH/API call to the MCP server
      // For now, we simulate execution
      await this.simulateExecution(taskId, executionId, agentId, prompt);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update execution as failed
      await prisma.taskExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // Broadcast failure
      MonitoringService.getInstance().broadcastAgentStatus(agentId, 'ERROR', 'BUSY', errorMessage);

      throw error;
    }
  }

  private async simulateExecution(
    taskId: string,
    executionId: string,
    agentId: string,
    prompt: string
  ): Promise<void> {
    // Simulate task execution phases
    const phases = ['starting', 'running', 'completed'] as const;

    for (const phase of phases) {
      // Broadcast execution progress
      MonitoringService.getInstance().broadcastExecution(
        agentId,
        taskId,
        phase,
        phase === 'running' ? `Processing: ${prompt.substring(0, 50)}...` : undefined
      );

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update execution as completed
    await prisma.taskExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        output: `Simulated execution of prompt: ${prompt}`,
        completedAt: new Date(),
        durationMs: 3000,
      },
    });

    // Update task
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        lastRunAt: new Date(),
        runCount: { increment: 1 },
      },
    });

    // Reset agent status
    MonitoringService.getInstance().broadcastAgentStatus(agentId, 'ACTIVE', 'BUSY');
  }

  async scheduleTask(
    taskId: string,
    agentId: string,
    prompt: string,
    options?: {
      delay?: number;
      scheduledAt?: Date;
      priority?: number;
    }
  ): Promise<string> {
    // Create execution record
    const execution = await prisma.taskExecution.create({
      data: {
        taskId,
        agentId,
        status: 'QUEUED',
        prompt,
        startedAt: new Date(),
      },
    });

    // Calculate delay
    let delay = options?.delay || 0;
    if (options?.scheduledAt) {
      delay = Math.max(0, options.scheduledAt.getTime() - Date.now());
    }

    // Add job to queue
    const job = await this.taskQueue.add(
      'execute-task',
      {
        taskId,
        executionId: execution.id,
        agentId,
        prompt,
      },
      {
        delay,
        priority: options?.priority || 0,
        jobId: `task-${taskId}-${execution.id}`,
      }
    );

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: delay > 0 ? 'SCHEDULED' : 'QUEUED',
        nextRunAt: delay > 0 ? new Date(Date.now() + delay) : null,
      },
    });

    return job.id || execution.id;
  }

  async scheduleRecurringTask(
    taskId: string,
    agentId: string,
    prompt: string,
    cronExpression: string
  ): Promise<void> {
    // Add repeatable job
    await this.taskQueue.add(
      'execute-task',
      {
        taskId,
        executionId: '', // Will be created on each run
        agentId,
        prompt,
      },
      {
        repeat: {
          pattern: cronExpression,
        },
        jobId: `recurring-${taskId}`,
      }
    );

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'SCHEDULED',
        cronExpression,
      },
    });
  }

  async cancelTask(taskId: string): Promise<boolean> {
    // Find and remove jobs for this task
    const jobs = await this.taskQueue.getJobs(['waiting', 'delayed', 'active']);

    for (const job of jobs) {
      if (job.data.taskId === taskId) {
        await job.remove();
      }
    }

    // Remove repeatable job if exists
    await this.taskQueue.removeRepeatable('execute-task', {
      pattern: '', // Will match by jobId
    });

    // Update task and executions
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });

    await prisma.taskExecution.updateMany({
      where: {
        taskId,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    return true;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.taskQueue.getWaitingCount(),
      this.taskQueue.getActiveCount(),
      this.taskQueue.getCompletedCount(),
      this.taskQueue.getFailedCount(),
      this.taskQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  private async restoreScheduledTasks(): Promise<void> {
    // Find all scheduled/recurring tasks and re-add them to queue
    const scheduledTasks = await prisma.task.findMany({
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

    for (const task of scheduledTasks) {
      if (!task.agentId) continue;

      if (task.cronExpression) {
        await this.scheduleRecurringTask(
          task.id,
          task.agentId,
          task.prompt,
          task.cronExpression
        );
      } else if (task.scheduledAt && task.scheduledAt > new Date()) {
        await this.scheduleTask(task.id, task.agentId, task.prompt, {
          scheduledAt: task.scheduledAt,
        });
      }
    }

    console.log(`Restored ${scheduledTasks.length} scheduled tasks`);
  }

  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.taskQueue.close();
    this.isInitialized = false;
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}
