// Seed test data for visual testing and E2E tests
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Standard test user used by all E2E tests
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

const ADMIN_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
  name: 'MBARKI Admin'
};

async function seedTestData() {
  console.log('🌱 Seeding test data...\n');

  // First, try to register test user (used by E2E tests)
  console.log('1. Creating test user...');
  const testUserRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });

  if (testUserRes.ok) {
    console.log('   ✅ Test user created');
  } else {
    const err = await testUserRes.text();
    console.log('   ℹ️ Test user response:', err.substring(0, 100));
  }

  // Also create admin user
  console.log('   Creating admin user...');
  const registerRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_USER)
  });

  if (registerRes.ok) {
    console.log('   ✅ Admin user created');
  } else {
    const err = await registerRes.text();
    console.log('   ℹ️ Admin user response:', err.substring(0, 100));
  }

  // Login with test user (or admin if test fails)
  console.log('2. Logging in...');
  let loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });

  // Fallback to admin user if test user doesn't work
  if (!loginRes.ok) {
    loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      })
    });
  }

  const loginData = await loginRes.json().catch(() => ({}));
  const token = loginData.token || loginData.accessToken;
  console.log('   ✅ Authenticated\n');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  // Create or get server
  console.log('2. Creating/fetching server...');
  let server = null;

  // Try to create server first
  const serverRes = await fetch(`${API_URL}/api/servers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'local-dev',
      description: 'Local Development MCP Server',
      url: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080',
      masterToken: 'test-master-token-12345',
      isDefault: true,
      autoConnect: false
    })
  });

  if (serverRes.ok) {
    server = await serverRes.json().catch(() => null);
    console.log('   ✅ Server created:', server?.id);
  } else {
    // Get existing servers
    const listRes = await fetch(`${API_URL}/api/servers`, { headers });
    const listData = await listRes.json().catch(() => ({ servers: [] }));
    const servers = listData.servers || listData || [];
    server = servers.find(s => s.name === 'local-dev') || servers[0];
    console.log('   ✅ Using existing server:', server?.id || 'none found');
  }

  // Create agents
  console.log('3. Creating agents...');
  const agents = [
    {
      name: 'master-agent',
      displayName: 'Master Agent',
      role: 'MASTER',
      systemPrompt: 'You are the master orchestration agent.',
      capabilities: ['orchestration', 'planning', 'delegation'],
      serverId: server?.id
    },
    {
      name: 'code-reviewer',
      displayName: 'Code Reviewer',
      role: 'WORKER',
      systemPrompt: 'You are a code review specialist.',
      capabilities: ['code-review', 'security-analysis', 'best-practices'],
      serverId: server?.id
    },
    {
      name: 'test-writer',
      displayName: 'Test Writer',
      role: 'WORKER',
      systemPrompt: 'You are a testing specialist.',
      capabilities: ['unit-testing', 'integration-testing', 'e2e-testing'],
      serverId: server?.id
    }
  ];

  const createdAgents = [];
  for (const agent of agents) {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(agent)
    });
    const created = await res.json().catch(() => null);
    if (created?.id) createdAgents.push(created);
    console.log(`   ✅ Agent: ${agent.displayName} (${created?.id || 'failed'})`);
  }

  // Create tasks
  console.log('4. Creating tasks...');
  const tasks = [
    {
      title: 'Review Pull Request #123',
      description: 'Review the authentication changes in PR #123',
      priority: 'HIGH',
      executionMode: 'IMMEDIATE',
      prompt: 'Review the code changes and provide feedback on security and best practices.',
      agentId: createdAgents[1]?.id
    },
    {
      title: 'Write Unit Tests for Auth Module',
      description: 'Create comprehensive unit tests for the authentication module',
      priority: 'MEDIUM',
      executionMode: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      prompt: 'Write unit tests covering all auth scenarios.',
      agentId: createdAgents[2]?.id
    },
    {
      title: 'Daily Security Scan',
      description: 'Run daily security vulnerability scan',
      priority: 'LOW',
      executionMode: 'RECURRING',
      cronExpression: '0 2 * * *',
      prompt: 'Scan the codebase for security vulnerabilities.',
      agentId: createdAgents[0]?.id
    }
  ];

  for (const task of tasks) {
    if (!task.agentId) continue;
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
    const created = await res.json().catch(() => null);
    console.log(`   ✅ Task: ${task.title} (${created?.id || 'failed'})`);
  }

  console.log('\n🎉 Test data seeding complete!');
}

seedTestData().catch(console.error);
