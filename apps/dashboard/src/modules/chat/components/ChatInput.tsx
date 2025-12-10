import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onOptimize?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onOptimize,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOptimize = () => {
    const trimmed = message.trim();
    if (trimmed && onOptimize) {
      onOptimize(trimmed);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        {/* Attachments button */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-10 w-10"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border bg-muted px-4 py-3 pr-24',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'placeholder:text-muted-foreground',
              'min-h-[48px] max-h-[200px]',
              (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
          />

          {/* Inline buttons */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {onOptimize && message.trim() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleOptimize}
                disabled={disabled || isLoading}
                title="Optimize prompt"
              >
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={disabled}
              title="Voice input"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Send/Stop button */}
        <Button
          onClick={isLoading ? undefined : handleSubmit}
          disabled={(!message.trim() && !isLoading) || disabled}
          className={cn(
            'flex-shrink-0 h-10 w-10 rounded-xl',
            isLoading && 'bg-red-500 hover:bg-red-600'
          )}
          size="icon"
        >
          {isLoading ? (
            <StopCircle className="h-5 w-5" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Character count / hints */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to send,{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded">Shift+Enter</kbd> for new line
        </span>
        {message.length > 0 && (
          <span>{message.length} characters</span>
        )}
      </div>
    </div>
  );
}
