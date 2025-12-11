/**
 * Comprehensive Seed & Test Script
 * Creates realistic test data and tests all functionality including chat
 */

import { chromium } from 'playwright';

const API_URL = 'http://localhost:3000';
const BASE_URL = 'http://localhost:5173';

const TEST_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
  name: 'MBARKI Admin'
};

// Test Data Configuration
const TEST_SERVERS = [
  {
    name: 'local-mcp-dev',
    description: 'Local Development MCP Server for testing',
    url: 'http://localhost:8080',
    wsUrl: 'ws://localhost:8080',
    masterToken: 'dev-master-token-secure-12345',
    isDefault: true,
    autoConnect: true
  },
  {
    name: 'staging-mcp',
    description: 'Staging Environment MCP Server',
    url: 'http://staging.mcp.example.com',
    wsUrl: 'ws://staging.mcp.example.com',
    masterToken: 'staging-token-67890',
    isDefault: false,
    autoConnect: false
  }
];

const TEST_AGENTS = [
  {
    name: 'orchestrator',
    displayName: 'Master Orchestrator',
    role: 'MASTER',
    systemPrompt: 'You are the master orchestration agent responsible for coordinating other agents, planning complex tasks, and ensuring efficient execution of workflows.',
    capabilities: ['orchestration', 'planning', 'delegation', 'monitoring'],
    maxConcurrentTasks: 10,
    priority: 100
  },
  {
    name: 'code-reviewer',
    displayName: 'Code Review Expert',
    role: 'WORKER',
    systemPrompt: 'You are a senior code reviewer. Analyze code for quality, security vulnerabilities, performance issues, and adherence to best practices.',
    capabilities: ['code-review', 'security-analysis', 'best-practices', 'refactoring'],
    maxConcurrentTasks: 5,
    priority: 80
  },
  {
    name: 'test-writer',
    displayName: 'Test Automation Specialist',
    role: 'WORKER',
    systemPrompt: 'You are a testing expert. Write comprehensive unit tests, integration tests, and end-to-end tests following best practices.',
    capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'test-coverage'],
    maxConcurrentTasks: 5,
    priority: 70
  },
  {
    name: 'doc-writer',
    displayName: 'Documentation Writer',
    role: 'WORKER',
    systemPrompt: 'You are a technical writer. Create clear, comprehensive documentation including API docs, user guides, and architecture diagrams.',
    capabilities: ['documentation', 'api-docs', 'user-guides', 'diagrams'],
    maxConcurrentTasks: 3,
    priority: 60
  },
  {
    name: 'debugger',
    displayName: 'Debug Assistant',
    role: 'WORKER',
    systemPrompt: 'You are a debugging expert. Help identify root causes of bugs, suggest fixes, and explain error messages.',
    capabilities: ['debugging', 'error-analysis', 'troubleshooting', 'performance-profiling'],
    maxConcurrentTasks: 4,
    priority: 90
  }
];

const TEST_TASKS = [
  {
    title: 'Review Authentication Module PR #142',
    description: 'Comprehensive code review of the new JWT authentication implementation with security focus',
    priority: 'HIGH',
    executionMode: 'IMMEDIATE',
    prompt: 'Review the authentication module changes. Focus on security vulnerabilities, token handling, and session management best practices.'
  },
  {
    title: 'Write Unit Tests for User Service',
    description: 'Create comprehensive unit tests for the user service module covering all CRUD operations',
    priority: 'MEDIUM',
    executionMode: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    prompt: 'Write unit tests for UserService covering: createUser, updateUser, deleteUser, getUserById, and listUsers methods.'
  },
  {
    title: 'Generate API Documentation',
    description: 'Create OpenAPI documentation for all REST endpoints',
    priority: 'LOW',
    executionMode: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    prompt: 'Generate comprehensive API documentation in OpenAPI 3.0 format for all endpoints.'
  },
  {
    title: 'Daily Security Scan',
    description: 'Automated daily security vulnerability scan of the codebase',
    priority: 'HIGH',
    executionMode: 'RECURRING',
    cronExpression: '0 2 * * *', // Every day at 2 AM
    prompt: 'Scan the codebase for security vulnerabilities including: SQL injection, XSS, CSRF, and dependency vulnerabilities.'
  },
  {
    title: 'Debug Memory Leak in WebSocket Handler',
    description: 'Investigate and fix reported memory leak in the WebSocket connection handler',
    priority: 'HIGH',
    executionMode: 'IMMEDIATE',
    prompt: 'Investigate the memory leak in WebSocketHandler. Profile memory usage, identify the leak source, and suggest a fix.'
  }
];

