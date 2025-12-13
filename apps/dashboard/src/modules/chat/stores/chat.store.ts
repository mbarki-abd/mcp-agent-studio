import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  toolCalls?: Array<{
    name: string;
    params: Record<string, unknown>;
    result?: string;
  }>;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  agentId: string;
  messages: ChatMessage[]; // Kept for compatibility
  messagesById: Map<string, ChatMessage>; // O(1) lookup optimization
  messageOrder: string[]; // Preserve insertion order
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  sessions: Map<string, ChatSession>;
  activeSessionId: string | null;
  isStreaming: boolean;

  // Actions
  createSession: (agentId: string) => string;
  setActiveSession: (sessionId: string | null) => void;
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (sessionId: string, messageId: string, content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearSession: (sessionId: string) => void;
  getSessionByAgent: (agentId: string) => ChatSession | undefined;
}

let messageIdCounter = 0;
const generateMessageId = () => `msg_${Date.now()}_${++messageIdCounter}`;

let sessionIdCounter = 0;
const generateSessionId = () => `session_${Date.now()}_${++sessionIdCounter}`;

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  isStreaming: false,

  createSession: (agentId) => {
    const sessionId = generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      agentId,
      messages: [],
      messagesById: new Map(),
      messageOrder: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, session);
      return {
        sessions: newSessions,
        activeSessionId: sessionId,
      };
    });

    return sessionId;
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  addMessage: (sessionId, message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date(),
    };

    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      // Update both Map (for O(1) lookup) and array (for compatibility)
      const newMessagesById = new Map(session.messagesById);
      newMessagesById.set(newMessage.id, newMessage);

      const newMessageOrder = [...session.messageOrder, newMessage.id];

      const updatedSession: ChatSession = {
        ...session,
        messages: [...session.messages, newMessage],
        messagesById: newMessagesById,
        messageOrder: newMessageOrder,
        updatedAt: new Date(),
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);
      return { sessions: newSessions };
    });
  },

  updateMessage: (sessionId, messageId, updates) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      // O(1) lookup using Map
      const existingMessage = session.messagesById.get(messageId);
      if (!existingMessage) return state;

      const updatedMessage = { ...existingMessage, ...updates };

      // Update Map
      const newMessagesById = new Map(session.messagesById);
      newMessagesById.set(messageId, updatedMessage);

      // Update array for compatibility
      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? updatedMessage : msg
      );

      const updatedSession: ChatSession = {
        ...session,
        messages: updatedMessages,
        messagesById: newMessagesById,
        updatedAt: new Date(),
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);
      return { sessions: newSessions };
    });
  },

  appendToMessage: (sessionId, messageId, content) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      // O(1) lookup using Map
      const existingMessage = session.messagesById.get(messageId);
      if (!existingMessage) return state;

      const updatedMessage = {
        ...existingMessage,
        content: existingMessage.content + content
      };

      // Update Map
      const newMessagesById = new Map(session.messagesById);
      newMessagesById.set(messageId, updatedMessage);

      // Update array for compatibility
      const updatedMessages = session.messages.map((msg) =>
        msg.id === messageId ? updatedMessage : msg
      );

      const updatedSession: ChatSession = {
        ...session,
        messages: updatedMessages,
        messagesById: newMessagesById,
        updatedAt: new Date(),
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);
      return { sessions: newSessions };
    });
  },

  setStreaming: (isStreaming) => set({ isStreaming }),

  clearSession: (sessionId) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const updatedSession: ChatSession = {
        ...session,
        messages: [],
        messagesById: new Map(),
        messageOrder: [],
        updatedAt: new Date(),
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);
      return { sessions: newSessions };
    });
  },

  getSessionByAgent: (agentId) => {
    const sessions = Array.from(get().sessions.values());
    return sessions.find((s) => s.agentId === agentId);
  },
}));
