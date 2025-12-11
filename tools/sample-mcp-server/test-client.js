/**
 * Test client for validating MCP Server integration
 *
 * Run: node test-client.js
 */

import WebSocket from 'ws';

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:3001';
const TOKEN = process.env.MCP_TOKEN || 'sample-token-12345';

let requestId = 0;
const pendingRequests = new Map();

function sendRequest(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Request timeout: ${method}`));
    }, 10000);

    pendingRequests.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify(request));
  });
}

function sendNotification(ws, method, params = {}) {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
  }));
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('MCP Client Integration Test');
  console.log('='.repeat(60));
  console.log(`Server: ${SERVER_URL}`);
  console.log();

  const ws = new WebSocket(SERVER_URL, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  });

  let testsPassed = 0;
  let testsFailed = 0;

  function test(name, passed, message = '') {
    if (passed) {
      testsPassed++;
      console.log(`✓ ${name}`);
    } else {
      testsFailed++;
      console.log(`✗ ${name}: ${message}`);
    }
  }

  return new Promise((resolve) => {
    ws.on('open', async () => {
      console.log('Connected to MCP server\n');

      try {
        // Test 1: Initialize
        console.log('Test 1: Initialize connection');
        const initResult = await sendRequest(ws, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, prompts: {}, resources: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' },
        });
        test('Initialize', initResult.serverInfo?.name === 'sample-mcp-server');
        sendNotification(ws, 'notifications/initialized');
        console.log(`  Server: ${initResult.serverInfo?.name} v${initResult.serverInfo?.version}`);
        console.log();

        // Test 2: List tools
        console.log('Test 2: List available tools');
        const toolsResult = await sendRequest(ws, 'tools/list');
        test('List tools', Array.isArray(toolsResult.tools) && toolsResult.tools.length > 0);
        console.log(`  Found ${toolsResult.tools?.length || 0} tools`);
        console.log();

        // Test 3: Echo tool
        console.log('Test 3: Call echo tool');
        const echoResult = await sendRequest(ws, 'tools/call', {
          name: 'echo',
          arguments: { message: 'Hello MCP!' },
        });
        const echoText = echoResult.content?.[0]?.text;
        test('Echo tool', echoText === 'Hello MCP!', echoText);
        console.log(`  Response: ${echoText}`);
        console.log();

        // Test 4: Calculate tool
        console.log('Test 4: Call calculate tool');
        const calcResult = await sendRequest(ws, 'tools/call', {
          name: 'calculate',
          arguments: { operation: 'add', a: 10, b: 5 },
        });
        const calcText = calcResult.content?.[0]?.text;
        test('Calculate tool', calcText?.includes('15'), calcText);
        console.log(`  Response: ${calcText}`);
        console.log();

        // Test 5: Get time tool
        console.log('Test 5: Call get_time tool');
        const timeResult = await sendRequest(ws, 'tools/call', {
          name: 'get_time',
          arguments: { timezone: 'UTC' },
        });
        const timeText = timeResult.content?.[0]?.text;
        test('Get time tool', timeText?.includes('UTC'), timeText);
        console.log(`  Response: ${timeText}`);
        console.log();

        // Test 6: Execute prompt
        console.log('Test 6: Execute prompt (simulated)');
        const promptResult = await sendRequest(ws, 'tools/call', {
          name: 'execute_prompt',
          arguments: {
            executionId: 'test-exec-001',
            prompt: 'Hello world this is a test',
            agentId: 'test-agent',
          },
        });
        const promptText = promptResult.content?.[0]?.text;
        const promptData = JSON.parse(promptText || '{}');
        test('Execute prompt', promptData.success === true);
        console.log(`  Success: ${promptData.success}`);
        console.log(`  Tokens used: ${promptData.tokensUsed}`);
        console.log();

        // Test 7: List prompts
        console.log('Test 7: List prompts');
        const promptsResult = await sendRequest(ws, 'prompts/list');
        test('List prompts', Array.isArray(promptsResult.prompts));
        console.log(`  Found ${promptsResult.prompts?.length || 0} prompts`);
        console.log();

        // Test 8: List resources
        console.log('Test 8: List resources');
        const resourcesResult = await sendRequest(ws, 'resources/list');
        test('List resources', Array.isArray(resourcesResult.resources));
        console.log(`  Found ${resourcesResult.resources?.length || 0} resources`);
        console.log();

        // Test 9: Ping
        console.log('Test 9: Ping');
        const pingResult = await sendRequest(ws, 'ping');
        test('Ping', pingResult.pong === true);
        console.log(`  Pong: ${pingResult.pong}`);
        console.log();

        // Test 10: Unknown method
        console.log('Test 10: Unknown method (should fail)');
        try {
          await sendRequest(ws, 'unknown/method');
          test('Unknown method error', false, 'Should have thrown');
        } catch (error) {
          test('Unknown method error', error.message.includes('Method not found'));
        }
        console.log();

      } catch (error) {
        console.error('Test error:', error);
        testsFailed++;
      }

      // Summary
      console.log('='.repeat(60));
      console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
      console.log('='.repeat(60));

      ws.close();
      resolve({ passed: testsPassed, failed: testsFailed });
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle response
        if (message.id !== undefined && message.id !== null) {
          const pending = pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(message.id);

            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
          return;
        }

        // Handle notification
        if (message.method) {
          console.log(`  [Notification] ${message.method}`);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      resolve({ passed: testsPassed, failed: testsFailed + 1 });
    });

    ws.on('close', (code, reason) => {
      console.log(`\nConnection closed: ${code}`);
    });
  });
}

runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
});
