import { test, expect, Page } from '@playwright/test';

// Use environment variable or default to production
const BASE_URL = process.env.TEST_URL || 'https://mcp.ilinqsoft.com';
const API_URL = BASE_URL.includes('localhost')
  ? 'http://localhost:3000'
  : BASE_URL.replace('mcp.', 'api.mcp.');

const TEST_USER = { email: 'test@example.com', password: 'password123' };
const ADMIN_USER = { email: 'admin@example.com', password: 'password123' };

async function loginAs(page: Page, user: { email: string; password: string }) {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: user,
  });
  const data = await response.json();
  if (!response.ok()) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  await page.goto(BASE_URL);
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, data.accessToken);
  return data;
}

test.describe('Human-like Recursive Scenarios', () => {
  test.describe.configure({ mode: 'serial' });

  // Store token to reuse between tests
  let adminToken: string | null = null;
  let userToken: string | null = null;

  // Login with token caching
  async function loginWithCache(page: Page, user: { email: string; password: string }, isAdmin = false) {
    const cachedToken = isAdmin ? adminToken : userToken;

    if (cachedToken) {
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        localStorage.setItem('auth_token', token);
      }, cachedToken);
      return;
    }

    const response = await page.request.post(`${API_URL}/api/auth/login`, {
      data: user,
    });
    const data = await response.json();
    if (!response.ok()) throw new Error(`Login failed: ${JSON.stringify(data)}`);

    if (isAdmin) adminToken = data.accessToken;
    else userToken = data.accessToken;

    await page.goto(BASE_URL);
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, data.accessToken);
  }

  // Scenario 1: New User Registration Journey
  test('Scenario 1: New user registration journey', async ({ page }) => {
    test.setTimeout(120000);
    const timestamp = Date.now();
    const testEmail = `newuser_${timestamp}@test.com`;

    // Step 1: Visit homepage
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/human-01-homepage.png', fullPage: true });

    // Step 2: Go to registration
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/human-02-register-page.png', fullPage: true });

    // Step 3: Fill registration form
    const nameInput = page.locator('#name, input[name="name"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Jean Dupont');
      await page.waitForTimeout(300);
    }

    const emailInput = page.locator('#email, input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill(testEmail);
      await page.waitForTimeout(300);
    }

    const passwordInput = page.locator('#password, input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('SecurePass123!');
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: 'e2e/screenshots/human-03-form-filled.png', fullPage: true });

    // Step 4: Submit registration
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'e2e/screenshots/human-04-after-register.png', fullPage: true });
  });

  // Scenario 2: Admin Full Dashboard Exploration
  test('Scenario 2: Admin explores all features recursively', async ({ page }) => {
    test.setTimeout(180000);
    await loginWithCache(page, ADMIN_USER, true);

    // Recursive exploration of all sections
    const sections = [
      { name: 'Dashboard', path: '/', screenshot: 'human-10-dashboard' },
      { name: 'Servers', path: '/servers', screenshot: 'human-11-servers' },
      { name: 'Agents', path: '/agents', screenshot: 'human-12-agents' },
      { name: 'Tasks', path: '/tasks', screenshot: 'human-13-tasks' },
      { name: 'Tools', path: '/tools', screenshot: 'human-14-tools' },
      { name: 'Monitoring', path: '/monitoring', screenshot: 'human-15-monitoring' },
      { name: 'Chat', path: '/chat', screenshot: 'human-16-chat' },
      { name: 'Audit Logs', path: '/audit', screenshot: 'human-17-audit' },
      { name: 'Analytics', path: '/analytics', screenshot: 'human-18-analytics' },
      { name: 'Organization', path: '/organization', screenshot: 'human-19-org' },
      { name: 'API Keys', path: '/settings/api-keys', screenshot: 'human-20-apikeys' },
      { name: 'Settings', path: '/settings', screenshot: 'human-21-settings' },
    ];

    for (const section of sections) {
      await page.goto(`${BASE_URL}${section.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await page.screenshot({ path: `e2e/screenshots/${section.screenshot}.png`, fullPage: true });

      // Verify page loaded correctly
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    }
  });

  // Scenario 3: Server Management Flow
  test('Scenario 3: Create and manage MCP server', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to servers
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-30-servers-list.png', fullPage: true });

    // Try to add a new server
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/human-31-add-server-modal.png', fullPage: true });

      // Fill server form if visible
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test MCP Server');
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'e2e/screenshots/human-32-server-form-filled.png', fullPage: true });
      }

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  // Scenario 4: Agent Hierarchy Exploration
  test('Scenario 4: Explore agent hierarchy and details', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to agents
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-40-agents-list.png', fullPage: true });

    // Try to create new agent
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/human-41-create-agent-modal.png', fullPage: true });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  // Scenario 5: Task Management Flow
  test('Scenario 5: Task creation and monitoring', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to tasks
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-50-tasks-list.png', fullPage: true });

    // Try different task views/filters
    const filterButtons = page.locator('button[role="tab"], .filter-btn, [data-filter]');
    const filterCount = await filterButtons.count();

    for (let i = 0; i < Math.min(filterCount, 4); i++) {
      await filterButtons.nth(i).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `e2e/screenshots/human-51-tasks-filter-${i}.png`, fullPage: true });
    }
  });

  // Scenario 6: Real-time Monitoring
  test('Scenario 6: Real-time monitoring dashboard', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to monitoring
    await page.goto(`${BASE_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/human-60-monitoring-initial.png', fullPage: true });

    // Scroll through monitoring page
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-61-monitoring-scroll1.png', fullPage: true });

    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-62-monitoring-scroll2.png', fullPage: true });
  });

  // Scenario 7: Audit and Analytics Review
  test('Scenario 7: Review audit logs and analytics', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Check audit logs
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/human-70-audit-logs.png', fullPage: true });

    // Scroll through logs
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-71-audit-scroll.png', fullPage: true });

    // Check analytics
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/human-72-analytics.png', fullPage: true });
  });

  // Scenario 8: Settings and Profile Management
  test('Scenario 8: User settings and profile', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-80-settings.png', fullPage: true });

    // Check different setting tabs if available
    const tabs = page.locator('[role="tab"], .tab-button, button[data-tab]');
    const tabCount = await tabs.count();

    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `e2e/screenshots/human-81-settings-tab-${i}.png`, fullPage: true });
    }
  });

  // Scenario 9: Chat Interface Interaction
  test('Scenario 9: Chat with agents', async ({ page }) => {
    test.setTimeout(120000);
    await loginWithCache(page, ADMIN_USER, true);

    // Navigate to chat
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/human-90-chat-initial.png', fullPage: true });

    // Try to type in chat
    const chatInput = page.locator('input[type="text"], textarea').first();
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('Hello, this is a test message');
      await page.screenshot({ path: 'e2e/screenshots/human-91-chat-typing.png', fullPage: true });
      await chatInput.clear();
    }
  });

  // Scenario 10: Complete Workflow - Server to Agent to Task
  test('Scenario 10: Complete workflow integration', async ({ page }) => {
    test.setTimeout(180000);
    await loginWithCache(page, ADMIN_USER, true);

    // Step 1: Check servers
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-100-workflow-servers.png', fullPage: true });

    // Step 2: Check agents associated
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-101-workflow-agents.png', fullPage: true });

    // Step 3: Check tasks for agents
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-102-workflow-tasks.png', fullPage: true });

    // Step 4: Check monitoring for real-time status
    await page.goto(`${BASE_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/human-103-workflow-monitoring.png', fullPage: true });

    // Step 5: Final analytics check
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/human-104-workflow-analytics.png', fullPage: true });

    // Final verification - back to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/human-105-workflow-complete.png', fullPage: true });
  });
});
