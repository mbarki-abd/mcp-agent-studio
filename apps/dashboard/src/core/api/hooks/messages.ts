import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';

// =====================================================
// Claude Messages API Types (Anthropic Compatible)
// =====================================================

export type MessageRole = 'user' | 'assistant';
export type ContentBlockType = 'text' | 'tool_use' | 'tool_result';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface SendMessageRequest {
  model: string;  // e.g., "claude-sonnet-4-20250514"
  max_tokens: number;
  messages: Message[];
  system?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface MessageResponse {
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

// Streaming event types (SSE)
export interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' |
        'content_block_stop' | 'message_delta' | 'message_stop' | 'ping' | 'error';
  index?: number;
  message?: Partial<MessageResponse>;
  content_block?: ContentBlock;
  delta?: { type: string; text?: string };
  usage?: { output_tokens: number };
  error?: { type: string; message: string };
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  max_output_tokens?: number;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Creates a fetch request for the Messages API
 */
function createMessagesRequest(
  token: string | null,
  request: SendMessageRequest
): RequestInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    credentials: 'include',
  };
}

/**
 * Parses SSE event data
 */
function parseSSEEvent(eventData: string): StreamEvent | null {
  try {
    return JSON.parse(eventData) as StreamEvent;
  } catch {
    return null;
  }
}

// =====================================================
// Non-Streaming Hook
// =====================================================

/**
 * Hook for sending messages without streaming
 *
 * @example
 * const { mutate, data, isLoading, error } = useSendMessage(serverUrl, token);
 * mutate({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 */
export function useSendMessage(serverUrl: string, token: string | null) {
  return useMutation<MessageResponse, Error, SendMessageRequest>({
    mutationFn: async (request: SendMessageRequest) => {
      const response = await fetch(
        `${serverUrl}/v1/messages`,
        createMessagesRequest(token, { ...request, stream: false })
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

// =====================================================
// Streaming Hook
// =====================================================

interface StreamingState {
  isLoading: boolean;
  error: Error | null;
  data: MessageResponse | null;
  streamingContent: string;
  contentBlocks: ContentBlock[];
}

interface SendMessageStreamingOptions {
  onChunk?: (chunk: string) => void;
  onContentBlock?: (block: ContentBlock) => void;
  onComplete?: (response: MessageResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for sending messages with streaming (SSE)
 *
 * @example
 * const { mutate, streamingContent, isLoading } = useSendMessageStreaming(
 *   serverUrl,
 *   token,
 *   {
 *     onChunk: (chunk) => console.log('New chunk:', chunk),
 *     onComplete: (response) => console.log('Done:', response)
 *   }
 * );
 *
 * mutate({
 *   model: "claude-sonnet-4-20250514",
 *   max_tokens: 1024,
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 */
export function useSendMessageStreaming(
  serverUrl: string,
  token: string | null,
  options?: SendMessageStreamingOptions
) {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    error: null,
    data: null,
    streamingContent: '',
    contentBlocks: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const mutate = useCallback(async (request: SendMessageRequest) => {
    // Cancel any existing stream
    cancel();

    // Reset state
    setState({
      isLoading: true,
      error: null,
      data: null,
      streamingContent: '',
      contentBlocks: [],
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(
        `${serverUrl}/v1/messages`,
        {
          ...createMessagesRequest(token, { ...request, stream: true }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let messageData: Partial<MessageResponse> = {
        content: [],
        usage: { input_tokens: 0, output_tokens: 0 },
      };
      let accumulatedText = '';
      const blocks: ContentBlock[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);

            // Check for stream end
            if (eventData === '[DONE]') {
              continue;
            }

            const event = parseSSEEvent(eventData);
            if (!event) continue;

            // Handle different event types
            switch (event.type) {
              case 'message_start':
                if (event.message) {
                  messageData = { ...messageData, ...event.message };
                }
                break;

              case 'content_block_start':
                if (event.content_block) {
                  blocks.push(event.content_block);
                  if (options?.onContentBlock) {
                    options.onContentBlock(event.content_block);
                  }
                }
                break;

              case 'content_block_delta':
                if (event.delta?.text) {
                  accumulatedText += event.delta.text;
                  setState(prev => ({
                    ...prev,
                    streamingContent: accumulatedText,
                    contentBlocks: blocks,
                  }));
                  if (options?.onChunk) {
                    options.onChunk(event.delta.text);
                  }
                }
                break;

              case 'content_block_stop':
                // Content block completed
                break;

              case 'message_delta':
                if (event.usage) {
                  messageData.usage = {
                    input_tokens: messageData.usage?.input_tokens || 0,
                    output_tokens: event.usage.output_tokens,
                  };
                }
                break;

              case 'message_stop':
                // Message completed - finalize
                const finalResponse: MessageResponse = {
                  id: messageData.id || '',
                  type: 'message',
                  role: 'assistant',
                  content: blocks.length > 0 ? blocks : [{ type: 'text', text: accumulatedText }],
                  model: messageData.model || request.model,
                  stop_reason: messageData.stop_reason || 'end_turn',
                  stop_sequence: messageData.stop_sequence,
                  usage: messageData.usage || { input_tokens: 0, output_tokens: 0 },
                };

                setState({
                  isLoading: false,
                  error: null,
                  data: finalResponse,
                  streamingContent: accumulatedText,
                  contentBlocks: blocks,
                });

                if (options?.onComplete) {
                  options.onComplete(finalResponse);
                }
                break;

              case 'error':
                throw new Error(event.error?.message || 'Stream error occurred');

              case 'ping':
                // Keep-alive, do nothing
                break;
            }
          }
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');

      // Don't set error state if aborted (user cancelled)
      if (err.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err,
        }));

        if (options?.onError) {
          options.onError(err);
        }
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [serverUrl, token, options, cancel]);

  return {
    mutate,
    cancel,
    ...state,
  };
}

// =====================================================
// Available Models Hook
// =====================================================

/**
 * Hook to fetch available Claude models
 *
 * @example
 * const { data: models, isLoading } = useAvailableModels(serverUrl, token);
 */
export function useAvailableModels(serverUrl: string, token: string | null) {
  return useMutation<ModelInfo[], Error>({
    mutationFn: async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${serverUrl}/v1/models`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || data.data || [];
    },
  });
}
