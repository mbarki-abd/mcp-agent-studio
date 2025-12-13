# MCP Server WebSocket Documentation

## Overview

The `MCPServerWebSocket` module provides a React Context-based WebSocket client for connecting to remote mcp-agent-server instances via the `/ws/dashboard` endpoint.

## Features

- Native WebSocket connection (not Socket.IO)
- Automatic reconnection with exponential backoff (max 5 attempts)
- Topic-based subscriptions (agents, tasks, projects, system, agent:{id}, project:{id})
- Real-time event streaming
- Type-safe event handlers
- Connection state management
- Automatic state synchronization

## Basic Usage

### 1. Wrap your app with MCPServerProvider

```tsx
import { MCPServerProvider } from '@/core/websocket';

function App() {
  const serverUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:8000';

  return (
    <MCPServerProvider
      serverUrl={serverUrl}
      autoConnect={true}
      reconnectAttempts={5}
      reconnectDelay={1000}
    >
      <YourApp />
    </MCPServerProvider>
  );
}
```

### 2. Access connection state

```tsx
import { useMCPServer } from '@/core/websocket';

function ConnectionStatus() {
  const { connectionState, isConnected, reconnectAttempt } = useMCPServer();

  return (
    <div>
      Status: {connectionState}
      {connectionState === 'reconnecting' && ` (attempt ${reconnectAttempt})`}
    </div>
  );
}
```

### 3. Access server state

```tsx
import { useMCPServerState } from '@/core/websocket';

function AgentsList() {
  const { agents, stats } = useMCPServerState();

  return (
    <div>
      <h2>Agents ({agents.length})</h2>
      <ul>
        {agents.map(agent => (
          <li key={agent.id}>
            {agent.displayName} - {agent.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4. Subscribe to topics

```tsx
import { useMCPServerSubscription } from '@/core/websocket';

function AgentsMonitor() {
  // Subscribe to all agent events
  useMCPServerSubscription('agents');

  // Subscribe to specific agent
  useMCPServerSubscription('agent:agent_123');

  return <div>Monitoring agents...</div>;
}
```

### 5. Listen to events

```tsx
import { useCallback } from 'react';
import { useMCPAgentUpdate, useMCPTaskProgress } from '@/core/websocket';

function EventListener() {
  // IMPORTANT: Wrap callbacks with useCallback to prevent memory leaks
  const handleAgentUpdate = useCallback((agent) => {
    console.log('Agent updated:', agent);
    // Show notification, update UI, etc.
  }, []);

  const handleTaskProgress = useCallback(({ taskId, progress, message }) => {
    console.log(`Task ${taskId}: ${progress}%`, message);
  }, []);

  useMCPAgentUpdate(handleAgentUpdate);
  useMCPTaskProgress(handleTaskProgress);

  return <div>Listening for events...</div>;
}
```

## Advanced Usage

### Multiple Providers for Different Servers

You can have multiple WebSocket connections to different servers:

```tsx
function MultiServerApp() {
  return (
    <>
      <MCPServerProvider serverUrl="http://server1.example.com:8000">
        <Server1Dashboard />
      </MCPServerProvider>

      <MCPServerProvider serverUrl="http://server2.example.com:8000">
        <Server2Dashboard />
      </MCPServerProvider>
    </>
  );
}
```

### Manual Connection Control

```tsx
import { useMCPServer } from '@/core/websocket';

function ManualConnection() {
  const { connect, disconnect, isConnected } = useMCPServer();

  return (
    <div>
      <button onClick={connect} disabled={isConnected}>
        Connect
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
    </div>
  );
}
```

### Request State Updates

```tsx
import { useMCPServer } from '@/core/websocket';

function RefreshButton() {
  const { getState, getAgentDetails } = useMCPServer();

  return (
    <>
      <button onClick={getState}>
        Refresh All
      </button>
      <button onClick={() => getAgentDetails('agent_123')}>
        Get Agent Details
      </button>
    </>
  );
}
```

### Subscribe to Multiple Topics

```tsx
import { useMCPServerSubscriptions } from '@/core/websocket';

