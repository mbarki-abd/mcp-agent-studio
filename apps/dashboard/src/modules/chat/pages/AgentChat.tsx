import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Trash2,
  Settings,
  Users,
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
import {
  useAgent,
  useAgents,
  useCreateChatSession,
  useSendChatMessageStreaming,
  useClearChatSession,
} from '../../../core/api';
import {
  useChatSubscription,
  useChatStreamStart,
  useChatStreamChunk,
  useChatStreamEnd,
  type ChatStreamChunkEvent,
  type ChatStreamEndEvent,
} from '../../../core/websocket';
import { AgentStatusBadge } from '../../agents/components/AgentStatusBadge';

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiSessionId, setApiSessionId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Fetch agents list for selection page
  const { data: agentsData, isLoading: isLoadingAgents } = useAgents({ status: 'ACTIVE' });
  const agents = agentsData?.items || [];

  const { data: agent, isLoading: isLoadingAgent, error } = useAgent(agentId || '', {
    enabled: !!agentId,
  });

  // API mutations
  const createSession = useCreateChatSession();
  const sendMessage = useSendChatMessageStreaming();
  const clearSessionMutation = useClearChatSession();

  const {
    isStreaming,
    createSession: createLocalSession,
    addMessage,
    updateMessage,
    appendToMessage,
    setStreaming,
    clearSession,
    getSessionByAgent,
  } = useChatStore();

  // Get or create session for this agent
  useEffect(() => {
    if (agentId) {
      const existingSession = getSessionByAgent(agentId);
      if (!existingSession) {
        createLocalSession(agentId);
      }

      // Create API session if we don't have one
      if (!apiSessionId) {
        createSession.mutate(agentId, {
          onSuccess: (data) => {
            setApiSessionId(data.id);
          },
        });
      }
    }
  }, [agentId, getSessionByAgent, createLocalSession, apiSessionId, createSession]);

  const session = agentId ? getSessionByAgent(agentId) : null;
  const messages = session?.messages || [];

  // Subscribe to WebSocket chat events
  useChatSubscription(apiSessionId || undefined);

  // Handle streaming start
  useChatStreamStart(useCallback((event) => {
    if (event.sessionId === apiSessionId) {
      setStreamingMessageId(event.messageId);
      // Add placeholder message for streaming
      if (session) {
        addMessage(session.id, {
          role: 'assistant',
          content: '',
          agentId,
          isStreaming: true,
        });
      }
    }
  }, [apiSessionId, session, addMessage, agentId]));

  // Handle streaming chunks
  useChatStreamChunk(useCallback((event: ChatStreamChunkEvent) => {
    if (event.sessionId === apiSessionId && session) {
      // Find the last message (should be the streaming one)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.isStreaming) {
        appendToMessage(session.id, lastMessage.id, event.chunk);
      }
    }
  }, [apiSessionId, session, messages, appendToMessage]));

  // Handle streaming end
  useChatStreamEnd(useCallback((event: ChatStreamEndEvent) => {
    if (event.sessionId === apiSessionId && session) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.isStreaming) {
        updateMessage(session.id, lastMessage.id, {
          content: event.content,
          toolCalls: event.toolCalls,
          isStreaming: false,
        });
      }
      setStreamingMessageId(null);
      setStreaming(false);
    }
  }, [apiSessionId, session, messages, updateMessage, setStreaming]));

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!session || !apiSessionId) return;

      // Add user message locally
      addMessage(session.id, {
        role: 'user',
        content,
      });

      setStreaming(true);

      // Send via API with streaming
      sendMessage.mutate(
        { sessionId: apiSessionId, content },
        {
          onError: (error) => {
            // On error, add error message
            addMessage(session.id, {
              role: 'system',
              content: `Error: ${error.message}`,
            });
            setStreaming(false);
          },
          onSuccess: (data) => {
            // If WebSocket didn't handle streaming, use the response directly
            if (!streamingMessageId) {
              // Check if we already have the streaming message
              const lastMsg = messages[messages.length - 1];
              if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
                addMessage(session.id, {
                  role: 'assistant',
                  content: data.assistantMessage.content,
                  agentId,
                  toolCalls: data.assistantMessage.toolCalls,
                });
              }
              setStreaming(false);
            }
          },
        }
      );
    },
    [session, apiSessionId, addMessage, setStreaming, sendMessage, agentId, streamingMessageId, messages]
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
    if (session && apiSessionId && window.confirm('Clear chat history?')) {
      clearSession(session.id);
      clearSessionMutation.mutate(apiSessionId);
    }
  };

  // Show agent selection page if no agentId
  if (!agentId) {
    if (isLoadingAgents) {
      return (
        <div className="h-full flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Chat with Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Select an agent to start a conversation
          </p>
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No active agents</h3>
            <p className="text-muted-foreground mt-1">
              Create and activate an agent to start chatting
            </p>
            <Button onClick={() => navigate('/agents/new')} className="mt-4">
              Create Agent
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => navigate(`/chat/${agent.id}`)}
                className="p-4 border rounded-lg text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-muted">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{agent.displayName}</span>
                      <AgentStatusBadge status={agent.status} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {agent.role.toLowerCase()}
                    </span>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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
        <Button onClick={() => navigate('/chat')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
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
