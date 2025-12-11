/**
 * MCP Client Integration Tests
 *
 * These tests validate the MCP client against the sample MCP server.
 * Run the sample server first: cd tools/sample-mcp-server && npm start
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient, getMCPClient, removeMCPClient, clearMCPClients } from '../services/mcp-client.js';

const TEST_SERVER_URL = process.env.MCP_TEST_SERVER || 'http://localhost:3001';
const TEST_TOKEN = process.env.MCP_TEST_TOKEN || 'sample-token-12345';

describe('MCPClient', () => {
  let client: MCPClient;

  beforeAll(() => {
    client = new MCPClient({
      serverUrl: TEST_SERVER_URL,
      wsUrl: TEST_SERVER_URL.replace('http', 'ws'),
      token: TEST_TOKEN,
      timeout: 10000,
      reconnect: false,
    });
  });

  afterAll(async () => {
    client.disconnect();
    clearMCPClients();
  });

  describe('Connection', () => {
    it('should connect to MCP server', async () => {
      await client.connect();
      expect(client.connectionState).toBe('connected');
    });

    it('should have server info after initialization', () => {
      expect(client.server).toBeDefined();
      expect(client.server?.name).toBe('sample-mcp-server');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      const tools = await client.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const echoTool = tools.find(t => t.name === 'echo');
      expect(echoTool).toBeDefined();
      expect(echoTool?.description).toBeDefined();
    });

    it('should call echo tool', async () => {
      const result = await client.callTool('echo', { message: 'test message' });
      expect(result).toBeDefined();
    });

    it('should call calculate tool', async () => {
      const result = await client.callTool('calculate', {
        operation: 'add',
        a: 10,
        b: 5,
      });
      expect(result).toBeDefined();
    });
  });

  describe('Execution', () => {
    it('should execute prompt with streaming callbacks', async () => {
      const outputChunks: string[] = [];
      const progressUpdates: number[] = [];

      const result = await client.execute(
        {
          prompt: 'Hello world test',
          timeout: 30000,
        },
        {
          onOutput: (chunk) => outputChunks.push(chunk),
          onProgress: (progress) => progressUpdates.push(progress),
        }
      );

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(outputChunks.length).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });
});

describe('MCPClient Pool', () => {
  afterAll(() => {
    clearMCPClients();
  });

  it('should return same client for same server/token', () => {
    const client1 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: TEST_TOKEN,
    });

    const client2 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: TEST_TOKEN,
    });

    expect(client1).toBe(client2);
  });

  it('should return different clients for different tokens', () => {
    const client1 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: 'token-a-12345678',
    });

    const client2 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: 'token-b-87654321',
    });

    expect(client1).not.toBe(client2);
  });

  it('should remove client from pool', () => {
    const client1 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: 'token-remove-test',
    });

    removeMCPClient(TEST_SERVER_URL, 'token-remove-test');

    const client2 = getMCPClient({
      serverUrl: TEST_SERVER_URL,
      token: 'token-remove-test',
    });

    expect(client1).not.toBe(client2);
  });
});
