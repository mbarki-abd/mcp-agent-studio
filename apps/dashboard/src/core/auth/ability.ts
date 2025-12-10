import { AbilityBuilder, PureAbility, AbilityClass } from '@casl/ability';
import type { Role } from '@mcp/types';

// Define all subjects (matching backend)
type AppSubjects =
  | 'User'
  | 'Organization'
  | 'ServerConfiguration'
  | 'Agent'
  | 'Task'
  | 'TaskExecution'
  | 'ToolDefinition'
  | 'ServerTool'
  | 'AgentToolPermission'
  | 'Project'
  | 'AuditLog'
  | 'all';

// Define actions
type AppActions = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'execute' | 'validate';

// Define ability type
export type AppAbility = PureAbility<[AppActions, AppSubjects]>;
const AppAbilityClass = PureAbility as AbilityClass<AppAbility>;

// Define abilities based on role (mirrors backend)
export function defineAbilitiesFor(role: Role): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbilityClass);

  switch (role) {
    case 'ADMIN':
      can('manage', 'all');
      break;

    case 'MANAGER':
      can('manage', 'ServerConfiguration');
      can('manage', 'Agent');
      can('manage', 'Task');
      can('manage', 'TaskExecution');
      can('manage', 'ServerTool');
      can('manage', 'AgentToolPermission');
      can('manage', 'Project');
      can('read', 'ToolDefinition');
      can('read', 'User');
      can('read', 'Organization');
      can('read', 'AuditLog');
      cannot('manage', 'User');
      cannot('manage', 'Organization');
      break;

    case 'OPERATOR':
      can('read', 'ServerConfiguration');
      can('read', 'Agent');
      can('execute', 'Agent');
      can('manage', 'Task');
      can('read', 'TaskExecution');
      can('read', 'ServerTool');
      can('read', 'AgentToolPermission');
      can('read', 'Project');
      can('read', 'ToolDefinition');
      cannot('create', 'ServerConfiguration');
      cannot('delete', 'ServerConfiguration');
      cannot('create', 'Agent');
      cannot('delete', 'Agent');
      cannot('validate', 'Agent');
      break;

    case 'VIEWER':
    default:
      can('read', 'ServerConfiguration');
      can('read', 'Agent');
      can('read', 'Task');
      can('read', 'TaskExecution');
      can('read', 'ServerTool');
      can('read', 'ToolDefinition');
      can('read', 'Project');
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
      cannot('execute', 'all');
      break;
  }

  return build();
}

// Create a default ability (no permissions)
export function createDefaultAbility(): AppAbility {
  const { build } = new AbilityBuilder<AppAbility>(AppAbilityClass);
  return build();
}
