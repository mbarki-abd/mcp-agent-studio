import { describe, it, expect, beforeEach } from 'vitest';
import { defineAbilitiesFor } from '../middleware/rbac.middleware.js';
import { JWTPayload } from '../middleware/auth.middleware.js';

describe('RBAC Middleware', () => {
  describe('defineAbilitiesFor', () => {
    describe('ADMIN role', () => {
      let adminAbility: any;

      beforeEach(() => {
        const adminUser: JWTPayload = {
          userId: 'admin-123',
          role: 'ADMIN',
          organizationId: 'org-123',
        };
        adminAbility = defineAbilitiesFor(adminUser);
      });

      it('should allow ADMIN to manage all resources', () => {
        // Assert
        expect(adminAbility.can('manage', 'all')).toBe(true);
        expect(adminAbility.can('create', 'User')).toBe(true);
        expect(adminAbility.can('delete', 'Organization')).toBe(true);
        expect(adminAbility.can('update', 'Agent')).toBe(true);
        expect(adminAbility.can('read', 'AuditLog')).toBe(true);
      });

      it('should allow ADMIN to perform all actions', () => {
        // Assert
        expect(adminAbility.can('create', 'ServerConfiguration')).toBe(true);
        expect(adminAbility.can('read', 'Task')).toBe(true);
        expect(adminAbility.can('update', 'Agent')).toBe(true);
        expect(adminAbility.can('delete', 'Project')).toBe(true);
        expect(adminAbility.can('execute', 'Agent')).toBe(true);
        expect(adminAbility.can('validate', 'Agent')).toBe(true);
      });
    });

    describe('MANAGER role', () => {
      let managerAbility: any;

      beforeEach(() => {
        const managerUser: JWTPayload = {
          userId: 'manager-123',
          role: 'MANAGER',
          organizationId: 'org-123',
        };
        managerAbility = defineAbilitiesFor(managerUser);
      });

      it('should allow MANAGER to manage most resources', () => {
        // Assert
        expect(managerAbility.can('manage', 'ServerConfiguration')).toBe(true);
        expect(managerAbility.can('manage', 'Agent')).toBe(true);
        expect(managerAbility.can('manage', 'Task')).toBe(true);
        expect(managerAbility.can('manage', 'ServerTool')).toBe(true);
        expect(managerAbility.can('manage', 'Project')).toBe(true);
      });

      it('should allow MANAGER to read Users and Organization', () => {
        // Assert
        expect(managerAbility.can('read', 'User')).toBe(true);
        expect(managerAbility.can('read', 'Organization')).toBe(true);
        expect(managerAbility.can('read', 'AuditLog')).toBe(true);
      });

      it('should not allow MANAGER to manage Users', () => {
        // Assert
        expect(managerAbility.can('create', 'User')).toBe(false);
        expect(managerAbility.can('update', 'User')).toBe(false);
        expect(managerAbility.can('delete', 'User')).toBe(false);
      });

      it('should not allow MANAGER to manage Organization', () => {
        // Assert
        expect(managerAbility.can('create', 'Organization')).toBe(false);
        expect(managerAbility.can('update', 'Organization')).toBe(false);
        expect(managerAbility.can('delete', 'Organization')).toBe(false);
      });

      it('should allow MANAGER to read ToolDefinition', () => {
        // Assert
        expect(managerAbility.can('read', 'ToolDefinition')).toBe(true);
      });
    });

    describe('OPERATOR role', () => {
      let operatorAbility: any;

      beforeEach(() => {
        const operatorUser: JWTPayload = {
          userId: 'operator-123',
          role: 'OPERATOR',
          organizationId: 'org-123',
        };
        operatorAbility = defineAbilitiesFor(operatorUser);
      });

      it('should allow OPERATOR to read configurations and agents', () => {
        // Assert
        expect(operatorAbility.can('read', 'ServerConfiguration')).toBe(true);
        expect(operatorAbility.can('read', 'Agent')).toBe(true);
        expect(operatorAbility.can('read', 'ServerTool')).toBe(true);
        expect(operatorAbility.can('read', 'Project')).toBe(true);
      });

      it('should allow OPERATOR to execute agents', () => {
        // Assert
        expect(operatorAbility.can('execute', 'Agent')).toBe(true);
      });

      it('should allow OPERATOR to manage tasks', () => {
        // Assert
        expect(operatorAbility.can('manage', 'Task')).toBe(true);
        expect(operatorAbility.can('create', 'Task')).toBe(true);
        expect(operatorAbility.can('update', 'Task')).toBe(true);
        expect(operatorAbility.can('delete', 'Task')).toBe(true);
      });

      it('should allow OPERATOR to read task executions', () => {
        // Assert
        expect(operatorAbility.can('read', 'TaskExecution')).toBe(true);
      });

      it('should not allow OPERATOR to create servers', () => {
        // Assert
        expect(operatorAbility.can('create', 'ServerConfiguration')).toBe(false);
      });

      it('should not allow OPERATOR to delete servers', () => {
        // Assert
        expect(operatorAbility.can('delete', 'ServerConfiguration')).toBe(false);
      });

      it('should not allow OPERATOR to create agents', () => {
        // Assert
        expect(operatorAbility.can('create', 'Agent')).toBe(false);
      });

      it('should not allow OPERATOR to delete agents', () => {
        // Assert
        expect(operatorAbility.can('delete', 'Agent')).toBe(false);
      });

      it('should not allow OPERATOR to validate agents', () => {
        // Assert
        expect(operatorAbility.can('validate', 'Agent')).toBe(false);
      });
    });

    describe('VIEWER role', () => {
      let viewerAbility: any;

      beforeEach(() => {
        const viewerUser: JWTPayload = {
          userId: 'viewer-123',
          role: 'VIEWER',
          organizationId: 'org-123',
        };
        viewerAbility = defineAbilitiesFor(viewerUser);
      });

      it('should allow VIEWER to read most resources', () => {
        // Assert
        expect(viewerAbility.can('read', 'ServerConfiguration')).toBe(true);
        expect(viewerAbility.can('read', 'Agent')).toBe(true);
        expect(viewerAbility.can('read', 'Task')).toBe(true);
        expect(viewerAbility.can('read', 'TaskExecution')).toBe(true);
        expect(viewerAbility.can('read', 'ServerTool')).toBe(true);
        expect(viewerAbility.can('read', 'Project')).toBe(true);
      });

      it('should not allow VIEWER to create resources', () => {
        // Assert
        expect(viewerAbility.can('create', 'ServerConfiguration')).toBe(false);
        expect(viewerAbility.can('create', 'Agent')).toBe(false);
        expect(viewerAbility.can('create', 'Task')).toBe(false);
        expect(viewerAbility.can('create', 'Project')).toBe(false);
      });

      it('should not allow VIEWER to update resources', () => {
        // Assert
        expect(viewerAbility.can('update', 'ServerConfiguration')).toBe(false);
        expect(viewerAbility.can('update', 'Agent')).toBe(false);
        expect(viewerAbility.can('update', 'Task')).toBe(false);
      });

      it('should not allow VIEWER to delete resources', () => {
        // Assert
        expect(viewerAbility.can('delete', 'ServerConfiguration')).toBe(false);
        expect(viewerAbility.can('delete', 'Agent')).toBe(false);
        expect(viewerAbility.can('delete', 'Task')).toBe(false);
      });

      it('should not allow VIEWER to execute agents', () => {
        // Assert
        expect(viewerAbility.can('execute', 'Agent')).toBe(false);
      });
    });

    describe('Default/Unknown role', () => {
      it('should treat unknown role as VIEWER', () => {
        // Arrange
        const unknownUser: JWTPayload = {
          userId: 'user-123',
          role: 'UNKNOWN_ROLE',
          organizationId: 'org-123',
        };

        // Act
        const ability = defineAbilitiesFor(unknownUser);

        // Assert
        expect(ability.can('read', 'ServerConfiguration')).toBe(true);
        expect(ability.can('create', 'Agent')).toBe(false);
        expect(ability.can('execute', 'Agent')).toBe(false);
      });

      it('should treat undefined role as VIEWER', () => {
        // Arrange
        const userWithoutRole: JWTPayload = {
          userId: 'user-123',
          organizationId: 'org-123',
        };

        // Act
        const ability = defineAbilitiesFor(userWithoutRole);

        // Assert
        expect(ability.can('read', 'Task')).toBe(true);
        expect(ability.can('manage', 'Task')).toBe(false);
      });
    });

    describe('Role hierarchy', () => {
      it('should have correct permission hierarchy', () => {
        // Arrange
        const admin: JWTPayload = { userId: '1', role: 'ADMIN', organizationId: 'org' };
        const manager: JWTPayload = { userId: '2', role: 'MANAGER', organizationId: 'org' };
        const operator: JWTPayload = { userId: '3', role: 'OPERATOR', organizationId: 'org' };
        const viewer: JWTPayload = { userId: '4', role: 'VIEWER', organizationId: 'org' };

        const adminAbility = defineAbilitiesFor(admin);
        const managerAbility = defineAbilitiesFor(manager);
        const operatorAbility = defineAbilitiesFor(operator);
        const viewerAbility = defineAbilitiesFor(viewer);

        // Assert - User management
        expect(adminAbility.can('manage', 'User')).toBe(true);
        expect(managerAbility.can('manage', 'User')).toBe(false);
        expect(operatorAbility.can('manage', 'User')).toBe(false);
        expect(viewerAbility.can('manage', 'User')).toBe(false);

        // Assert - Agent management
        expect(adminAbility.can('manage', 'Agent')).toBe(true);
        expect(managerAbility.can('manage', 'Agent')).toBe(true);
        expect(operatorAbility.can('manage', 'Agent')).toBe(false);
        expect(viewerAbility.can('manage', 'Agent')).toBe(false);

        // Assert - Agent execution
        expect(adminAbility.can('execute', 'Agent')).toBe(true);
        expect(managerAbility.can('execute', 'Agent')).toBe(true);
        expect(operatorAbility.can('execute', 'Agent')).toBe(true);
        expect(viewerAbility.can('execute', 'Agent')).toBe(false);

        // Assert - Reading
        expect(adminAbility.can('read', 'Task')).toBe(true);
        expect(managerAbility.can('read', 'Task')).toBe(true);
        expect(operatorAbility.can('read', 'Task')).toBe(true);
        expect(viewerAbility.can('read', 'Task')).toBe(true);
      });
    });
  });
});
