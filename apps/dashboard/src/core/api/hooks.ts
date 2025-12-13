// =====================================================
// MCP Agent Studio - Hooks (Legacy Export)
// =====================================================
// DEPRECATED: This file is deprecated in favor of importing from './hooks/'
// It re-exports everything from the new modular structure for backward compatibility.
//
// MIGRATION GUIDE:
// Old: import { useServers } from '@/core/api/hooks';
// New: import { useServers } from '@/core/api/hooks';  (still works!)
//
// The hooks have been reorganized into domain-specific files:
// - hooks/common.ts    - Query keys and shared utilities
// - hooks/auth.ts      - Authentication hooks
// - hooks/servers.ts   - Server management hooks
// - hooks/agents.ts    - Agent management hooks
// - hooks/tasks.ts     - Task management hooks
// - hooks/tools.ts     - Tool management hooks
// - hooks/organization.ts - Organization and API Keys hooks
// - hooks/misc.ts      - Chat, Audit, Dashboard, Billing, Analytics hooks
//
// You can now import directly from specific domains if needed:
// import { useServers } from '@/core/api/hooks/servers';
// =====================================================

// Re-export everything from the new modular structure
export * from './hooks';
