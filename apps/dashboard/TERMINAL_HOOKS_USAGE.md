# Terminal API Hooks - Usage Guide

## Overview

The Terminal API hooks provide a complete interface for managing terminal sessions with real-time WebSocket streaming support.

## File Location

`apps/dashboard/src/core/api/hooks/terminal.ts`

## REST API Hooks

### 1. List Terminal Sessions (Master Only)

```tsx
import { useTerminalSessions } from '@/core/api/hooks';

function TerminalList() {
  const { data, isLoading } = useTerminalSessions();

  return (
    <ul>
      {data?.sessions.map(session => (
        <li key={session.id}>
          {session.agentName} - {session.status}
        </li>
      ))}
    </ul>
  );
}
```

### 2. Create Terminal Session

```tsx
import { useCreateTerminalSession } from '@/core/api/hooks';

function CreateTerminal({ agentId }: { agentId: string }) {
  const createSession = useCreateTerminalSession();

  const handleCreate = async () => {
    const result = await createSession.mutateAsync(agentId);
    console.log('Session created:', result.session.id);
    console.log('WebSocket URL:', result.websocketUrl);
  };

  return <button onClick={handleCreate}>Create Terminal</button>;
}
```

### 3. Execute Command (Non-Interactive)

```tsx
import { useExecuteCommand } from '@/core/api/hooks';

function ExecuteCommand({ sessionId }: { sessionId: string }) {
  const executeCmd = useExecuteCommand();

  const handleExecute = async () => {
    await executeCmd.mutateAsync({
      sessionId,
      request: {
        command: 'ls',
        args: ['-la'],
        cwd: '/home/user'
      }
    });
  };

  return <button onClick={handleExecute}>Run ls -la</button>;
}
```

### 4. Get Terminal Buffer/History

```tsx
import { useTerminalBuffer } from '@/core/api/hooks';

function TerminalHistory({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useTerminalBuffer(sessionId);

  if (isLoading) return <div>Loading history...</div>;

  return (
    <pre>
      {data?.lines.join('\n')}
      {data?.truncated && '\n... (truncated)'}
    </pre>
  );
}
```

### 5. Close Terminal Session

```tsx
import { useCloseTerminal } from '@/core/api/hooks';

function CloseButton({ sessionId }: { sessionId: string }) {
  const closeTerminal = useCloseTerminal();

  const handleClose = async () => {
    await closeTerminal.mutateAsync(sessionId);
  };

  return <button onClick={handleClose}>Close Terminal</button>;
}
```

## WebSocket Hook (Real-Time Streaming)

### Complete Terminal Component

```tsx
import { useTerminalWebSocket } from '@/core/api/hooks';
import { useEffect, useRef } from 'react';

function TerminalView({
  serverUrl,
  token,
  sessionId
}: {
  serverUrl: string;
  token: string;
  sessionId: string;
}) {
  const terminal = useTerminalWebSocket({
    serverUrl,
    token,
    sessionId,
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    maxBufferSize: 1000
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Execute command
  const handleExecute = () => {
    const cmd = inputRef.current?.value;
    if (cmd) {
      terminal.execute(cmd);
      inputRef.current.value = '';
    }
  };

  // Send input to running process
  const handleInput = (text: string) => {
    terminal.sendInput(text + '\n');
  };

  // Kill running process
  const handleKill = () => {
    terminal.kill('SIGTERM');
  };

  // Resize terminal
  const handleResize = () => {
    terminal.resize(120, 30);
  };

  return (
    <div>
      {/* Connection Status */}
      <div>
        Status: {terminal.connectionState}
        {terminal.connectionState === 'reconnecting' &&
          ` (attempt ${terminal.reconnectAttempt})`
        }
      </div>

      {/* Output Display */}
      <pre style={{
        background: '#000',
        color: '#0f0',
        padding: '10px',
        height: '400px',
        overflow: 'auto'
      }}>
        {terminal.output.map((msg, i) => (
          <div key={i} style={{
            color: msg.type === 'stderr' ? '#f00' :
                   msg.type === 'error' ? '#ff0' : '#0f0'
          }}>
            {msg.type === 'stdout' && msg.data}
            {msg.type === 'stderr' && msg.data}
            {msg.type === 'exit' && `[Process exited with code ${msg.code}]`}
            {msg.type === 'error' && `[Error: ${msg.message}]`}
          </div>
        ))}
      </pre>

      {/* Command Input */}
      <div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter command..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleExecute();
          }}
        />
        <button onClick={handleExecute}>Execute</button>
        <button onClick={handleKill}>Kill Process</button>
        <button onClick={() => terminal.clearOutput()}>Clear</button>
      </div>

      {/* Connection Controls */}
      <div>
        <button
          onClick={terminal.connect}
          disabled={terminal.isConnected}
        >
          Connect
        </button>
        <button
          onClick={terminal.disconnect}
          disabled={!terminal.isConnected}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
```

