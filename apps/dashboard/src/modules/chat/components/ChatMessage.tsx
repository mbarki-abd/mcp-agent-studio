import { Bot, User, Wrench, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { ChatMessage as ChatMessageType } from '../stores/chat.store';

interface ChatMessageProps {
  message: ChatMessageType;
  agentName?: string;
}

export function ChatMessage({ message, agentName = 'Agent' }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col max-w-[80%] gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Name & Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{isUser ? 'You' : agentName}</span>
          <span>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 group relative',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          {/* Streaming indicator */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}

          {/* Content */}
          <div className="whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute -right-10 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
              isUser && '-left-10 -right-auto'
            )}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 w-full">
            {message.toolCalls.map((tool, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-3 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Wrench className="h-4 w-4" />
                  <span className="font-medium">{tool.name}</span>
                </div>
                {tool.params && Object.keys(tool.params).length > 0 && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(tool.params, null, 2)}
                  </pre>
                )}
                {tool.result && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Result:</span>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                      {tool.result}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  // Simple markdown-like rendering for code blocks
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, index) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const language = lines[0] || '';
      const code = lines.slice(1).join('\n');
      return (
        <pre
          key={index}
          className="my-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm"
        >
          {language && (
            <div className="text-xs text-gray-400 mb-2">{language}</div>
          )}
          <code>{code || lines.join('\n')}</code>
        </pre>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}