function DashboardMonitor() {
  useMCPServerSubscriptions(['agents', 'tasks', 'projects', 'system']);

  return <div>Monitoring all topics...</div>;
}
```

## Available Events

| Event | Hook | Data Type |
|-------|------|-----------|
| Agent Update | `useMCPAgentUpdate` | `MCPAgent` |
| Agent Created | `useMCPAgentCreated` | `MCPAgent` |
| Agent Deleted | `useMCPAgentDeleted` | `{ agentId: string }` |
| Project Created | `useMCPProjectCreated` | `MCPProject` |
| Project Update | `useMCPProjectUpdate` | `MCPProject` |
| Project Deleted | `useMCPProjectDeleted` | `{ projectId: string }` |
| Task Started | `useMCPTaskStarted` | `MCPTask` |
| Task Progress | `useMCPTaskProgress` | `{ taskId, progress, message }` |
| Task Completed | `useMCPTaskCompleted` | `MCPTask` |
| Task Error | `useMCPTaskError` | `{ taskId, error }` |
| System Stats | `useMCPSystemStats` | `SystemStats` |

## Available Topics

| Topic | Description |
|-------|-------------|
| `agents` | All agent events |
| `tasks` | All task events |
| `projects` | All project events |
| `system` | System stats and health |
| `agent:{id}` | Specific agent events |
| `project:{id}` | Specific project events |

## Connection States

| State | Description |
|-------|-------------|
| `disconnected` | Not connected |
| `connecting` | Initial connection attempt |
| `connected` | Successfully connected |
| `reconnecting` | Attempting to reconnect after disconnect |
| `error` | Connection failed (max retries reached) |

## Type Definitions

```typescript
interface MCPAgent {
  id: string;
  name: string;
  displayName: string;
  status: 'idle' | 'busy' | 'error' | 'stopped';
  serverId: string;
  capabilities: string[];
  currentTask?: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPProject {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  serverId: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPTask {
  id: string;
  agentId: string;
  projectId?: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface SystemStats {
  activeAgents: number;
  totalAgents: number;
  activeTasks: number;
  totalTasks: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
}
```

## Best Practices

1. **Always wrap event callbacks with `useCallback`** to prevent memory leaks and unnecessary re-subscriptions
2. **Subscribe to topics at the component level** where you need the data
3. **Unsubscribe automatically** by using the provided hooks (cleanup is handled)
4. **Use `useMCPServerState()`** to access the current state (agents, projects, tasks, stats)
5. **Monitor connection state** to show appropriate UI (loading, error, reconnecting)
6. **Handle reconnection gracefully** - the provider will auto-reconnect with exponential backoff

## Troubleshooting

### WebSocket fails to connect

1. Check that `VITE_MCP_SERVER_URL` environment variable is set correctly
2. Ensure the server URL is reachable
3. Verify CORS settings on the server allow WebSocket connections
4. Check browser console for error messages

### Events not received

1. Ensure you've subscribed to the appropriate topic
2. Verify the callback is wrapped with `useCallback`
3. Check connection state is `connected`
4. Inspect WebSocket messages in browser DevTools (Network > WS)

### Memory leaks

1. Always wrap callbacks with `useCallback` with proper dependencies
2. Don't create new callback functions on every render
3. Let the hooks handle cleanup (don't manually unsubscribe)

## Example: Complete Dashboard Component

```tsx
import { useCallback, useEffect } from 'react';
import {
  useMCPServer,
  useMCPServerState,
  useMCPServerSubscriptions,
  useMCPAgentUpdate,
  useMCPTaskProgress,
  useMCPSystemStats,
} from '@/core/websocket';

function Dashboard() {
  const { connectionState, isConnected } = useMCPServer();
  const { agents, tasks, projects, stats } = useMCPServerState();

  // Subscribe to all relevant topics
  useMCPServerSubscriptions(['agents', 'tasks', 'projects', 'system']);

  // Handle real-time events
  const handleAgentUpdate = useCallback((agent) => {
    console.log('Agent updated:', agent.displayName, agent.status);
  }, []);

  const handleTaskProgress = useCallback(({ taskId, progress, message }) => {
    console.log(`Task ${taskId}: ${progress}%`, message);
  }, []);

  const handleSystemStats = useCallback((stats) => {
    console.log('System stats:', stats);
  }, []);

  useMCPAgentUpdate(handleAgentUpdate);
  useMCPTaskProgress(handleTaskProgress);
  useMCPSystemStats(handleSystemStats);

  if (!isConnected) {
    return <div>Connection status: {connectionState}</div>;
  }

  return (
    <div>
      <h1>MCP Server Dashboard</h1>

      <section>
        <h2>System Stats</h2>
        <p>Active Agents: {stats.activeAgents} / {stats.totalAgents}</p>
        <p>Active Tasks: {stats.activeTasks} / {stats.totalTasks}</p>
      </section>

      <section>
        <h2>Agents ({agents.length})</h2>
        <ul>
          {agents.map(agent => (
            <li key={agent.id}>
              <strong>{agent.displayName}</strong> - {agent.status}
              {agent.currentTask && ` (${agent.currentTask})`}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Tasks ({tasks.length})</h2>
        <ul>
          {tasks.map(task => (
            <li key={task.id}>
              {task.type} - {task.status}
              {task.progress !== undefined && ` (${task.progress}%)`}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Projects ({projects.length})</h2>
        <ul>
          {projects.map(project => (
            <li key={project.id}>
              <strong>{project.name}</strong> - {project.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## Environment Variables

```env
# .env.local
VITE_MCP_SERVER_URL=http://localhost:8000
```

For production:
```env
VITE_MCP_SERVER_URL=https://mcp-server.example.com
```

The WebSocket URL is automatically constructed by replacing `http://` with `ws://` or `https://` with `wss://` and appending `/ws/dashboard`.