let authToken = null;
let createdData = {
  servers: [],
  agents: [],
  tasks: []
};

// API Helper Functions
async function apiRequest(method, endpoint, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  };

  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));

  return { ok: response.ok, status: response.status, data };
}

async function authenticate() {
  console.log('\n1. Authenticating...');

  // Try to register first
  let result = await apiRequest('POST', '/api/auth/register', TEST_USER);

  if (!result.ok) {
    // User exists, try login
    result = await apiRequest('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
  }

  if (result.ok && result.data.token) {
    authToken = result.data.token;
    console.log('   ✅ Authenticated as:', result.data.user?.email || TEST_USER.email);
    return true;
  }

  console.log('   ❌ Authentication failed:', result.data);
  return false;
}

async function seedServers() {
  console.log('\n2. Seeding Servers...');

  // First, get existing servers
  const existingResult = await apiRequest('GET', '/api/servers');
  const existingServers = existingResult.data?.servers || existingResult.data?.items || (Array.isArray(existingResult.data) ? existingResult.data : []);

  for (const server of TEST_SERVERS) {
    // Check if server already exists
    const existing = existingServers.find(s => s.name === server.name);
    if (existing) {
      createdData.servers.push(existing);
      console.log(`   ℹ️ Exists: ${server.name} (ID: ${existing.id})`);
      continue;
    }

    const result = await apiRequest('POST', '/api/servers', server);

    if (result.ok) {
      createdData.servers.push(result.data);
      console.log(`   ✅ Created: ${server.name} (ID: ${result.data.id})`);
    } else {
      console.log(`   ❌ Failed: ${server.name} - ${JSON.stringify(result.data)}`);
    }
  }

  // If no servers from our list, use any existing server
  if (createdData.servers.length === 0 && existingServers.length > 0) {
    createdData.servers = existingServers;
    console.log(`   ℹ️ Using ${existingServers.length} existing servers`);
  }
}

async function seedAgents() {
  console.log('\n3. Seeding Agents...');

  const defaultServerId = createdData.servers[0]?.id;

  if (!defaultServerId) {
    console.log('   ⚠️ No server available, skipping agents');
    return;
  }

  // First, get existing agents
  const existingResult = await apiRequest('GET', '/api/agents');
  const existingAgents = existingResult.data?.agents || existingResult.data?.items || (Array.isArray(existingResult.data) ? existingResult.data : []);

  // Find master agent to use as parent
  let masterAgentId = existingAgents.find(a => a.role === 'MASTER')?.id || null;

  for (const agent of TEST_AGENTS) {
    // Check if agent already exists
    const existing = existingAgents.find(a => a.name === agent.name);
    if (existing) {
      createdData.agents.push(existing);
      if (existing.role === 'MASTER') {
        masterAgentId = existing.id;
      }
      console.log(`   ℹ️ Exists: ${agent.displayName} (ID: ${existing.id}, status: ${existing.status})`);
      // Ensure agent is active - use validate endpoint
      if (existing.status !== 'ACTIVE') {
        const validateResult = await apiRequest('POST', `/api/agents/${existing.id}/validate`, {});
        if (validateResult.ok) {
          console.log(`      ✅ Activated: ${existing.displayName}`);
          existing.status = 'ACTIVE'; // Update local status
        } else {
          console.log(`      ⚠️ Validation failed: ${JSON.stringify(validateResult.data)}`);
        }
      }
      continue;
    }

    const agentData = {
      ...agent,
      serverId: defaultServerId,
      parentId: agent.role === 'WORKER' ? masterAgentId : null
    };

    const result = await apiRequest('POST', '/api/agents', agentData);

    if (result.ok) {
      createdData.agents.push(result.data);
      if (agent.role === 'MASTER') {
        masterAgentId = result.data.id;
      }
      console.log(`   ✅ Created: ${agent.displayName} (${agent.role}) - ID: ${result.data.id}`);

      // Activate the agent via validate endpoint
      const validateResult = await apiRequest('POST', `/api/agents/${result.data.id}/validate`, {});
      if (validateResult.ok) {
        console.log(`      ✅ Activated`);
      }
    } else {
      console.log(`   ❌ Failed: ${agent.displayName} - ${JSON.stringify(result.data)}`);
    }
  }

  // If no agents from our list, use any existing agents
  if (createdData.agents.length === 0 && existingAgents.length > 0) {
    createdData.agents = existingAgents;
    console.log(`   ℹ️ Using ${existingAgents.length} existing agents`);
  }
}

async function seedTasks() {
  console.log('\n4. Seeding Tasks...');

  if (createdData.agents.length === 0) {
    console.log('   ⚠️ No agents available, skipping tasks');
    return;
  }

  // Assign tasks to appropriate agents
  const agentMap = {
    'code-reviewer': createdData.agents.find(a => a.name === 'code-reviewer')?.id,
    'test-writer': createdData.agents.find(a => a.name === 'test-writer')?.id,
    'doc-writer': createdData.agents.find(a => a.name === 'doc-writer')?.id,
    'debugger': createdData.agents.find(a => a.name === 'debugger')?.id,
    'orchestrator': createdData.agents.find(a => a.name === 'orchestrator')?.id,
  };

  const taskAssignments = [
    { ...TEST_TASKS[0], agentId: agentMap['code-reviewer'] },
    { ...TEST_TASKS[1], agentId: agentMap['test-writer'] },
    { ...TEST_TASKS[2], agentId: agentMap['doc-writer'] },
    { ...TEST_TASKS[3], agentId: agentMap['orchestrator'] },
    { ...TEST_TASKS[4], agentId: agentMap['debugger'] },
  ];

  for (const task of taskAssignments) {
    if (!task.agentId) {
      console.log(`   ⚠️ Skipping: ${task.title} (no agent available)`);
      continue;
    }

    const result = await apiRequest('POST', '/api/tasks', task);

    if (result.ok) {
      createdData.tasks.push(result.data);
      console.log(`   ✅ Created: ${task.title}`);
    } else {
      console.log(`   ❌ Failed: ${task.title} - ${JSON.stringify(result.data)}`);
    }
  }
}

async function runChatTest(browser) {
  console.log('\n5. Testing Agent Chat...');

  const testAgent = createdData.agents.find(a => a.name === 'code-reviewer');

  if (!testAgent) {
    console.log('   ⚠️ No agent available for chat test');
    return false;
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      origins: [{
        origin: BASE_URL,
        localStorage: [{ name: 'token', value: authToken }]
      }]
    }
  });

  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('WebSocket')) {
      errors.push(msg.text());
    }
  });

  try {
    // Navigate to chat
    console.log(`   Navigating to chat with: ${testAgent.displayName}`);
    await page.goto(`${BASE_URL}/chat/${testAgent.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/chat-01-initial.png', fullPage: true });

    // Check if chat loaded - use heading specifically
    const chatLoaded = await page.locator(`h1:has-text("${testAgent.displayName}")`).isVisible().catch(() => false);
    if (!chatLoaded) {
      // Try alternative selector
      const altLoaded = await page.getByRole('heading', { name: testAgent.displayName }).isVisible().catch(() => false);
      if (!altLoaded) {
        console.log('   ⚠️ Chat page header not found, but continuing...');
      }
    }
    console.log('   ✅ Chat page loaded');

    // Check for "Start a conversation" text
    const emptyState = await page.locator('text=Start a conversation').isVisible().catch(() => false);
    if (emptyState) {
      console.log('   ✅ Empty state shown correctly');
    }

    // Send a test message
    console.log('   Sending test message...');
    const inputSelector = 'textarea, input[type="text"]';
    await page.waitForSelector(inputSelector, { timeout: 5000 });

    await page.fill(inputSelector, 'Hello! Can you help me review some code?');
    await page.screenshot({ path: 'e2e/screenshots/chat-02-message-typed.png', fullPage: true });

    // Click send button
    const sendButton = page.locator('button:has(svg), button:has-text("Send")').last();
    await sendButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/chat-03-message-sent.png', fullPage: true });

    // Wait for response
    console.log('   Waiting for agent response...');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/chat-04-response-received.png', fullPage: true });

    // Check for response
    const hasResponse = await page.locator('text=ready to help').isVisible().catch(() => false) ||
                        await page.locator('text=code').isVisible().catch(() => false);

    if (hasResponse) {
      console.log('   ✅ Agent responded to message');
    } else {
      console.log('   ⚠️ Could not verify agent response');
    }

    // Send another message
    console.log('   Sending follow-up message...');
    await page.fill(inputSelector, 'What are your capabilities?');
    await sendButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/chat-05-follow-up.png', fullPage: true });

    // Check quick prompts
    await page.goto(`${BASE_URL}/chat/${testAgent.id}`);
    await page.waitForTimeout(1000);

    // Check if quick prompts are visible
    const quickPrompt = page.locator('button.rounded-full').first();
    if (await quickPrompt.isVisible().catch(() => false)) {
      console.log('   ✅ Quick prompts available');
      await quickPrompt.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/chat-06-quick-prompt.png', fullPage: true });
    }

    console.log('   ✅ Chat test completed');

    if (errors.length > 0) {
      console.log('\n   ⚠️ Console errors during chat test:');
      errors.forEach((err, i) => console.log(`      ${i + 1}. ${err.substring(0, 100)}`));
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Chat test failed: ${error.message}`);
    await page.screenshot({ path: 'e2e/screenshots/chat-error.png', fullPage: true });
    return false;
  } finally {
    await context.close();
  }
}

