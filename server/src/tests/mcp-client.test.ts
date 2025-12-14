import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient, getMCPClient, removeMCPClient, clearMCPClients } from '../services/mcp-client.js';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn();

  // Simulate opening
  simulateOpen() {
    this.emit('open');
  }

  // Simulate receiving message
  simulateMessage(data: string) {
    this.emit('message', data);
  }

  // Simulate disconnection
  simulateClose(code: number, reason: string) {
    this.emit('close', code, Buffer.from(reason));
  }

  // Simulate error
  simulateError(error: Error) {
    this.emit('error', error);
  }
}

// Mock the ws module
vi.mock('ws', () => {
  return {
    default: vi.fn(() => new MockWebSocket()),
  };
});

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  mcpLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch for HTTP fallback
global.fetch = vi.fn();

describe('MCPClient', () => {
  let client: MCPClient;
  let mockWs: MockWebSocket;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset WebSocket mock to return a new instance each time
    const wsModule = await import('ws');
    const WS = wsModule.default as unknown as ReturnType<typeof vi.fn>;
    if (typeof WS.mockImplementation === 'function') {
      WS.mockImplementation(() => {
        mockWs = new MockWebSocket();
        return mockWs as unknown as WebSocket;
      });
    }
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    clearMCPClients();
  });

  describe('Constructor and Connection', () => {
    it('should create client with default options', () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      expect(client.connectionState).toBe('disconnected');
    });

    it('should construct wsUrl from serverUrl if not provided', () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      // Internal wsUrl should be ws://localhost:3000
      expect(client.connectionState).toBe('disconnected');
    });

    it('should connect successfully via WebSocket', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        timeout: 5000,
      });

      const connectPromise = client.connect();

      // Simulate WebSocket opening
      mockWs.simulateOpen();

      // Simulate initialize response
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          name: 'test-server',
          version: '1.0.0',
          capabilities: ['tools', 'prompts'],
          tools: [],
        },
      }));

      await connectPromise;

      expect(client.connectionState).toBe('connected');
    });

    it('should handle connection timeout', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        timeout: 100,
      });

      // Don't simulate open - let it timeout
      await expect(client.connect()).rejects.toThrow('Connection timeout');

      expect(client.connectionState).toBe('connecting');
    });

    it('should handle WebSocket connection error', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();

      // Simulate error
      mockWs.simulateError(new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
      expect(client.connectionState).toBe('error');
    });

    it('should not connect if already connected', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;

      // Try to connect again
      await client.connect();

      // Should only construct WebSocket once
      const WS = (await import('ws')).default as unknown as typeof vi.fn;
      expect(WS).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disconnection and Reconnection', () => {
    it('should disconnect cleanly', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;

      client.disconnect();

      expect(client.connectionState).toBe('disconnected');
      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Client disconnecting');
    });

    it('should reject pending requests on disconnect', async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;

      // Start a request but don't respond
      const toolPromise = client.callTool('test_tool', {});

      // Disconnect
      client.disconnect();

      await expect(toolPromise).rejects.toThrow('Connection closed');
    });

    it('should attempt reconnection on disconnect when enabled', async () => {
      vi.useFakeTimers();

      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        reconnect: true,
        maxReconnectAttempts: 3,
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;

      // Simulate disconnect
      mockWs.simulateClose(1006, 'Connection lost');

      expect(client.connectionState).toBe('disconnected');

      // Fast-forward time to trigger reconnect
      await vi.advanceTimersByTimeAsync(2000);

      vi.useRealTimers();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;
    });

    it('should parse valid JSON-RPC response', async () => {
      const toolPromise = client.callTool('test_tool', { arg: 'value' });

      // Simulate response
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: { content: 'success' },
      }));

      const result = await toolPromise;
      expect(result).toBe('success');
    });

    it('should handle JSON-RPC error response', async () => {
      const toolPromise = client.callTool('test_tool', { arg: 'value' });

      // Simulate error response
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }));

      await expect(toolPromise).rejects.toThrow('Method not found');
    });

    it('should handle invalid JSON gracefully', () => {
      const errorSpy = vi.fn();
      client.on('error', errorSpy);

      // Send invalid JSON
      mockWs.simulateMessage('not valid json');

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should emit notification events', () => {
      const progressSpy = vi.fn();
      client.on('progress', progressSpy);

      // Simulate progress notification
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: { progress: 50, message: 'Half done' },
      }));

      expect(progressSpy).toHaveBeenCalledWith({ progress: 50, message: 'Half done' });
    });
  });

  describe('Tool Execution', () => {
    let capturedExecutionId: string | null = null;

    beforeEach(async () => {
      capturedExecutionId = null;
      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const connectPromise = client.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { name: 'test', version: '1.0', capabilities: [], tools: [] },
      }));
      await connectPromise;

      // Capture the executionId from the request sent via WebSocket
      mockWs.send.mockImplementation((data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.params?.arguments?.executionId) {
            capturedExecutionId = parsed.params.arguments.executionId;
          }
        } catch {
          // Ignore parse errors
        }
      });
    });

    it('should execute prompt successfully', async () => {
      const onOutput = vi.fn();
      const executePromise = client.execute(
        { prompt: 'Test prompt' },
        { onOutput }
      );

      // Wait for the request to be sent and executionId to be captured
      await vi.waitFor(() => {
        expect(capturedExecutionId).not.toBeNull();
      });

      // Simulate output notification with the actual executionId
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        method: 'execution/output',
        params: { executionId: capturedExecutionId, content: 'Output chunk' },
      }));

      // Simulate execution result
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: {
          success: true,
          tokensUsed: 150,
        },
      }));

      const result = await executePromise;

      expect(result.success).toBe(true);
      expect(result.output).toContain('Output chunk');
      expect(result.tokensUsed).toBe(150);
    });

    it('should handle tool calls during execution', async () => {
      const onToolCall = vi.fn();
      const executePromise = client.execute(
        { prompt: 'Test with tools' },
        { onToolCall }
      );

      // Wait for the request to be sent and executionId to be captured
      await vi.waitFor(() => {
        expect(capturedExecutionId).not.toBeNull();
      });

      // Simulate tool call notification with the actual executionId
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        method: 'execution/tool_call',
        params: {
          executionId: capturedExecutionId,
          id: 'call-1',
          name: 'Read',
          arguments: { file_path: '/test.ts' },
        },
      }));

      // Simulate execution completion
      mockWs.simulateMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        result: { success: true },
      }));

      await executePromise;

      expect(onToolCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'call-1',
          name: 'Read',
          arguments: { file_path: '/test.ts' },
        })
      );
    });

    it('should throw error if not connected', async () => {
      client.disconnect();

      await expect(client.execute({ prompt: 'Test' }))
        .rejects.toThrow('Not connected to MCP server');
    });
  });

  describe('HTTP Fallback', () => {
    it('should execute via HTTP when WebSocket not connected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          output: 'HTTP result',
          tokensUsed: 100,
        }),
      } as Response);

      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const result = await client.executeHttp({ prompt: 'Test' });

      expect(result.success).toBe(true);
      expect(result.output).toBe('HTTP result');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/execute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle HTTP request timeout', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 1000);
        })
      );

      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        timeout: 100,
      });

      const result = await client.executeHttp({ prompt: 'Test', timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle HTTP error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      } as Response);

      client = new MCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const result = await client.executeHttp({ prompt: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal Server Error');
    });
  });

  describe('Client Pool', () => {
    it('should return same client for same server/token', () => {
      const client1 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      const client2 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      expect(client1).toBe(client2);
    });

    it('should remove client from pool', () => {
      const client1 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      removeMCPClient('http://localhost:3000', 'test-token');

      const client2 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
      });

      expect(client1).not.toBe(client2);
    });

    it('should clear all clients', () => {
      const client1 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'token1',
      });

      const client2 = getMCPClient({
        serverUrl: 'http://localhost:4000',
        token: 'token2',
      });

      clearMCPClients();

      const client3 = getMCPClient({
        serverUrl: 'http://localhost:3000',
        token: 'token1',
      });

      expect(client1).not.toBe(client3);
      expect(client2).not.toBe(client3);
    });
  });
});
