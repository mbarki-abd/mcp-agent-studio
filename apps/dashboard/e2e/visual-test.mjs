import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
};

async function runVisualTests() {
  console.log('🚀 Starting Full Visual Tests...\n');
  console.log('=' .repeat(50) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  let authToken = null;
  let testData = { agents: [], tasks: [], servers: [] };

  // Collect console errors
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location(),
      });
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push({
      text: error.message,
      stack: error.stack,
    });
  });

  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });

  try {
    // ==========================================
    // Step 1: Login
    // ==========================================
    console.log('📝 PHASE 1: Authentication\n');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const loginForm = await page.locator('form').isVisible().catch(() => false);
    if (loginForm) {
      console.log('   Filling login form...');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

      // Capture token from response
      const responsePromise = page.waitForResponse(resp => resp.url().includes('/auth') || resp.url().includes('/login'));
      await page.click('button[type="submit"]');

      try {
        const response = await responsePromise;
        const data = await response.json().catch(() => ({}));
        authToken = data.token || data.accessToken;
      } catch (e) {}

      await page.waitForTimeout(2000);
    }
    console.log('   ✅ Login complete\n');

    // ==========================================
    // Step 2: Fetch test data from API
    // ==========================================
    console.log('📊 PHASE 2: Fetching test data...\n');

    // Get token from localStorage (set by AuthProvider after login)
    const storedToken = await page.evaluate(() => localStorage.getItem('token'));
    if (storedToken) {
      authToken = storedToken;
      console.log('   ✅ Auth token found in localStorage');
    }

    // Get agents
    try {
      const agentsResp = await page.evaluate(async ({ url, token }) => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${url}/api/agents`, { headers });
        return res.ok ? res.json() : [];
      }, { url: API_URL, token: authToken });
      testData.agents = Array.isArray(agentsResp) ? agentsResp : (agentsResp.data || []);
      console.log(`   Found ${testData.agents.length} agents`);
    } catch (e) {
      console.log('   ⚠️ Could not fetch agents');
    }

    // Get tasks
    try {
      const tasksResp = await page.evaluate(async ({ url, token }) => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${url}/api/tasks`, { headers });
        return res.ok ? res.json() : [];
      }, { url: API_URL, token: authToken });
      testData.tasks = Array.isArray(tasksResp) ? tasksResp : (tasksResp.data || []);
      console.log(`   Found ${testData.tasks.length} tasks`);
    } catch (e) {
      console.log('   ⚠️ Could not fetch tasks');
    }

    // Get servers
    try {
      const serversResp = await page.evaluate(async ({ url, token }) => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${url}/api/servers`, { headers });
        return res.ok ? res.json() : [];
      }, { url: API_URL, token: authToken });
      testData.servers = Array.isArray(serversResp) ? serversResp : (serversResp.data || []);
      console.log(`   Found ${testData.servers.length} servers`);
    } catch (e) {
      console.log('   ⚠️ Could not fetch servers');
    }

    console.log('');

    // ==========================================
    // Step 3: Test all routes
    // ==========================================
    console.log('🧪 PHASE 3: Visual Testing All Pages\n');
    console.log('-'.repeat(50) + '\n');

    const routes = [
      // Main pages
      { path: '/', name: 'Dashboard', category: 'Main' },

      // Agents module
      { path: '/agents', name: 'Agents List', category: 'Agents' },
      { path: '/agents/new', name: 'Create Agent - Step 1', category: 'Agents' },

      // Tasks module
      { path: '/tasks', name: 'Tasks List', category: 'Tasks' },
      { path: '/tasks/new', name: 'Create Task - Step 1', category: 'Tasks' },

      // Monitoring module
      { path: '/monitoring', name: 'Control Center', category: 'Monitoring' },

      // Tools module
      { path: '/tools', name: 'Tools Catalog', category: 'Tools' },

      // Servers module
      { path: '/servers', name: 'Servers List', category: 'Servers' },
    ];

    // Add dynamic routes based on fetched data
    if (testData.agents.length > 0) {
      const agent = testData.agents[0];
      routes.push(
        { path: `/agents/${agent.id}`, name: 'Agent Detail', category: 'Agents' },
        { path: `/chat/${agent.id}`, name: 'Agent Chat', category: 'Chat' },
        { path: `/tools/agent/${agent.id}/permissions`, name: 'Agent Permissions', category: 'Tools' },
      );
    }

    if (testData.tasks.length > 0) {
      const task = testData.tasks[0];
      routes.push(
        { path: `/tasks/${task.id}`, name: 'Task Detail', category: 'Tasks' },
      );
    }

    if (testData.servers.length > 0) {
      const server = testData.servers[0];
      routes.push(
        { path: `/servers/${server.id}`, name: 'Server Detail', category: 'Servers' },
        { path: `/tools/server/${server.id}`, name: 'Server Tools', category: 'Tools' },
      );
    }

    let currentCategory = '';
    let stepNum = 1;

    for (const route of routes) {
      // Print category header
      if (route.category !== currentCategory) {
        currentCategory = route.category;
        console.log(`\n📁 ${currentCategory.toUpperCase()}\n`);
      }

      console.log(`   ${stepNum}. ${route.name} (${route.path})`);

      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take screenshot
      const screenshotName = `${String(stepNum).padStart(2, '0')}-${route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      await page.screenshot({
        path: `e2e/screenshots/${screenshotName}`,
        fullPage: true
      });
      console.log(`      ✅ ${screenshotName}`);

      stepNum++;
    }

    // ==========================================
    // Step 4: Test wizard navigation
    // ==========================================
    console.log('\n\n📋 PHASE 4: Testing Wizard Steps\n');
    console.log('-'.repeat(50) + '\n');

    // Test Create Agent Wizard Steps
    console.log('   Testing Create Agent Wizard...\n');
    await page.goto(`${BASE_URL}/agents/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (let step = 1; step <= 4; step++) {
      await page.screenshot({
        path: `e2e/screenshots/wizard-agent-step-${step}.png`,
        fullPage: true
      });
      console.log(`      ✅ Agent Wizard Step ${step}`);

      // Try to click next button
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        // Fill required fields for step 1
        if (step === 1) {
          await page.fill('input[name="name"]', 'test-agent').catch(() => {});
          await page.fill('input[name="displayName"]', 'Test Agent').catch(() => {});
        }
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // Test Create Task Wizard Steps
    console.log('\n   Testing Create Task Wizard...\n');
    await page.goto(`${BASE_URL}/tasks/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (let step = 1; step <= 4; step++) {
      await page.screenshot({
        path: `e2e/screenshots/wizard-task-step-${step}.png`,
        fullPage: true
      });
      console.log(`      ✅ Task Wizard Step ${step}`);

      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        if (step === 1) {
          await page.fill('input[name="title"]', 'Test Task').catch(() => {});
        }
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 ALL VISUAL TESTS COMPLETED!\n');
    console.log(`📸 Total screenshots: ${stepNum + 7}`);
    console.log(`📁 Location: apps/dashboard/e2e/screenshots/\n`);

    // Report errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  CONSOLE ERRORS DETECTED:\n');
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.text}`);
        if (err.location) {
          console.log(`      at ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    }

    if (networkErrors.length > 0) {
      console.log('\n⚠️  NETWORK ERRORS DETECTED:\n');
      networkErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.url}`);
        console.log(`      ${err.failure}`);
      });
    }

    if (consoleErrors.length === 0 && networkErrors.length === 0) {
      console.log('✅ No console or network errors detected!\n');
    }

    console.log('='.repeat(50) + '\n');

    // Final pause
    console.log('⏸️  Browser will close in 3 seconds...');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

runVisualTests();