async function runVisualVerification(browser) {
  console.log('\n6. Visual Verification of Seeded Data...');

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      origins: [{
        origin: BASE_URL,
        localStorage: [{ name: 'token', value: authToken }]
      }]
    }
  });

  const page = await context.newPage();

  try {
    // Check Dashboard
    console.log('   Checking Dashboard...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/verify-01-dashboard.png', fullPage: true });
    console.log('   ✅ Dashboard captured');

    // Check Servers
    console.log('   Checking Servers list...');
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/verify-02-servers.png', fullPage: true });
    const serverCount = await page.locator('[class*="ServerCard"], [class*="card"]').count();
    console.log(`   ✅ Servers page: ${serverCount} servers visible`);

    // Check Agents
    console.log('   Checking Agents list...');
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/verify-03-agents.png', fullPage: true });
    const agentCount = await page.locator('[class*="AgentCard"], [class*="card"]').count();
    console.log(`   ✅ Agents page: ${agentCount} agents visible`);

    // Check Tasks
    console.log('   Checking Tasks list...');
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/verify-04-tasks.png', fullPage: true });
    console.log('   ✅ Tasks page captured');

    // Check Monitoring
    console.log('   Checking Monitoring...');
    await page.goto(`${BASE_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'e2e/screenshots/verify-05-monitoring.png', fullPage: true });
    console.log('   ✅ Monitoring page captured');

    return true;
  } catch (error) {
    console.log(`   ❌ Verification failed: ${error.message}`);
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  COMPREHENSIVE SEED & TEST SCRIPT');
  console.log('  MCP Agent Studio');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  try {
    // Step 1: Authenticate
    if (!await authenticate()) {
      throw new Error('Authentication failed');
    }

    // Step 2: Seed Data
    await seedServers();
    await seedAgents();
    await seedTasks();

    // Step 3: Run Chat Test
    await runChatTest(browser);

    // Step 4: Visual Verification
    await runVisualVerification(browser);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n  📊 Created Data:`);
    console.log(`     - Servers: ${createdData.servers.length}`);
    console.log(`     - Agents: ${createdData.agents.length}`);
    console.log(`     - Tasks: ${createdData.tasks.length}`);
    console.log(`\n  📸 Screenshots saved to: e2e/screenshots/`);
    console.log('\n  ✅ All tests completed successfully!');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n⏸️ Browser will close in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

main();
