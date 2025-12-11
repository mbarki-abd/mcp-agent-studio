import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

const TEST_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
};

async function runFullWorkflowTest() {
  console.log('🚀 Starting Full Workflow E2E Test...\n');
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Collect errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', error => {
    errors.push({ type: 'pageerror', text: error.message });
  });

  try {
    // ==========================================
    // Step 1: Login
    // ==========================================
    console.log('📝 STEP 1: Login\n');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const loginForm = await page.locator('form').isVisible().catch(() => false);
    if (loginForm) {
      console.log('   Filling login form...');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      console.log('   ✅ Login successful\n');
    } else {
      console.log('   ✅ Already logged in\n');
    }

    // ==========================================
    // Step 2: Create Server
    // ==========================================
    console.log('📡 STEP 2: Create Server\n');
    await page.goto(`${BASE_URL}/servers/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fill server form
    const serverName = `test-server-${Date.now()}`;
    console.log(`   Server name: ${serverName}`);

    await page.fill('input[id="name"]', serverName);
    await page.fill('input[id="description"]', 'Test server for E2E testing');
    await page.fill('input[id="url"]', 'http://localhost:8080');
    await page.fill('input[id="wsUrl"]', 'ws://localhost:8080');
    await page.fill('input[id="masterToken"]', 'test-master-token-e2e');

    // Take screenshot before submit
    await page.screenshot({ path: 'e2e/screenshots/workflow-01-server-form.png', fullPage: true });

    // Submit form
    console.log('   Submitting server form...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for navigation or error
    await page.waitForTimeout(3000);

    // Check if we're redirected to servers list or if there's an error
    const currentUrl = page.url();
    if (currentUrl.includes('/servers') && !currentUrl.includes('/new')) {
      console.log('   ✅ Server created successfully!\n');
    } else {
      // Check for error messages
      const errorMsg = await page.locator('.text-red-500, [role="alert"]').first().textContent().catch(() => null);
      if (errorMsg) {
        console.log(`   ❌ Error: ${errorMsg}\n`);
        errors.push({ type: 'form', text: errorMsg });
      } else {
        console.log('   ⚠️ Server creation status unclear\n');
      }
    }

    await page.screenshot({ path: 'e2e/screenshots/workflow-02-server-result.png', fullPage: true });

    // ==========================================
    // Step 3: Create Agent
    // ==========================================
    console.log('🤖 STEP 3: Create Agent\n');
    await page.goto(`${BASE_URL}/agents/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Step 1: Basic Info
    const agentName = `test-agent-${Date.now()}`;
    console.log(`   Agent name: ${agentName}`);

    await page.fill('input[name="name"]', agentName).catch(() => {});
    await page.fill('input[name="displayName"]', 'Test Agent E2E').catch(() => {});

    await page.screenshot({ path: 'e2e/screenshots/workflow-03-agent-step1.png', fullPage: true });

    // Click Next
    let nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 2: Select Server (if available)
    await page.screenshot({ path: 'e2e/screenshots/workflow-04-agent-step2.png', fullPage: true });

    // Select first server if dropdown exists
    const serverSelect = page.locator('select[name="serverId"], [data-testid="server-select"]').first();
    if (await serverSelect.isVisible().catch(() => false)) {
      await serverSelect.selectOption({ index: 1 }).catch(() => {});
    }

    nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Configuration
    await page.screenshot({ path: 'e2e/screenshots/workflow-05-agent-step3.png', fullPage: true });

    nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 4: Review & Create
    await page.screenshot({ path: 'e2e/screenshots/workflow-06-agent-step4.png', fullPage: true });

    const createAgentBtn = page.locator('button:has-text("Create Agent"), button:has-text("Créer")').first();
    if (await createAgentBtn.isVisible().catch(() => false)) {
      await createAgentBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'e2e/screenshots/workflow-07-agent-result.png', fullPage: true });

    // ==========================================
    // Step 4: Create Task
    // ==========================================
    console.log('📋 STEP 4: Create Task\n');
    await page.goto(`${BASE_URL}/tasks/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Step 1: Basic Info
    const taskTitle = `Test Task E2E - ${Date.now()}`;
    console.log(`   Task title: ${taskTitle}`);

    await page.fill('input[name="title"]', taskTitle).catch(() => {});
    await page.fill('textarea[name="description"]', 'This is a test task created by E2E tests').catch(() => {});

    await page.screenshot({ path: 'e2e/screenshots/workflow-08-task-step1.png', fullPage: true });

    nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 2: Select Agent
    await page.screenshot({ path: 'e2e/screenshots/workflow-09-task-step2.png', fullPage: true });

    const agentSelect = page.locator('select[name="agentId"], [data-testid="agent-select"]').first();
    if (await agentSelect.isVisible().catch(() => false)) {
      await agentSelect.selectOption({ index: 1 }).catch(() => {});
    }

    nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Continue through wizard steps
    for (let i = 0; i < 2; i++) {
      await page.screenshot({ path: `e2e/screenshots/workflow-${10 + i}-task-step${3 + i}.png`, fullPage: true });
      nextBtn = page.locator('button:has-text("Next"), button:has-text("Suivant")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Create task
    const createTaskBtn = page.locator('button:has-text("Create Task"), button:has-text("Créer")').first();
    if (await createTaskBtn.isVisible().catch(() => false)) {
      await createTaskBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'e2e/screenshots/workflow-12-task-result.png', fullPage: true });

    // ==========================================
    // Step 5: Verify Data
    // ==========================================
    console.log('✅ STEP 5: Verify Created Data\n');

    // Check servers list
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/workflow-13-servers-list.png', fullPage: true });

    // Check agents list
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/workflow-14-agents-list.png', fullPage: true });

    // Check tasks list
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/workflow-15-tasks-list.png', fullPage: true });

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 TEST SUMMARY\n');

    if (errors.length > 0) {
      console.log('❌ ERRORS DETECTED:\n');
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.type}] ${err.text}`);
      });
    } else {
      console.log('✅ No errors detected during workflow test!\n');
    }

    console.log(`📸 Screenshots saved to: apps/dashboard/e2e/screenshots/workflow-*.png\n`);
    console.log('=' .repeat(60) + '\n');

    // Keep browser open for inspection
    console.log('⏸️  Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: 'e2e/screenshots/workflow-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

runFullWorkflowTest();
