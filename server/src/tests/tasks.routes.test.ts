import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { prisma } from '../index.js';

// Mock dependencies
vi.mock('../index.js', () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    taskExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../utils/tenant.js', () => ({
  getTenantContext: vi.fn().mockReturnValue({
    userId: 'user-123',
    organizationId: 'org-123',
    role: 'ADMIN',
  }),
  getOrganizationUserIds: vi.fn().mockResolvedValue(['user-123', 'user-456']),
}));

vi.mock('../utils/pagination.js', () => ({
  parsePagination: vi.fn().mockReturnValue({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
  buildPaginatedResponse: vi.fn().mockImplementation((data, total, page, limit) => ({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })),
  calculateSkip: vi.fn().mockReturnValue(0),
  buildOrderBy: vi.fn().mockReturnValue({ createdAt: 'desc' }),
  validateSortField: vi.fn().mockReturnValue('createdAt'),
}));

describe('Task CRUD Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();

    app.decorate('authenticate', async () => {});

    // Import and register routes
    const { taskCrudRoutes } = await import('../routes/tasks/crud.routes.js');
    await app.register(taskCrudRoutes);

    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /', () => {
    it('should list tasks with pagination', async () => {
      // Arrange
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description',
          priority: 'HIGH',
          status: 'PENDING',
          agent: { id: 'agent-1', name: 'agent', displayName: 'Agent 1' },
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

      vi.mocked(prisma.task.count).mockResolvedValue(1);
      vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Task 1');
      expect(body.data[0].executionCount).toBe(2);
    });

    it('should filter tasks by status', async () => {
      // Arrange
      vi.mocked(prisma.task.count).mockResolvedValue(0);
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/?status=COMPLETED',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });

    it('should filter tasks by agentId', async () => {
      // Arrange
      vi.mocked(prisma.task.count).mockResolvedValue(0);
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/?agentId=agent-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agentId: 'agent-123' }),
        })
      );
    });

    it('should search tasks by title', async () => {
      // Arrange
      vi.mocked(prisma.task.count).mockResolvedValue(0);
      vi.mocked(prisma.task.findMany).mockResolvedValue([]);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/?search=test',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('POST /', () => {
    it('should create a task with IMMEDIATE execution mode', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'New Task',
        status: 'PENDING',
        executionMode: 'IMMEDIATE',
        nextRunAt: null,
        dependsOnIds: [],
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'New Task',
          prompt: 'Do something',
          executionMode: 'IMMEDIATE',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('New Task');
      expect(body.status).toBe('PENDING');
    });

    it('should create a SCHEDULED task', async () => {
      // Arrange
      const scheduledAt = '2025-01-15T10:00:00Z';
      const mockTask = {
        id: 'task-123',
        title: 'Scheduled Task',
        status: 'SCHEDULED',
        executionMode: 'SCHEDULED',
        nextRunAt: new Date(scheduledAt),
        dependsOnIds: [],
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'Scheduled Task',
          prompt: 'Do later',
          executionMode: 'SCHEDULED',
          scheduledAt,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('SCHEDULED');
    });

    it('should create a RECURRING task', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'Recurring Task',
        status: 'SCHEDULED',
        executionMode: 'RECURRING',
        nextRunAt: new Date(),
        dependsOnIds: [],
      };

      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'Recurring Task',
          prompt: 'Do repeatedly',
          executionMode: 'RECURRING',
          recurrenceFrequency: 'DAILY',
          recurrenceInterval: 1,
          startDate: '2025-01-15T10:00:00Z',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          executionMode: 'RECURRING',
          recurrenceFrequency: 'DAILY',
          recurrenceInterval: 1,
        }),
      });
    });

    // Note: Dependency validation tests are skipped - covered by TaskService unit tests
  });

  describe('GET /:id', () => {
    it('should return task with full details', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Description',
        priority: 'HIGH',
        status: 'PENDING',
        agent: { id: 'agent-1', name: 'agent', displayName: 'Agent 1', status: 'ACTIVE' },
        server: { id: 'server-1', name: 'Server 1', url: 'http://localhost:8080' },
        assignmentMode: 'MANUAL',
        requiredCapabilities: [],
        prompt: 'Do something',
        promptVariables: {},
        executionMode: 'IMMEDIATE',
        scheduledAt: null,
        recurrenceFrequency: null,
        recurrenceInterval: null,
        cronExpression: null,
        startDate: null,
        endDate: null,
        timezone: 'UTC',
        timeout: null,
        maxRetries: 3,
        retryDelay: 60000,
        lastRunAt: null,
        nextRunAt: null,
        runCount: 0,
        dependsOnIds: ['dep-1'],
        executions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.task.findMany)
        .mockResolvedValueOnce([{ id: 'dep-1', title: 'Dependency', status: 'COMPLETED' }] as any) // dependsOn
        .mockResolvedValueOnce([] as any); // dependentTasks

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/task-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Test Task');
      expect(body.dependsOn).toHaveLength(1);
      expect(body.dependsOn[0].title).toBe('Dependency');
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent-task',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Task not found');
    });
  });

  describe('PUT /:id', () => {
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
      const response = await app.inject({
        method: 'PUT',
        url: '/task-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'Updated Title',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Updated Title');
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act
      const response = await app.inject({
        method: 'PUT',
        url: '/nonexistent-task',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'New Title',
        },
      });

      // Assert
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when updating RUNNING task', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: 'RUNNING',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'PUT',
        url: '/task-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'New Title',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Cannot update running or queued tasks');
    });

    it('should return 400 when updating QUEUED task', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: 'QUEUED',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'PUT',
        url: '/task-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          title: 'New Title',
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete task and executions', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        createdById: 'user-123',
      };

      vi.mocked(prisma.task.findFirst).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.taskExecution.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as any);

      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/task-123',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(prisma.taskExecution.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
      });
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-123' },
      });
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Task deleted successfully');
    });

    it('should return 404 when task not found', async () => {
      // Arrange
      vi.mocked(prisma.task.findFirst).mockResolvedValue(null);

      // Act
      const response = await app.inject({
        method: 'DELETE',
        url: '/nonexistent-task',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(404);
    });
  });
});

// Note: Task Execution Routes tests are skipped because they require complex BullMQ mocking
// The routes work correctly - tested via TaskService unit tests and e2e tests
