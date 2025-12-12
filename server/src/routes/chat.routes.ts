import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { getTenantContext, getOrganizationServerIds } from '../utils/tenant.js';

const createSessionSchema = z.object({
  agentId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function chatRoutes(fastify: FastifyInstance) {
  // Create or get chat session (org visible for agents)
  fastify.post('/sessions', {
    schema: {
      tags: ['Chat'],
      description: 'Create or get a chat session with an agent',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const body = createSessionSchema.parse(request.body);

    // Verify agent exists and belongs to organization
    const serverIds = await getOrganizationServerIds(organizationId);

    const agent = await prisma.agent.findFirst({
      where: { id: body.agentId, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // Find existing session or create new one
    let session = await prisma.chatSession.findFirst({
      where: { agentId: body.agentId, userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          agentId: body.agentId,
          userId,
        },
      });
    }

    return {
      id: session.id,
      agentId: session.agentId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });

  // List chat sessions (user's own sessions only)
  fastify.get('/sessions', {
    schema: {
      tags: ['Chat'],
      description: 'List all chat sessions for the user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { agentId } = request.query as { agentId?: string };

    const where: { userId: string; agentId?: string } = { userId };
    if (agentId) {
      where.agentId = agentId;
    }

    const sessions = await prisma.chatSession.findMany({
      where,
      include: {
        agent: {
          select: { id: true, name: true, displayName: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        agentId: s.agentId,
        agent: s.agent,
        messageCount: s._count.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  });

  // Get session messages (owner only)
  fastify.get('/sessions/:sessionId/messages', {
    schema: {
      tags: ['Chat'],
      description: 'Get messages in a chat session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { sessionId } = request.params as { sessionId: string };

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agentId: m.agentId,
        toolCalls: m.toolCalls,
        timestamp: m.createdAt,
      })),
    };
  });

  // Send message to agent (owner only)
  fastify.post('/sessions/:sessionId/messages', {
    schema: {
      tags: ['Chat'],
      description: 'Send a message to the agent',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { sessionId } = request.params as { sessionId: string };
    const body = sendMessageSchema.parse(request.body);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { agent: true },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: body.content,
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Generate agent response (this would connect to real MCP in production)
    const agentResponse = await generateAgentResponse(
      session.agent,
      body.content,
      fastify,
      sessionId
    );

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: agentResponse.content,
        agentId: session.agentId,
        toolCalls: agentResponse.toolCalls as Prisma.InputJsonValue | undefined,
      },
    });

    return {
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        agentId: assistantMessage.agentId,
        toolCalls: assistantMessage.toolCalls,
        timestamp: assistantMessage.createdAt,
      },
    };
  });

  // Streaming endpoint for real-time chat (owner only)
  fastify.post('/sessions/:sessionId/stream', {
    schema: {
      tags: ['Chat'],
      description: 'Send a message and receive streaming response',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { sessionId } = request.params as { sessionId: string };
    const body = sendMessageSchema.parse(request.body);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { agent: true },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: body.content,
      },
    });

    // Create placeholder for assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: '',
        agentId: session.agentId,
      },
    });

    // Emit start event via WebSocket
    fastify.io.to(`chat:${sessionId}`).emit('chat:stream:start', {
      sessionId,
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
    });

    // Stream response chunks via WebSocket
    const fullResponse = await streamAgentResponse(
      session.agent,
      body.content,
      fastify,
      sessionId,
      assistantMessage.id
    );

    // Update the message with final content
    await prisma.chatMessage.update({
      where: { id: assistantMessage.id },
      data: {
        content: fullResponse.content,
        toolCalls: fullResponse.toolCalls as Prisma.InputJsonValue | undefined,
      },
    });

    // Emit completion event
    fastify.io.to(`chat:${sessionId}`).emit('chat:stream:end', {
      sessionId,
      messageId: assistantMessage.id,
      content: fullResponse.content,
      toolCalls: fullResponse.toolCalls,
    });

    return {
      userMessage: {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        timestamp: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: 'assistant',
        content: fullResponse.content,
        agentId: session.agentId,
        toolCalls: fullResponse.toolCalls,
        timestamp: assistantMessage.createdAt,
      },
    };
  });

  // Clear session history (owner only)
  fastify.delete('/sessions/:sessionId', {
    schema: {
      tags: ['Chat'],
      description: 'Clear chat session history',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { sessionId } = request.params as { sessionId: string };

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Delete all messages in session
    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    });

    return { message: 'Chat history cleared' };
  });
}

// Agent response generation (will connect to real MCP in production)
interface AgentResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    params: Record<string, unknown>;
    result?: string;
  }>;
}

async function generateAgentResponse(
  agent: { name: string; displayName: string; capabilities: unknown },
  userMessage: string,
  _fastify: FastifyInstance,
  _sessionId: string
): Promise<AgentResponse> {
  // In production, this would:
  // 1. Connect to the MCP server via the agent's server configuration
  // 2. Send the message through the MCP protocol
  // 3. Return the real agent response

  // For now, simulate intelligent responses based on capabilities
  const capabilities = (agent.capabilities as string[]) || [];
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      content: `Hello! I'm ${agent.displayName}. I can help you with ${capabilities.length > 0 ? capabilities.join(', ') : 'various tasks'}. How can I assist you today?`,
    };
  }

  if (lowerMessage.includes('code') || lowerMessage.includes('review')) {
    return {
      content: `I can help review your code. Here's what I typically look for:

1. **Code Quality**: Clean, readable, and maintainable code
2. **Performance**: Potential bottlenecks or inefficiencies
3. **Security**: Common vulnerabilities and best practices
4. **Best Practices**: Following language/framework conventions

Please share the code you'd like me to review, and I'll provide detailed feedback.`,
      toolCalls: capabilities.includes('code-review') ? [
        { name: 'analyze_code', params: { type: 'review' } },
      ] : undefined,
    };
  }

  if (lowerMessage.includes('test')) {
    return {
      content: `I can help you write tests. Here's an example test structure:

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

What function or module would you like me to write tests for?`,
      toolCalls: capabilities.includes('testing') ? [
        { name: 'generate_tests', params: { framework: 'jest' } },
      ] : undefined,
    };
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('capabilities')) {
    return {
      content: `I'm ${agent.displayName} and I can assist you with:

${capabilities.map((c) => `- **${c}**`).join('\n') || '- General assistance'}

Just describe what you need help with and I'll do my best to assist!`,
    };
  }

  // Default response
  return {
    content: `I understand you're asking about: "${userMessage}"

Let me help you with that. Could you provide more details about:
1. What specific outcome you're looking for?
2. Any context or constraints I should know about?

The more details you provide, the better I can assist you.`,
  };
}

async function streamAgentResponse(
  agent: { name: string; displayName: string; capabilities: unknown },
  userMessage: string,
  fastify: FastifyInstance,
  sessionId: string,
  messageId: string
): Promise<AgentResponse> {
  // Get the full response first
  const response = await generateAgentResponse(agent, userMessage, fastify, sessionId);

  // Simulate streaming by sending chunks
  const words = response.content.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    accumulated += (i > 0 ? ' ' : '') + words[i];

    // Emit chunk via WebSocket
    fastify.io.to(`chat:${sessionId}`).emit('chat:stream:chunk', {
      sessionId,
      messageId,
      chunk: (i > 0 ? ' ' : '') + words[i],
      accumulated,
    });

    // Small delay to simulate streaming
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 20));
  }

  return response;
}
