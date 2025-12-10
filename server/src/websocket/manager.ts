import type { WebSocket } from '@fastify/websocket';
import type { WebSocketClient, RealtimeEvent, ClientMessage } from './types.js';
import { prisma } from '../index.js';

class WebSocketManager {
  private clients: Map<WebSocket, WebSocketClient> = new Map();
  private agentSubscriptions: Map<string, Set<WebSocket>> = new Map();
  private serverSubscriptions: Map<string, Set<WebSocket>> = new Map();

  registerClient(ws: WebSocket, userId: string) {
    this.clients.set(ws, {
      userId,
      subscribedAgents: new Set(),
      subscribedServers: new Set(),
    });

    ws.on('message', async (rawMessage) => {
      try {
        const message: ClientMessage = JSON.parse(rawMessage.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.unregisterClient(ws);
    });

    // Send acknowledgment
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date() }));
  }

  unregisterClient(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remove from all subscriptions
    for (const agentId of client.subscribedAgents) {
      this.agentSubscriptions.get(agentId)?.delete(ws);
    }
    for (const serverId of client.subscribedServers) {
      this.serverSubscriptions.get(serverId)?.delete(ws);
    }

    this.clients.delete(ws);
  }

  private async handleMessage(ws: WebSocket, message: ClientMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { action, type, id } = message;

    if (type === 'agent') {
      // Verify user has access to this agent
      const hasAccess = await this.verifyAgentAccess(client.userId, id);
      if (!hasAccess) {
        ws.send(JSON.stringify({ error: 'Access denied to agent', agentId: id }));
        return;
      }

      if (action === 'subscribe') {
        this.subscribeToAgent(ws, id);
        ws.send(JSON.stringify({ type: 'subscribed', target: 'agent', id }));
      } else if (action === 'unsubscribe') {
        this.unsubscribeFromAgent(ws, id);
        ws.send(JSON.stringify({ type: 'unsubscribed', target: 'agent', id }));
      }
    } else if (type === 'server') {
      // Verify user has access to this server
      const hasAccess = await this.verifyServerAccess(client.userId, id);
      if (!hasAccess) {
        ws.send(JSON.stringify({ error: 'Access denied to server', serverId: id }));
        return;
      }

      if (action === 'subscribe') {
        this.subscribeToServer(ws, id);
        ws.send(JSON.stringify({ type: 'subscribed', target: 'server', id }));
      } else if (action === 'unsubscribe') {
        this.unsubscribeFromServer(ws, id);
        ws.send(JSON.stringify({ type: 'unsubscribed', target: 'server', id }));
      }
    }
  }

  private subscribeToAgent(ws: WebSocket, agentId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedAgents.add(agentId);

    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, new Set());
    }
    this.agentSubscriptions.get(agentId)!.add(ws);
  }

  private unsubscribeFromAgent(ws: WebSocket, agentId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedAgents.delete(agentId);
    this.agentSubscriptions.get(agentId)?.delete(ws);
  }

  private subscribeToServer(ws: WebSocket, serverId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedServers.add(serverId);

    if (!this.serverSubscriptions.has(serverId)) {
      this.serverSubscriptions.set(serverId, new Set());
    }
    this.serverSubscriptions.get(serverId)!.add(ws);
  }

  private unsubscribeFromServer(ws: WebSocket, serverId: string) {
    const client = this.clients.get(ws);
    if (!client) return;

    client.subscribedServers.delete(serverId);
    this.serverSubscriptions.get(serverId)?.delete(ws);
  }

  private async verifyAgentAccess(userId: string, agentId: string): Promise<boolean> {
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    return !!agent;
  }

  private async verifyServerAccess(userId: string, serverId: string): Promise<boolean> {
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: serverId, userId },
    });

    return !!server;
  }

  // Broadcast to all subscribers of an agent
  broadcastToAgent(agentId: string, event: RealtimeEvent) {
    const subscribers = this.agentSubscriptions.get(agentId);
    if (!subscribers) return;

    const message = JSON.stringify(event);
    for (const ws of subscribers) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    }
  }

  // Broadcast to all subscribers of a server
  broadcastToServer(serverId: string, event: RealtimeEvent) {
    const subscribers = this.serverSubscriptions.get(serverId);
    if (!subscribers) return;

    const message = JSON.stringify(event);
    for (const ws of subscribers) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    }
  }

  // Broadcast to a specific user
  broadcastToUser(userId: string, event: RealtimeEvent) {
    const message = JSON.stringify(event);
    for (const [ws, client] of this.clients) {
      if (client.userId === userId && ws.readyState === 1) {
        ws.send(message);
      }
    }
  }

  // Get stats
  getStats() {
    return {
      connectedClients: this.clients.size,
      agentSubscriptions: this.agentSubscriptions.size,
      serverSubscriptions: this.serverSubscriptions.size,
    };
  }
}

export const wsManager = new WebSocketManager();
