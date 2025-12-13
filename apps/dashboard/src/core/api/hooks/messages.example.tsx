/**
 * Example Usage of Claude Messages API Hooks
 *
 * This file demonstrates how to use the Messages API hooks for both
 * streaming and non-streaming Claude AI message execution.
 */

import { useSendMessage, useSendMessageStreaming, useAvailableModels } from './messages';
import { useState } from 'react';

// =====================================================
// Example 1: Non-Streaming Message
// =====================================================

export function NonStreamingExample() {
  const serverUrl = 'http://localhost:3000/api';
  const token = 'your-api-token'; // Or from auth context
  const { mutate, data, isPending, error } = useSendMessage(serverUrl, token);

  const sendMessage = () => {
    mutate({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello! What can you tell me about TypeScript?',
        },
      ],
    });
  };

  return (
    <div>
      <button onClick={sendMessage} disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </button>
      {error && <div>Error: {error.message}</div>}
      {data && (
        <div>
          <h3>Response:</h3>
          {data.content.map((block, idx) => (
            <div key={idx}>
              {block.type === 'text' && <p>{block.text}</p>}
              {block.type === 'tool_use' && (
                <pre>Tool: {block.name} - {JSON.stringify(block.input, null, 2)}</pre>
              )}
            </div>
          ))}
          <p>Tokens used: {data.usage.input_tokens} in, {data.usage.output_tokens} out</p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Example 2: Streaming Message
// =====================================================

export function StreamingExample() {
  const serverUrl = 'http://localhost:3000/api';
  const token = 'your-api-token';
  const [chunks, setChunks] = useState<string[]>([]);

  const { mutate, streamingContent, isLoading, error, cancel } = useSendMessageStreaming(
    serverUrl,
    token,
    {
      onChunk: (chunk) => {
        console.log('New chunk:', chunk);
        setChunks(prev => [...prev, chunk]);
      },
      onComplete: (response) => {
        console.log('Stream complete:', response);
      },
      onError: (error) => {
        console.error('Stream error:', error);
      },
    }
  );

  const sendMessage = () => {
    setChunks([]);
    mutate({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: 'Write a short story about a robot learning to paint.',
        },
      ],
      temperature: 0.7,
    });
  };

  return (
    <div>
      <button onClick={sendMessage} disabled={isLoading}>
        {isLoading ? 'Streaming...' : 'Start Stream'}
      </button>
      {isLoading && <button onClick={cancel}>Cancel</button>}
      {error && <div>Error: {error.message}</div>}
      <div>
        <h3>Streaming Content:</h3>
        <p>{streamingContent}</p>
      </div>
      <div>
        <h4>Chunks received: {chunks.length}</h4>
      </div>
    </div>
  );
}

// =====================================================
// Example 3: Tool Use (Function Calling)
// =====================================================

export function ToolUseExample() {
  const serverUrl = 'http://localhost:3000/api';
  const token = 'your-api-token';
  const { mutate, data, isPending } = useSendMessage(serverUrl, token);

  const sendMessageWithTools = () => {
    mutate({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'What is the weather like in Paris?',
        },
      ],
      tools: [
        {
          name: 'get_weather',
          description: 'Get the current weather for a location',
          input_schema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city name',
              },
            },
            required: ['location'],
          },
        },
      ],
    });
  };

  return (
    <div>
      <button onClick={sendMessageWithTools} disabled={isPending}>
        Ask About Weather
      </button>
      {data && (
        <div>
          {data.content.map((block, idx) => (
            <div key={idx}>
              {block.type === 'text' && <p>{block.text}</p>}
              {block.type === 'tool_use' && (
                <div>
                  <h4>Tool Called: {block.name}</h4>
                  <pre>{JSON.stringify(block.input, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// Example 4: Multi-Turn Conversation
// =====================================================

export function ConversationExample() {
  const serverUrl = 'http://localhost:3000/api';
  const token = 'your-api-token';
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');

  const { mutate, isPending } = useSendMessage(serverUrl, token);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');

    mutate(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: newMessages,
      },
      {
        onSuccess: (data) => {
          const assistantContent = data.content
            .filter(block => block.type === 'text')
            .map(block => (block as { type: 'text'; text: string }).text)
            .join('\n');

          setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
        },
      }
    );
  };

  return (
    <div>
      <div style={{ height: '400px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isPending}
          style={{ width: '80%', padding: '5px' }}
        />
        <button onClick={sendMessage} disabled={isPending || !input.trim()}>
          {isPending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Example 5: Available Models
// =====================================================

export function ModelsExample() {
  const serverUrl = 'http://localhost:3000/api';
  const token = 'your-api-token';
  const { mutate, data, isPending } = useAvailableModels(serverUrl, token);

  return (
    <div>
      <button onClick={() => mutate()} disabled={isPending}>
        {isPending ? 'Loading...' : 'Get Available Models'}
      </button>
      {data && (
        <ul>
          {data.map((model) => (
            <li key={model.id}>
              <strong>{model.name}</strong> ({model.id})
              {model.description && <p>{model.description}</p>}
              {model.context_window && <small>Context: {model.context_window} tokens</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
