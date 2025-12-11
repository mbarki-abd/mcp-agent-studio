# Sample MCP Server

A minimal MCP (Model Context Protocol) server for testing MCP Agent Studio integration.

## Quick Start

```bash
# Install dependencies
cd tools/sample-mcp-server
npm install

# Start server
npm start

# Or with custom port and token
PORT=3001 MCP_TOKEN=my-secret-token npm start
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server info |
| `GET /health` | Health check |
| `GET /api/tools` | List available tools |
| `WS /` | JSON-RPC 2.0 WebSocket |

## Available Tools

| Tool | Description |
|------|-------------|
| `echo` | Echoes back a message |
| `calculate` | Basic arithmetic (add, subtract, multiply, divide) |
| `get_time` | Returns current server time |
| `execute_prompt` | Simulated prompt execution with streaming |
| `list_files` | Lists directory files (simulated) |
| `read_file` | Reads file contents (simulated) |

## Testing

Run the test client to validate the MCP protocol:

```bash
node test-client.js
```

Expected output:
```
============================================================
MCP Client Integration Test
============================================================
Connected to MCP server

Test 1: Initialize connection
✓ Initialize

Test 2: List available tools
✓ List tools
  Found 6 tools

... (all tests should pass)

============================================================
Results: 10 passed, 0 failed
============================================================
```

## Integration with MCP Agent Studio

1. Start this server on port 3001
2. In MCP Agent Studio, add a new server:
   - URL: `http://localhost:3001`
   - Token: `sample-token-12345` (default)
3. Test the connection using the "Test Connection" button

## Protocol

This server implements the MCP JSON-RPC 2.0 protocol:

### Initialize
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {}, "prompts": {}, "resources": {} },
    "clientInfo": { "name": "client", "version": "1.0.0" }
  }
}
```

### List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call Tool
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": { "message": "Hello!" }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `MCP_TOKEN` | `sample-token-12345` | Authentication token |