### Interactive Shell Example

```tsx
import { useTerminalWebSocket, useStartShell } from '@/core/api/hooks';
import { useEffect } from 'react';

function InteractiveTerminal({
  serverUrl,
  token,
  sessionId
}: {
  serverUrl: string;
  token: string;
  sessionId: string;
}) {
  const startShell = useStartShell();
  const terminal = useTerminalWebSocket({
    serverUrl,
    token,
    sessionId,
    autoConnect: true
  });

  useEffect(() => {
    if (terminal.isConnected) {
      // Start interactive shell
      startShell.mutateAsync(sessionId);
    }
  }, [terminal.isConnected]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget.value;
      terminal.sendInput(input + '\n');
      e.currentTarget.value = '';
    }
  };

  return (
    <div>
      <pre>{terminal.output.map(o => o.data).join('')}</pre>
      <input
        type="text"
        onKeyPress={handleKeyPress}
        placeholder="Type commands..."
        disabled={!terminal.isConnected}
      />
    </div>
  );
}
```

## WebSocket Message Protocol

### Client to Server

```typescript
// Execute command
{ type: 'execute', command: 'ls', args: ['-la'] }

// Send input
{ type: 'input', data: 'hello world\n' }

// Kill process
{ type: 'kill', signal: 'SIGTERM' }

// Resize terminal
{ type: 'resize', cols: 80, rows: 24 }
```

### Server to Client

```typescript
// Standard output
{ type: 'stdout', data: 'output text', timestamp: '2024-01-01T00:00:00Z' }

// Standard error
{ type: 'stderr', data: 'error text', timestamp: '2024-01-01T00:00:00Z' }

// Process exit
{ type: 'exit', code: 0, timestamp: '2024-01-01T00:00:00Z' }

// Error
{ type: 'error', message: 'error description', timestamp: '2024-01-01T00:00:00Z' }
```

## Features

### REST API
- List all terminal sessions (master only)
- Create/get terminal session for agent
- Execute commands (non-interactive)
- Start interactive shell
- Send input to running processes
- Kill processes with signal
- Close terminal sessions
- Get output history/buffer

### WebSocket
- Real-time output streaming (stdout/stderr)
- Automatic reconnection with exponential backoff
- Connection state tracking
- Output buffering with size limit
- ANSI escape code support
- Process exit notifications
- Error handling
- Ping/keep-alive

### Security
- Token-based authentication
- Query string token for WebSocket
- Session isolation per agent

## Implementation Notes

1. **WebSocket URL**: Token is passed via query string: `/api/terminals/{sessionId}/ws?token={token}`
2. **Reconnection**: Automatic with exponential backoff (max 5 attempts by default)
3. **Buffer Management**: Keeps last 1000 messages by default, configurable
4. **Connection Lifecycle**: Auto-connect on mount, auto-disconnect on unmount
5. **Error Handling**: Errors logged to console and added to output buffer
6. **ANSI Support**: Output preserves ANSI escape codes for terminal rendering

## Query Keys

```typescript
queryKeys.terminals.all              // ['terminals']
queryKeys.terminals.session(id)      // ['terminals', 'session', id]
queryKeys.terminals.buffer(id)       // ['terminals', id, 'buffer']
```

## Type Exports

All types are exported from the main hooks barrel:

```typescript
import type {
  TerminalSession,
  CreateTerminalResponse,
  ExecuteCommandRequest,
  TerminalOutput,
  TerminalBuffer,
  TerminalClientMessage,
} from '@/core/api/hooks';
```
