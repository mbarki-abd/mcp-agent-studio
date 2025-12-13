# Claude Messages API Hooks

React hooks for interacting with the Anthropic Claude Messages API compatible endpoint (`/v1/messages`).

## Overview

This module provides three main hooks for working with the Claude Messages API:

1. **`useSendMessage`** - Non-streaming message execution
2. **`useSendMessageStreaming`** - Streaming message execution with Server-Sent Events (SSE)
3. **`useAvailableModels`** - Fetch available Claude models

## Installation

The hooks are already integrated into the dashboard. Import from the hooks barrel:

```typescript
import {
  useSendMessage,
  useSendMessageStreaming,
  useAvailableModels,
  type MessageResponse,
  type SendMessageRequest,
} from '@/core/api/hooks';
```

## API Reference

### Types

#### `SendMessageRequest`

```typescript
interface SendMessageRequest {
  model: string;           // e.g., "claude-sonnet-4-20250514"
  max_tokens: number;      // Maximum tokens to generate
  messages: Message[];     // Conversation messages
  system?: string;         // System prompt
  temperature?: number;    // 0.0 to 1.0 (default: 1.0)
  top_p?: number;          // Nucleus sampling (default: 1.0)
  stream?: boolean;        // Enable streaming (automatic in hooks)
  tools?: ToolDefinition[]; // Available tools for function calling
}
```

#### `Message`

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}
```

#### `ContentBlock`

```typescript
type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

interface TextContent {
  type: 'text';
  text: string;
}

interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}
```

#### `MessageResponse`

```typescript
interface MessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### Hooks

#### `useSendMessage(serverUrl, token)`

Sends a message to Claude without streaming. Returns a standard React Query mutation.

**Parameters:**
- `serverUrl` (string): The base URL of the mcp-agent-server
- `token` (string | null): Authentication token

**Returns:**
```typescript
{
  mutate: (request: SendMessageRequest) => void;
  data: MessageResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  // ... other React Query mutation properties
}
```

**Example:**
```typescript
const { mutate, data, isLoading, error } = useSendMessage(
  'http://localhost:3000/api',
  authToken
);

mutate({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

#### `useSendMessageStreaming(serverUrl, token, options)`

Sends a message to Claude with streaming via Server-Sent Events (SSE).

**Parameters:**
- `serverUrl` (string): The base URL of the mcp-agent-server
- `token` (string | null): Authentication token
- `options` (object, optional):
  - `onChunk?: (chunk: string) => void` - Called for each text chunk
  - `onContentBlock?: (block: ContentBlock) => void` - Called for each content block
  - `onComplete?: (response: MessageResponse) => void` - Called when stream completes
  - `onError?: (error: Error) => void` - Called on error

**Returns:**
```typescript
{
  mutate: (request: SendMessageRequest) => void;
  cancel: () => void;
  data: MessageResponse | null;
  streamingContent: string;  // Accumulated text during streaming
  contentBlocks: ContentBlock[];
  isLoading: boolean;
  error: Error | null;
}
```

**Example:**
```typescript
const { mutate, streamingContent, isLoading, cancel } = useSendMessageStreaming(
  'http://localhost:3000/api',
  authToken,
  {
    onChunk: (chunk) => console.log('Received:', chunk),
    onComplete: (response) => console.log('Done!', response),
  }
);

mutate({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2048,
  messages: [{ role: 'user', content: 'Tell me a story' }],
  temperature: 0.7,
});

// Cancel the stream if needed
cancel();
```

#### `useAvailableModels(serverUrl, token)`

Fetches the list of available Claude models from the server.

**Parameters:**
- `serverUrl` (string): The base URL of the mcp-agent-server
- `token` (string | null): Authentication token

**Returns:**
```typescript
{
  mutate: () => void;
  data: ModelInfo[] | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

**Example:**
```typescript
const { mutate, data: models, isLoading } = useAvailableModels(
  'http://localhost:3000/api',
  authToken
);

// Fetch models
mutate();

// Display models
models?.map(model => (
  <div>{model.name} - {model.id}</div>
));
```

## Usage Examples

See `messages.example.tsx` for complete working examples:

1. **Non-Streaming Message** - Simple request/response
2. **Streaming Message** - Real-time text streaming
3. **Tool Use** - Function calling with tools
4. **Multi-Turn Conversation** - Chat history management
5. **Available Models** - List supported models

## Streaming Details

The streaming implementation uses Server-Sent Events (SSE), not WebSocket. The events follow the Anthropic API specification:

- `message_start` - Stream begins
- `content_block_start` - New content block begins
- `content_block_delta` - Text chunk received
- `content_block_stop` - Content block ends
- `message_delta` - Usage stats update
- `message_stop` - Stream complete
- `ping` - Keep-alive
- `error` - Error occurred

## Error Handling

All hooks throw standard JavaScript `Error` objects. Common errors:

- **401 Unauthorized** - Invalid or missing token
- **400 Bad Request** - Invalid request format
- **429 Too Many Requests** - Rate limit exceeded
- **500 Server Error** - Server-side error

Example error handling:

```typescript
const { mutate, error } = useSendMessage(serverUrl, token);

if (error) {
  if (error.message.includes('401')) {
    // Re-authenticate
  } else {
    // Show error to user
    console.error('Failed to send message:', error.message);
  }
}
```

## Best Practices

1. **Token Management**: Store auth tokens securely and refresh when expired
2. **Cancel Streams**: Always cancel streaming requests when component unmounts
3. **Error Handling**: Implement comprehensive error handling for production
4. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors
5. **Token Budgeting**: Monitor `usage.input_tokens` and `usage.output_tokens` to track costs

## TypeScript Support

All hooks are fully typed with TypeScript. Import types as needed:

```typescript
import type {
  SendMessageRequest,
  MessageResponse,
  ContentBlock,
  ToolDefinition,
  StreamEvent,
  ModelInfo,
} from '@/core/api/hooks';
```

## Server Compatibility

These hooks are designed to work with the `mcp-agent-server` which implements the Anthropic-compatible `/v1/messages` endpoint. The server must support:

- `POST /v1/messages` - Non-streaming
- `POST /v1/messages` with `stream: true` - SSE streaming
- `GET /v1/models` - Model listing (optional)

## Testing

See `messages.example.tsx` for interactive examples you can use for testing.

## License

Part of the MCP Agent Studio project.
