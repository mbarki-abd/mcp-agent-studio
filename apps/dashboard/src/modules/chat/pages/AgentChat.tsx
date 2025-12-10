import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Trash2,
  Settings,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { useChatStore } from '../stores/chat.store';
import { useAgent } from '../../../core/api';
import { AgentStatusBadge } from '../../agents/components/AgentStatusBadge';

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent, isLoading: isLoadingAgent, error } = useAgent(agentId || '');

  const {
    isStreaming,
    createSession,
    addMessage,
    setStreaming,
    clearSession,
    getSessionByAgent,
  } = useChatStore();

  // Get or create session for this agent
  useEffect(() => {
    if (agentId) {
      const existingSession = getSessionByAgent(agentId);
      if (!existingSession) {
        createSession(agentId);
      }
    }
  }, [agentId, getSessionByAgent, createSession]);

  const session = agentId ? getSessionByAgent(agentId) : null;
  const messages = session?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!session) return;

      // Add user message
      addMessage(session.id, {
        role: 'user',
        content,
      });

      // Simulate streaming response (in real app, this would be a WebSocket/API call)
      setStreaming(true);

      // Add assistant message placeholder
      const assistantMessageContent = await simulateAgentResponse(content);

      addMessage(session.id, {
        role: 'assistant',
        content: assistantMessageContent,
        agentId,
      });

      setStreaming(false);
    },
    [session, addMessage, setStreaming, agentId]
  );

  const handleOptimize = useCallback(
    async (content: string) => {
      if (!session) return;

      // Add system message about optimization
      addMessage(session.id, {
        role: 'system',
        content: 'Optimizing prompt...',
      });

      // Simulate optimization (in real app, this would call an optimization API)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const optimizedPrompt = `[Optimized] ${content}\n\nPlease provide a detailed, step-by-step response with code examples where applicable.`;

      addMessage(session.id, {
        role: 'system',
        content: `Prompt optimized. New prompt: "${optimizedPrompt}"`,
      });
    },
    [session, addMessage]
  );

  const handleClear = () => {
    if (session && window.confirm('Clear chat history?')) {
      clearSession(session.id);
    }
  };

  if (isLoadingAgent) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Agent not found</h3>
        <p className="text-muted-foreground mt-1">
          {error?.message || 'The agent you are looking for does not exist'}
        </p>
        <Button onClick={() => navigate('/agents')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">{agent.displayName}</h1>
                  <AgentStatusBadge status={agent.status} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {agent.role.toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/agents/${agentId}`)}>
                <Bot className="h-4 w-4 mr-2" />
                View Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium">Start a conversation</h2>
              <p className="text-muted-foreground mt-1 max-w-md">
                Send a message to {agent.displayName} to begin. The agent will
                respond based on its capabilities and configuration.
              </p>

              {/* Quick prompts */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {getQuickPrompts(agent.capabilities as string[]).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="px-3 py-1.5 text-sm rounded-full border hover:bg-muted transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  agentName={agent.displayName}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={handleSend}
          onOptimize={handleOptimize}
          isLoading={isStreaming}
          placeholder={`Message ${agent.displayName}...`}
          disabled={agent.status !== 'ACTIVE'}
        />
      </div>
    </div>
  );
}

// Helper functions
function getQuickPrompts(capabilities: string[] = []): string[] {
  const prompts: string[] = [];

  if (capabilities.includes('code-review')) {
    prompts.push('Review my code for issues');
  }
  if (capabilities.includes('testing')) {
    prompts.push('Write tests for my function');
  }
  if (capabilities.includes('debugging')) {
    prompts.push('Help me debug this error');
  }
  if (capabilities.includes('documentation')) {
    prompts.push('Document this module');
  }

  if (prompts.length === 0) {
    prompts.push(
      'What can you help me with?',
      'Explain your capabilities',
      'Help me with a task'
    );
  }

  return prompts.slice(0, 4);
}

async function simulateAgentResponse(userMessage: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  // Simple response based on user message
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm ready to help you with your tasks. What would you like me to do?";
  }

  if (lowerMessage.includes('code') || lowerMessage.includes('review')) {
    return `I can help review your code. Here's what I typically look for:

1. **Code Quality**: Clean, readable, and maintainable code
2. **Performance**: Potential bottlenecks or inefficiencies
3. **Security**: Common vulnerabilities and best practices
4. **Best Practices**: Following language/framework conventions

Please share the code you'd like me to review, and I'll provide detailed feedback.`;
  }

  if (lowerMessage.includes('test')) {
    return `I can help you write tests. Here's an example test structure:

\`\`\`typescript
describe('MyFunction', () => {
  it('should return expected result', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
\`\`\`

What function or module would you like me to write tests for?`;
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('capabilities')) {
    return `I can assist you with various development tasks:

- **Code Review**: Analyze code for quality, security, and best practices
- **Testing**: Write unit, integration, and e2e tests
- **Debugging**: Help identify and fix bugs
- **Documentation**: Generate documentation for your code
- **Refactoring**: Suggest improvements to code structure

Just describe what you need help with!`;
  }

  return `I understand you're asking about: "${userMessage}"

Let me help you with that. Could you provide more details about:
1. What specific outcome you're looking for?
2. Any context or constraints I should know about?

The more details you provide, the better I can assist you.`;
}
