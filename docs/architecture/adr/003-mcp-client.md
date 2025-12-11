# ADR-003: MCP Client Implementation

## Status

**Accepted** - 2025-12-11

## Context

MCP Agent Studio needs to communicate with external MCP (Model Context Protocol) servers to execute agent tasks. The communication must support:

1. Real-time streaming of execution output
2. Tool call notifications
3. File change tracking
4. Progress updates
5. Graceful degradation when servers are unavailable

We needed to decide on the communication protocol and fallback strategy.

## Decision

We implemented a multi-tier communication system with three levels of fallback:

### Tier 1: WebSocket (JSON-RPC 2.0)

Primary communication method using WebSocket with JSON-RPC 2.0 protocol.

```typescript
interface MCPClient {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  connect(): Promise<void>;
  execute(request, callbacks): Promise<ExecutionResult>;
  callTool(name, args): Promise<any>;
}
```

**Advantages:**
- Full duplex communication
- Real-time streaming
- Low latency
- Supports all callback types (output, tool calls, file changes, todos)

**Auto-reconnection:**
- Exponential backoff (1s → 2s → 4s → ... → 30s max)
- Automatic reconnection on disconnect
- Event emission for connection state changes

### Tier 2: HTTP Streaming Fallback

When WebSocket is unavailable, fall back to HTTP with streaming support.

```typescript
async executeHttp(request, callbacks): Promise<ExecutionResult> {
  const response = await fetch(url, { method: 'POST', body: JSON.stringify(request) });
  const reader = response.body.getReader();
  // Stream processing...
}
```

**Advantages:**
- Works through firewalls/proxies that block WebSocket
- Uses standard HTTP/2 streaming
- Supports output streaming callback

**Limitations:**
- Higher latency than WebSocket
- Limited callback support (output only)

### Tier 3: Simulation Mode

When no MCP server is available, simulate execution locally.

```typescript
private async simulateExecution(request, callbacks): Promise<ExecutionResult> {
  const chunks = ['Analyzing...', 'Executing...', 'Complete'];
  for (const chunk of chunks) {
    await delay(500);
    callbacks?.onOutput?.(chunk);
  }
  return { output: fullOutput, tokensUsed: random(100, 1000) };
}
```

**Purpose:**
- Development without MCP server dependency
- Demo mode
- Graceful degradation in production

## Implementation Details

### Client Pooling

MCP clients are pooled by server URL + token combination:

```typescript
const clientPool = new Map<string, MCPClient>();

function getMCPClient(options: MCPClientOptions): MCPClient {
  const key = `${options.serverUrl}:${hash(options.token)}`;
  if (!clientPool.has(key)) {
    clientPool.set(key, new MCPClient(options));
  }
  return clientPool.get(key)!;
}
```

### Security

- Master tokens are encrypted at rest (AES-256-GCM)
- Tokens are decrypted only when creating client connections
- WebSocket connections include auth token in header

### Event System

The MCPClient extends EventEmitter for connection state notifications:

```typescript
client.on('connected', () => { /* ready */ });
client.on('disconnected', () => { /* reconnecting */ });
client.on('error', (err) => { /* handle error */ });
```

### Integration with MasterAgentService

```typescript
class MasterAgentService {
  private mcpClient: MCPClient | null = null;

  async executePrompt(prompt, agentId, callbacks): Promise<ExecutionResult> {
    // Try WebSocket
    if (this.mcpClient?.connectionState === 'connected') {
      return this.mcpClient.execute(request, callbacks);
    }

    // Try HTTP fallback
    if (this.mcpClient) {
      const result = await this.mcpClient.executeHttp(request, callbacks);
      if (result.success) return result;
    }

    // Simulation fallback
    return this.simulateExecution(request, callbacks);
  }
}
```

## Consequences

### Positive

1. **Resilience**: System continues functioning even when MCP servers are unavailable
2. **Development Experience**: Can develop without running MCP server
3. **Real-time Streaming**: Full support for execution output streaming
4. **Connection Management**: Automatic reconnection with backoff
5. **Resource Efficiency**: Client pooling prevents duplicate connections

### Negative

1. **Complexity**: Three-tier system adds code complexity
2. **Testing**: Need to test all three tiers
3. **Feature Parity**: HTTP fallback doesn't support all callbacks
4. **Simulation Accuracy**: Simulated responses don't reflect real execution

### Neutral

1. **Dependencies**: Added `ws` package for WebSocket support
2. **Protocol**: Committed to JSON-RPC 2.0 over WebSocket

## Alternatives Considered

### Alternative 1: WebSocket Only

Rejected because:
- No fallback when WebSocket blocked
- Poor developer experience without MCP server

### Alternative 2: HTTP Polling

Rejected because:
- High latency for real-time updates
- Inefficient resource usage
- Poor streaming support

### Alternative 3: gRPC

Rejected because:
- Additional complexity (protobuf definitions)
- Browser support limitations
- MCP servers use JSON-RPC standard

## Related

- [ADR-001](./001-tech-stack.md) - Technology stack decisions
- [ADR-002](./002-module-architecture.md) - Module architecture
- `server/src/services/mcp-client.ts` - Implementation
- `server/src/services/master-agent.service.ts` - Integration
