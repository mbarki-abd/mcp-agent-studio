/**
 * Sample MCP Server
 *
 * A minimal MCP-compatible server for testing MCP Agent Studio integration.
 * Implements JSON-RPC 2.0 over WebSocket with the MCP protocol.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3001;
const TOKEN = process.env.MCP_TOKEN || 'sample-token-12345';

// Server configuration
const SERVER_INFO = {
  name: 'sample-mcp-server',
  version: '0.1.0',
  capabilities: ['tools', 'prompts', 'resources', 'streaming'],
  protocolVersion: '2024-11-05',
};

// Available tools
const TOOLS = [
  {
    name: 'echo',
    description: 'Echoes back the provided message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' },
      },
      required: ['message'],
    },
  },
  {
    name: 'calculate',
    description: 'Performs basic arithmetic operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number', description: 'First operand' },
        b: { type: 'number', description: 'Second operand' },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'get_time',
    description: 'Returns the current server time',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone (optional)', default: 'UTC' },
      },
    },
  },
  {
    name: 'execute_prompt',
    description: 'Executes a prompt and returns the result (simulated)',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string' },
        prompt: { type: 'string', description: 'The prompt to execute' },
        agentId: { type: 'string', description: 'Optional agent ID' },
        context: { type: 'object', description: 'Optional context' },
        allowedTools: { type: 'array', items: { type: 'string' } },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'list_files',
    description: 'Lists files in a directory (simulated)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
        pattern: { type: 'string', description: 'File pattern to match' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: 'Reads file contents (simulated)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
      },
      required: ['path'],
    },
  },
];

// Tool implementations
const toolHandlers = {
  echo: ({ message }) => ({
    content: [{ type: 'text', text: message }],
  }),

  calculate: ({ operation, a, b }) => {
    let result;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b !== 0 ? a / b : 'Error: Division by zero'; break;
      default: result = 'Unknown operation';
    }
    return {
      content: [{ type: 'text', text: `${a} ${operation} ${b} = ${result}` }],
    };
  },

  get_time: ({ timezone = 'UTC' }) => {
    const now = new Date();
    const options = { timeZone: timezone, timeStyle: 'long', dateStyle: 'full' };
    try {
      const formatted = now.toLocaleString('en-US', options);
      return {
        content: [{ type: 'text', text: `Current time (${timezone}): ${formatted}` }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Current time (UTC): ${now.toISOString()}` }],
      };
    }
  },

  execute_prompt: async ({ executionId, prompt, agentId, context, allowedTools }, ws) => {
    // Simulate prompt execution with streaming output
    const words = prompt.split(' ');
    let output = '';

    // Send progress notifications
    for (let i = 0; i < words.length; i++) {
      const progress = Math.round((i / words.length) * 100);

      // Send output notification
      sendNotification(ws, 'execution/output', {
        executionId,
        content: words[i] + ' ',
      });

      // Send progress notification
      sendNotification(ws, 'execution/progress', {
        executionId,
        progress,
        message: `Processing word ${i + 1}/${words.length}`,
      });

      output += words[i] + ' ';
      await sleep(100); // Simulate processing time
    }

    // Simulate a tool call
    if (prompt.toLowerCase().includes('time')) {
      sendNotification(ws, 'execution/tool_call', {
        executionId,
        id: `tool-${Date.now()}`,
        name: 'get_time',
        arguments: { timezone: 'UTC' },
      });

      await sleep(200);

      sendNotification(ws, 'execution/tool_result', {
        executionId,
        callId: `tool-${Date.now()}`,
        result: new Date().toISOString(),
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          output: `Processed: ${output.trim()}`,
          tokensUsed: words.length * 10,
        }),
      }],
    };
  },

  list_files: ({ path, pattern }) => {
    // Simulated file listing
    const files = [
      { name: 'index.ts', size: 1024, modified: new Date().toISOString() },
      { name: 'config.json', size: 256, modified: new Date().toISOString() },
      { name: 'README.md', size: 512, modified: new Date().toISOString() },
    ];
    return {
      content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
    };
  },

  read_file: ({ path }) => {
    // Simulated file content
    return {
      content: [{
        type: 'text',
        text: `// Simulated content of ${path}\nconsole.log('Hello from ${path}');`,
      }],
    };
  },
};

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendJsonRpc(ws, response) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
  }
}

function sendNotification(ws, method, params) {
  sendJsonRpc(ws, {
    jsonrpc: '2.0',
    method,
    params,
  });
}

function sendResponse(ws, id, result) {
  sendJsonRpc(ws, {
    jsonrpc: '2.0',
    id,
    result,
  });
}

function sendError(ws, id, code, message, data) {
  sendJsonRpc(ws, {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  });
}

// JSON-RPC method handlers
const methodHandlers = {
  initialize: (params, ws) => {
    console.log(`Client initialized: ${params.clientInfo?.name} v${params.clientInfo?.version}`);
    return {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
      },
    };
  },

  'tools/list': () => ({
    tools: TOOLS,
  }),

  'tools/call': async (params, ws) => {
    const { name, arguments: args } = params;
    const handler = toolHandlers[name];

    if (!handler) {
      throw { code: -32601, message: `Unknown tool: ${name}` };
    }

    try {
      return await handler(args || {}, ws);
    } catch (error) {
      throw { code: -32000, message: error.message || 'Tool execution failed' };
    }
  },

  'prompts/list': () => ({
    prompts: [
      {
        name: 'code_review',
        description: 'Review code for issues and improvements',
        arguments: [
          { name: 'code', description: 'Code to review', required: true },
        ],
      },
      {
        name: 'explain',
        description: 'Explain a concept or code',
        arguments: [
          { name: 'topic', description: 'Topic to explain', required: true },
        ],
      },
    ],
  }),

  'resources/list': () => ({
    resources: [
      {
        uri: 'file:///project',
        name: 'Project Files',
        description: 'Access to project files',
        mimeType: 'inode/directory',
      },
    ],
  }),

  ping: () => ({
    pong: true,
    timestamp: new Date().toISOString(),
  }),
};

// Create HTTP server for health checks
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      uptime: process.uptime(),
    }));
    return;
  }

  if (req.url === '/api/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools: TOOLS }));
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(SERVER_INFO));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  // Verify token from headers
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (token !== TOKEN) {
    console.log('Invalid token, closing connection');
    ws.close(4001, 'Unauthorized');
    return;
  }

  console.log('Client authenticated successfully');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', message.method || 'response', message.id || '');

      // Handle JSON-RPC request
      if (message.method) {
        const handler = methodHandlers[message.method];

        // Handle notifications (no id)
        if (message.id === undefined) {
          console.log(`Notification received: ${message.method}`);
          return;
        }

        if (!handler) {
          sendError(ws, message.id, -32601, `Method not found: ${message.method}`);
          return;
        }

        try {
          const result = await handler(message.params || {}, ws);
          sendResponse(ws, message.id, result);
        } catch (error) {
          if (error.code) {
            sendError(ws, message.id, error.code, error.message, error.data);
          } else {
            sendError(ws, message.id, -32000, error.message || 'Internal error');
          }
        }
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} - ${reason}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   MCP Sample Server                        ║
╠════════════════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}                          ║
║  WebSocket: ws://localhost:${PORT}                            ║
║  Token:     ${TOKEN}                    ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /           - Server info                          ║
║    GET  /health     - Health check                         ║
║    GET  /api/tools  - List available tools                 ║
║    WS   /           - JSON-RPC 2.0 WebSocket               ║
╠════════════════════════════════════════════════════════════╣
║  Available Tools:                                          ║
║    - echo          - Echo back a message                   ║
║    - calculate     - Basic arithmetic                      ║
║    - get_time      - Current server time                   ║
║    - execute_prompt - Simulated prompt execution           ║
║    - list_files    - List directory files                  ║
║    - read_file     - Read file contents                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
