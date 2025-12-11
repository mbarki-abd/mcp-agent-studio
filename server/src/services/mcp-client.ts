/**
 * MCP (Model Context Protocol) Client
 *
 * This client handles communication with MCP-compatible servers for
 * agent execution, tool management, and real-time streaming.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';

// JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// MCP-specific types
export interface MCPExecutionRequest {
  prompt: string;
  agentId?: string;
  context?: Record<string, unknown>;
  tools?: string[];
  timeout?: number;
}

export interface MCPExecutionEvent {
  type: 'output' | 'tool_call' | 'tool_result' | 'file_change' | 'progress' | 'error' | 'complete';
  data: unknown;
  timestamp: Date;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  callId: string;
  result?: unknown;
  error?: string;
}

export interface MCPFileChange {
  path: string;
  action: 'create' | 'edit' | 'delete';
  content?: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: string[];
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

export interface MCPClientOptions {
  serverUrl: string;
  wsUrl?: string;
  token: string;
  timeout?: number;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export type MCPClientState = 'disconnected' | 'connecting' | 'connected' | 'error';

export class MCPClient extends EventEmitter {
  private options: Required<MCPClientOptions>;
  private ws: WebSocket | null = null;
  private state: MCPClientState = 'disconnected';
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private reconnectAttempts = 0;
  private serverInfo: MCPServerInfo | null = null;

  constructor(options: MCPClientOptions) {
    super();
    this.options = {
      wsUrl: options.wsUrl || options.serverUrl.replace('http', 'ws'),
      timeout: options.timeout || 30000,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      ...options,
    };
  }

  get connectionState(): MCPClientState {
    return this.state;
  }

  get server(): MCPServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Connect to the MCP server via WebSocket
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.state = 'connecting';
    this.emit('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.wsUrl, {
          headers: {
            'Authorization': `Bearer ${this.options.token}`,
          },
        });

        const connectionTimeout = setTimeout(() => {
          if (this.state === 'connecting') {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.timeout);

        this.ws.on('open', async () => {
          clearTimeout(connectionTimeout);
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.emit('connected');

          try {
            // Initialize connection and get server info
            await this.initialize();
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code, reason) => {
          this.handleDisconnect(code, reason.toString());
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          this.state = 'error';
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        this.state = 'error';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.state = 'disconnected';
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
    this.emit('disconnected');
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
      clientInfo: {
        name: 'mcp-agent-studio',
        version: '0.1.0',
      },
    });

    this.serverInfo = result as MCPServerInfo;
    this.emit('initialized', this.serverInfo);

    // Send initialized notification
    this.sendNotification('notifications/initialized');
  }

  /**
   * Execute a prompt on the MCP server
   */
  async execute(
    request: MCPExecutionRequest,
    callbacks?: {
      onOutput?: (chunk: string) => void;
      onToolCall?: (call: MCPToolCall) => void;
      onToolResult?: (result: MCPToolResult) => void;
      onFileChange?: (change: MCPFileChange) => void;
      onProgress?: (progress: number, message?: string) => void;
    }
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    tokensUsed?: number;
    toolCalls?: MCPToolCall[];
    fileChanges?: MCPFileChange[];
  }> {
    if (this.state !== 'connected') {
      throw new Error('Not connected to MCP server');
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const output: string[] = [];
    const toolCalls: MCPToolCall[] = [];
    const fileChanges: MCPFileChange[] = [];

    // Set up event handlers for this execution
    const cleanup = this.setupExecutionHandlers(executionId, {
      onOutput: (chunk) => {
        output.push(chunk);
        callbacks?.onOutput?.(chunk);
      },
      onToolCall: (call) => {
        toolCalls.push(call);
        callbacks?.onToolCall?.(call);
      },
      onToolResult: callbacks?.onToolResult,
      onFileChange: (change) => {
        fileChanges.push(change);
        callbacks?.onFileChange?.(change);
      },
      onProgress: callbacks?.onProgress,
    });

    try {
      const result = await this.sendRequest('tools/call', {
        name: 'execute_prompt',
        arguments: {
          executionId,
          prompt: request.prompt,
          agentId: request.agentId,
          context: request.context,
          allowedTools: request.tools,
        },
      }, request.timeout || this.options.timeout);

      cleanup();

      const execResult = result as {
        success: boolean;
        error?: string;
        tokensUsed?: number;
      };

      return {
        success: execResult.success,
        output: output.join(''),
        error: execResult.error,
        tokensUsed: execResult.tokensUsed,
        toolCalls,
        fileChanges,
      };

    } catch (error) {
      cleanup();
      throw error;
    }
  }

  /**
   * Execute via HTTP API (fallback when WebSocket not available)
   */
  async executeHttp(
    request: MCPExecutionRequest,
    callbacks?: {
      onOutput?: (chunk: string) => void;
    }
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    tokensUsed?: number;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeout || this.options.timeout);

    try {
      const response = await fetch(`${this.options.serverUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.token}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          agentId: request.agentId,
          context: request.context,
          tools: request.tools,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          output: '',
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      // Handle streaming response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return this.handleStreamingResponse(response, callbacks);
      }

      // Handle JSON response
      const data = await response.json();
      return {
        success: data.success ?? true,
        output: data.output || data.result || '',
        error: data.error,
        tokensUsed: data.tokensUsed,
      };

    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          output: '',
          error: 'Request timeout',
        };
      }
      throw error;
    }
  }

  /**
   * Handle streaming SSE response
   */
  private async handleStreamingResponse(
    response: Response,
    callbacks?: {
      onOutput?: (chunk: string) => void;
    }
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    tokensUsed?: number;
  }> {
    const reader = response.body?.getReader();
    if (!reader) {
      return { success: false, output: '', error: 'No response body' };
    }

    const decoder = new TextDecoder();
    const output: string[] = [];
    let tokensUsed: number | undefined;
    let error: string | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'output') {
                output.push(data.content);
                callbacks?.onOutput?.(data.content);
              } else if (data.type === 'complete') {
                tokensUsed = data.tokensUsed;
              } else if (data.type === 'error') {
                error = data.message;
              }
            } catch {
              // Ignore parse errors for SSE
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      success: !error,
      output: output.join(''),
      error,
      tokensUsed,
    };
  }

  /**
   * List available tools on the server
   */
  async listTools(): Promise<Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>> {
    if (this.state !== 'connected') {
      // Use HTTP fallback
      const response = await fetch(`${this.options.serverUrl}/api/tools`, {
        headers: {
          'Authorization': `Bearer ${this.options.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.tools || [];
    }

    const result = await this.sendRequest('tools/list', {});
    return (result as { tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> }).tools;
  }

  /**
   * Call a specific tool
   */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (this.state !== 'connected') {
      throw new Error('Not connected to MCP server');
    }

    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return (result as { content: unknown }).content;
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private sendRequest(
    method: string,
    params: Record<string, unknown>,
    timeout?: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.state !== 'connected') {
        reject(new Error('Not connected'));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeout || this.options.timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.ws || this.state !== 'connected') {
      return;
    }

    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.ws.send(JSON.stringify(notification));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle response to a request
      if ('id' in message && message.id !== null) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
        return;
      }

      // Handle notification
      if ('method' in message) {
        this.handleNotification(message as JsonRpcNotification);
      }

    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  /**
   * Handle JSON-RPC notifications
   */
  private handleNotification(notification: JsonRpcNotification): void {
    const { method, params } = notification;

    switch (method) {
      case 'notifications/progress':
        this.emit('progress', params);
        break;

      case 'notifications/message':
        this.emit('message', params);
        break;

      case 'execution/output':
        this.emit(`output:${params?.executionId}`, params?.content);
        break;

      case 'execution/tool_call':
        this.emit(`tool_call:${params?.executionId}`, params);
        break;

      case 'execution/tool_result':
        this.emit(`tool_result:${params?.executionId}`, params);
        break;

      case 'execution/file_change':
        this.emit(`file_change:${params?.executionId}`, params);
        break;

      case 'execution/progress':
        this.emit(`progress:${params?.executionId}`, params?.progress, params?.message);
        break;

      default:
        this.emit('notification', notification);
    }
  }

  /**
   * Set up event handlers for a specific execution
   */
  private setupExecutionHandlers(
    executionId: string,
    callbacks: {
      onOutput?: (chunk: string) => void;
      onToolCall?: (call: MCPToolCall) => void;
      onToolResult?: (result: MCPToolResult) => void;
      onFileChange?: (change: MCPFileChange) => void;
      onProgress?: (progress: number, message?: string) => void;
    }
  ): () => void {
    const handlers = {
      output: (chunk: string) => callbacks.onOutput?.(chunk),
      tool_call: (call: MCPToolCall) => callbacks.onToolCall?.(call),
      tool_result: (result: MCPToolResult) => callbacks.onToolResult?.(result),
      file_change: (change: MCPFileChange) => callbacks.onFileChange?.(change),
      progress: (progress: number, message?: string) => callbacks.onProgress?.(progress, message),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      this.on(`${event}:${executionId}`, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        this.off(`${event}:${executionId}`, handler);
      });
    };
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnect(code: number, reason: string): void {
    this.state = 'disconnected';
    this.ws = null;

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error(`Connection closed: ${reason}`));
    });
    this.pendingRequests.clear();

    this.emit('disconnected', { code, reason });

    // Attempt reconnection if enabled
    if (this.options.reconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        this.connect().catch((err) => {
          this.emit('reconnect_failed', err);
        });
      }, delay);
    }
  }
}

// Connection pool for managing multiple MCP clients
const clientPool = new Map<string, MCPClient>();

export function getMCPClient(options: MCPClientOptions): MCPClient {
  const key = `${options.serverUrl}:${options.token.slice(0, 8)}`;

  if (!clientPool.has(key)) {
    const client = new MCPClient(options);
    clientPool.set(key, client);
  }

  return clientPool.get(key)!;
}

export function removeMCPClient(serverUrl: string, token: string): void {
  const key = `${serverUrl}:${token.slice(0, 8)}`;
  const client = clientPool.get(key);
  if (client) {
    client.disconnect();
    clientPool.delete(key);
  }
}

export function clearMCPClients(): void {
  clientPool.forEach((client) => client.disconnect());
  clientPool.clear();
}
