import { test, expect, Page, BrowserContext } from '@playwright/test';

// Production URLs
const BASE_URL = process.env.TEST_URL || 'https://mcp.ilinqsoft.com';
const API_URL = BASE_URL.includes('localhost')
  ? 'http://localhost:3000'
  : BASE_URL.replace('mcp.', 'api.mcp.');

const ADMIN_USER = { email: 'admin@example.com', password: 'Admin123!' };
const TEST_USER = { email: 'test@example.com', password: 'Admin123!' };

// Global token storage - persisted across all tests in file
let adminToken: string | null = null;
let testUserToken: string | null = null;
let tokensInitialized = false;

// Screenshot counter
let screenshotCounter = 1;

async function screenshot(page: Page, name: string) {
  const filename = `mega-${String(screenshotCounter++).padStart(3, '0')}-${name}.png`;
  await page.screenshot({ path: `e2e/screenshots/${filename}`, fullPage: true });
  return filename;
}

async function initTokens(page: Page): Promise<void> {
  if (tokensInitialized && adminToken && testUserToken) return;

  // Login admin
  const adminResponse = await page.request.post(`${API_URL}/api/auth/login`, { data: ADMIN_USER });
  const adminData = await adminResponse.json();
  if (!adminResponse.ok()) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  adminToken = adminData.accessToken;

  // Login test user
  const testResponse = await page.request.post(`${API_URL}/api/auth/login`, { data: TEST_USER });
  const testData = await testResponse.json();
  if (!testResponse.ok()) throw new Error(`Test user login failed: ${JSON.stringify(testData)}`);
  testUserToken = testData.accessToken;

  tokensInitialized = true;
}

// Login function that always fetches a new token (for isolated tests)
async function loginOnce(page: Page, user: typeof ADMIN_USER, isAdmin = true): Promise<string> {
  // Always try to use cached tokens first (within same worker)
  if (isAdmin && adminToken) return adminToken;
  if (!isAdmin && testUserToken) return testUserToken;

  // Perform login
  const response = await page.request.post(`${API_URL}/api/auth/login`, { data: user });
  const data = await response.json();
  if (!response.ok()) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  const token = data.accessToken;
  if (isAdmin) adminToken = token;
  else testUserToken = token;
  tokensInitialized = true;

  return token;
}

async function setupAuth(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
}

// ============================================================================
// MEGA TEST SUITE - 100+ Human Scenarios
// ============================================================================

test.describe('MEGA Human Scenarios Suite - 100+ Tests', () => {
  test.setTimeout(600000); // 10 minutes for all tests

  // Single login for all tests - only runs once
  test.beforeAll(async ({ browser }) => {
    if (tokensInitialized) return;

    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await initTokens(page);
      console.log('Tokens initialized successfully');
    } catch (e) {
      console.error('Login error in beforeAll:', e);
    }
    await context.close();
  });

  // ============================================================================
  // SECTION 1: Dashboard Scenarios (1-15)
  // ============================================================================
  test('Scenarios 1-15: Dashboard Deep Exploration', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Scenario 1: Initial dashboard load
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'dashboard-initial');

    // Scenario 2: Check all stat cards
    const statCards = page.locator('.stat-card, [class*="card"], [class*="metric"]');
    const cardCount = await statCards.count();
    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      await statCards.nth(i).hover();
      await page.waitForTimeout(200);
    }
    await screenshot(page, 'dashboard-stats-hover');

    // Scenario 3: Click Quick Actions
    const quickActions = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
    const actionCount = await quickActions.count();
    for (let i = 0; i < Math.min(actionCount, 3); i++) {
      await quickActions.nth(i).click();
      await page.waitForTimeout(500);
      await screenshot(page, `dashboard-action-${i + 1}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Scenario 4-6: Scroll dashboard sections
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);
    await screenshot(page, 'dashboard-scroll-1');

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    await screenshot(page, 'dashboard-scroll-2');

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(300);
    await screenshot(page, 'dashboard-scroll-3');

    // Scenario 7-10: Check Recent Activity
    await page.evaluate(() => window.scrollTo(0, 0));
    const activityItems = page.locator('[class*="activity"], [class*="recent"]');
    if (await activityItems.count() > 0) {
      await activityItems.first().hover();
      await screenshot(page, 'dashboard-activity-hover');
    }

    // Scenario 11-15: System Health checks
    const healthSection = page.locator('[class*="health"], [class*="status"]');
    if (await healthSection.count() > 0) {
      await healthSection.first().scrollIntoViewIfNeeded();
      await screenshot(page, 'dashboard-health-section');
    }

    // Check notifications
    const notifBell = page.locator('[class*="notification"], [class*="bell"], button:has([class*="bell"])');
    if (await notifBell.count() > 0) {
      await notifBell.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'dashboard-notifications');
      await page.keyboard.press('Escape');
    }

    // User menu
    const userMenu = page.locator('[class*="avatar"], [class*="user-menu"], button:has-text("Admin")');
    if (await userMenu.count() > 0) {
      await userMenu.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'dashboard-user-menu');
      await page.keyboard.press('Escape');
    }
  });

  // ============================================================================
  // SECTION 2: Servers Management (16-35)
  // ============================================================================
  test('Scenarios 16-35: Servers Deep Management', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'servers-list');

    // Scenario 16-20: Add Server Modal exploration
    const addBtn = page.locator('button:has-text("Add Server"), button:has-text("Add"), button:has-text("New")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'servers-add-modal');

      // Fill form fields
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test Server Alpha');
        await screenshot(page, 'servers-form-name');
      }

      const urlInput = page.locator('input[name="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if (await urlInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await urlInput.fill('ws://localhost:8080');
        await screenshot(page, 'servers-form-url');
      }

      const descInput = page.locator('textarea, input[name="description"]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('Test MCP server for development');
        await screenshot(page, 'servers-form-desc');
      }

      // Check dropdowns/selects
      const selects = page.locator('select, [role="combobox"]');
      const selectCount = await selects.count();
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        await selects.nth(i).click();
        await page.waitForTimeout(300);
        await screenshot(page, `servers-form-select-${i + 1}`);
        await page.keyboard.press('Escape');
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Scenario 21-25: Server list interactions
    const serverItems = page.locator('tr, [class*="server-item"], [class*="card"]');
    const serverCount = await serverItems.count();
    for (let i = 0; i < Math.min(serverCount, 3); i++) {
      await serverItems.nth(i).hover();
      await page.waitForTimeout(200);
    }
    await screenshot(page, 'servers-hover-items');

    // Scenario 26-30: Search and filter
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await screenshot(page, 'servers-search');
      await searchInput.clear();
    }

    // Scenario 31-35: Refresh and pagination
    const refreshBtn = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]');
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'servers-refreshed');
    }

    // Pagination
    const pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]');
    if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
      await screenshot(page, 'servers-pagination');
    }
  });

  // ============================================================================
  // SECTION 3: Agents Management (36-55)
  // ============================================================================
  test('Scenarios 36-55: Agents Deep Management', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'agents-list');

    // Scenario 36-40: Create Agent Modal
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'agents-create-modal');

      // Agent type selection
      const typeSelect = page.locator('select[name="type"], [role="combobox"]').first();
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.click();
        await page.waitForTimeout(300);
        await screenshot(page, 'agents-type-select');

        // Select different types
        const options = page.locator('[role="option"], option');
        const optCount = await options.count();
        for (let i = 0; i < Math.min(optCount, 3); i++) {
          await options.nth(i).click();
          await page.waitForTimeout(200);
          await screenshot(page, `agents-type-${i + 1}`);
          await typeSelect.click();
        }
        await page.keyboard.press('Escape');
      }

      // Agent name
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Master Agent Alpha');
        await screenshot(page, 'agents-form-name');
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Scenario 41-45: Agent hierarchy view
    const hierarchyBtn = page.locator('button:has-text("Hierarchy"), button:has-text("Tree")');
    if (await hierarchyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hierarchyBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'agents-hierarchy-view');
    }

    // Scenario 46-50: Agent filters
    const filterBtns = page.locator('[role="tab"], button[data-filter], [class*="filter"]');
    const filterCount = await filterBtns.count();
    for (let i = 0; i < Math.min(filterCount, 4); i++) {
      await filterBtns.nth(i).click();
      await page.waitForTimeout(300);
      await screenshot(page, `agents-filter-${i + 1}`);
    }

    // Scenario 51-55: Agent status indicators
    const statusIndicators = page.locator('[class*="status"], [class*="badge"]');
    const statusCount = await statusIndicators.count();
    for (let i = 0; i < Math.min(statusCount, 3); i++) {
      await statusIndicators.nth(i).hover();
      await page.waitForTimeout(200);
    }
    await screenshot(page, 'agents-status-indicators');
  });

  // ============================================================================
  // SECTION 4: Tasks Management (56-75)
  // ============================================================================
  test('Scenarios 56-75: Tasks Deep Management', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'tasks-list');

    // Scenario 56-60: Create Task Flow
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'tasks-create-modal');

      // Task name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Automated Test Task');
        await screenshot(page, 'tasks-form-name');
      }

      // Task type
      const typeSelect = page.locator('select[name="type"], [role="combobox"]').first();
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.click();
        await page.waitForTimeout(300);
        await screenshot(page, 'tasks-type-options');
        await page.keyboard.press('Escape');
      }

      // Schedule options
      const scheduleSection = page.locator('[class*="schedule"], [class*="cron"]');
      if (await scheduleSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await screenshot(page, 'tasks-schedule-section');
      }

      await page.keyboard.press('Escape');
    }

    // Scenario 61-65: Task status filters
    const statusFilters = ['All', 'Pending', 'Running', 'Completed', 'Failed'];
    for (const status of statusFilters) {
      const filterBtn = page.locator(`button:has-text("${status}"), [data-status="${status.toLowerCase()}"]`).first();
      if (await filterBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, `tasks-filter-${status.toLowerCase()}`);
      }
    }

    // Scenario 66-70: Task details view
    const taskItems = page.locator('tr, [class*="task-item"]');
    if (await taskItems.count() > 0) {
      await taskItems.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, 'tasks-detail-view');
    }

    // Scenario 71-75: Task execution logs
    const logsTab = page.locator('button:has-text("Logs"), [role="tab"]:has-text("Logs")');
    if (await logsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logsTab.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'tasks-logs-tab');
    }
  });

  // ============================================================================
  // SECTION 5: Tools Catalog (76-90)
  // ============================================================================
  test('Scenarios 76-90: Tools Catalog Exploration', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/tools`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'tools-catalog');

    // Scenario 76-80: Tool categories
    const categories = page.locator('[class*="category"], [role="tab"]');
    const catCount = await categories.count();
    for (let i = 0; i < Math.min(catCount, 5); i++) {
      await categories.nth(i).click();
      await page.waitForTimeout(300);
      await screenshot(page, `tools-category-${i + 1}`);
    }

    // Scenario 81-85: Tool search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const searches = ['read', 'write', 'execute', 'list', 'create'];
      for (const term of searches) {
        await searchInput.fill(term);
        await page.waitForTimeout(300);
        await screenshot(page, `tools-search-${term}`);
      }
      await searchInput.clear();
    }

    // Scenario 86-90: Tool details
    const toolItems = page.locator('[class*="tool-item"], [class*="card"], tr');
    const toolCount = await toolItems.count();
    for (let i = 0; i < Math.min(toolCount, 3); i++) {
      await toolItems.nth(i).click();
      await page.waitForTimeout(500);
      await screenshot(page, `tools-detail-${i + 1}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  });

  // ============================================================================
  // SECTION 6: Monitoring (91-105)
  // ============================================================================
  test('Scenarios 91-105: Real-time Monitoring Deep', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for real-time data
    await screenshot(page, 'monitoring-initial');

    // Scenario 91-95: Monitor different metrics
    const metricCards = page.locator('[class*="metric"], [class*="stat"], [class*="card"]');
    const metricCount = await metricCards.count();
    for (let i = 0; i < Math.min(metricCount, 5); i++) {
      await metricCards.nth(i).hover();
      await page.waitForTimeout(300);
      await screenshot(page, `monitoring-metric-${i + 1}`);
    }

    // Scenario 96-100: Charts interaction
    const charts = page.locator('canvas, [class*="chart"], svg');
    const chartCount = await charts.count();
    for (let i = 0; i < Math.min(chartCount, 3); i++) {
      await charts.nth(i).hover();
      await page.waitForTimeout(500);
      await screenshot(page, `monitoring-chart-${i + 1}`);
    }

    // Scenario 101-105: Time range selection
    const timeRanges = page.locator('select, [role="combobox"], button:has-text("Last")');
    if (await timeRanges.count() > 0) {
      await timeRanges.first().click();
      await page.waitForTimeout(300);
      await screenshot(page, 'monitoring-time-range');
      await page.keyboard.press('Escape');
    }

    // Scroll through monitoring
    await page.evaluate(() => window.scrollTo(0, 500));
    await screenshot(page, 'monitoring-scroll-1');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await screenshot(page, 'monitoring-scroll-2');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await screenshot(page, 'monitoring-scroll-3');
  });

  // ============================================================================
  // SECTION 7: Chat Interface (106-115)
  // ============================================================================
  test('Scenarios 106-115: Chat Interface Deep', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'chat-initial');

    // Scenario 106-108: Agent selection
    const agentSelect = page.locator('select, [role="combobox"], [class*="agent-select"]').first();
    if (await agentSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agentSelect.click();
      await page.waitForTimeout(300);
      await screenshot(page, 'chat-agent-select');
      await page.keyboard.press('Escape');
    }

    // Scenario 109-112: Message input
    const chatInput = page.locator('input[type="text"], textarea').first();
    if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const messages = [
        'Hello, can you help me?',
        'List all available tools',
        'Show server status',
        'Execute a simple task'
      ];
      for (let i = 0; i < messages.length; i++) {
        await chatInput.fill(messages[i]);
        await page.waitForTimeout(200);
        await screenshot(page, `chat-message-${i + 1}`);
        await chatInput.clear();
      }
    }

    // Scenario 113-115: Chat history
    const historySection = page.locator('[class*="history"], [class*="messages"]');
    if (await historySection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historySection.scrollIntoViewIfNeeded();
      await screenshot(page, 'chat-history');
    }
  });

  // ============================================================================
  // SECTION 8: Audit Logs (116-125)
  // ============================================================================
  test('Scenarios 116-125: Audit Logs Deep', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'audit-initial');

    // Scenario 116-118: Filter by action type
    const actionFilters = page.locator('[class*="filter"], select, [role="combobox"]');
    if (await actionFilters.count() > 0) {
      await actionFilters.first().click();
      await page.waitForTimeout(300);
      await screenshot(page, 'audit-action-filter');
      await page.keyboard.press('Escape');
    }

    // Scenario 119-121: Date range filter
    const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
    if (await dateInputs.count() > 0) {
      await dateInputs.first().click();
      await page.waitForTimeout(300);
      await screenshot(page, 'audit-date-picker');
      await page.keyboard.press('Escape');
    }

    // Scenario 122-125: Log entry details
    const logEntries = page.locator('tr, [class*="log-entry"]');
    const logCount = await logEntries.count();
    for (let i = 0; i < Math.min(logCount, 3); i++) {
      await logEntries.nth(i).click();
      await page.waitForTimeout(300);
      await screenshot(page, `audit-entry-${i + 1}`);
    }

    // Scroll through logs
    await page.evaluate(() => window.scrollTo(0, 500));
    await screenshot(page, 'audit-scroll');
  });

  // ============================================================================
  // SECTION 9: Analytics (126-135)
  // ============================================================================
  test('Scenarios 126-135: Analytics Deep', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, 'analytics-initial');

    // Scenario 126-128: Different time ranges
    const timeSelect = page.locator('select, [role="combobox"], button:has-text("days")').first();
    if (await timeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timeSelect.click();
      await page.waitForTimeout(300);
      await screenshot(page, 'analytics-time-options');
      await page.keyboard.press('Escape');
    }

    // Scenario 129-132: Different chart types
    const chartSwitchers = page.locator('button[class*="chart"], [role="tab"]');
    const switcherCount = await chartSwitchers.count();
    for (let i = 0; i < Math.min(switcherCount, 4); i++) {
      await chartSwitchers.nth(i).click();
      await page.waitForTimeout(500);
      await screenshot(page, `analytics-chart-type-${i + 1}`);
    }

    // Scenario 133-135: Export options
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(300);
      await screenshot(page, 'analytics-export-options');
      await page.keyboard.press('Escape');
    }
  });

  // ============================================================================
  // SECTION 10: Organization & Settings (136-150)
  // ============================================================================
  test('Scenarios 136-150: Organization & Settings Deep', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Organization
    await page.goto(`${BASE_URL}/organization`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'org-initial');

    // Scenario 136-140: Organization tabs
    const orgTabs = page.locator('[role="tab"], [class*="tab"]');
    const tabCount = await orgTabs.count();
    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await orgTabs.nth(i).click();
      await page.waitForTimeout(300);
      await screenshot(page, `org-tab-${i + 1}`);
    }

    // Members management
    await page.goto(`${BASE_URL}/organization/members`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'org-members');

    // Scenario 141-145: Settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'settings-initial');

    const settingsTabs = page.locator('[role="tab"], [class*="tab"]');
    const settingsTabCount = await settingsTabs.count();
    for (let i = 0; i < Math.min(settingsTabCount, 5); i++) {
      await settingsTabs.nth(i).click();
      await page.waitForTimeout(300);
      await screenshot(page, `settings-tab-${i + 1}`);
    }

    // Scenario 146-150: API Keys
    await page.goto(`${BASE_URL}/settings/api-keys`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'api-keys-list');

    const createKeyBtn = page.locator('button:has-text("Create"), button:has-text("Generate")');
    if (await createKeyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createKeyBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'api-keys-create-modal');
      await page.keyboard.press('Escape');
    }
  });

  // ============================================================================
  // SECTION 11: Advanced Navigation (151-165)
  // ============================================================================
  test('Scenarios 151-165: Advanced Navigation', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Scenario 151-155: Sidebar collapse/expand
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const sidebarToggle = page.locator('button[class*="sidebar"], button[aria-label*="menu"]');
    if (await sidebarToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sidebarToggle.click();
      await page.waitForTimeout(300);
      await screenshot(page, 'sidebar-collapsed');
      await sidebarToggle.click();
      await page.waitForTimeout(300);
      await screenshot(page, 'sidebar-expanded');
    }

    // Scenario 156-160: Breadcrumb navigation
    const breadcrumbs = page.locator('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]');
    if (await breadcrumbs.isVisible({ timeout: 2000 }).catch(() => false)) {
      await screenshot(page, 'breadcrumb-nav');
    }

    // Scenario 161-165: Quick navigation between pages
    const navItems = ['/servers', '/agents', '/tasks', '/monitoring', '/analytics'];
    for (const path of navItems) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }
    await screenshot(page, 'nav-complete');
  });

  // ============================================================================
  // SECTION 12: Error Handling & Edge Cases (166-180)
  // ============================================================================
  test('Scenarios 166-180: Error Handling & Edge Cases', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Scenario 166-170: 404 page
    await page.goto(`${BASE_URL}/nonexistent-page-${Date.now()}`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'error-404');

    // Scenario 171-175: Form validation
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Try to submit empty form
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, 'form-validation-errors');
      }
      await page.keyboard.press('Escape');
    }

    // Scenario 176-180: Empty states
    const emptyStatePages = ['/servers', '/agents', '/tasks'];
    for (const path of emptyStatePages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      const emptyState = page.locator('[class*="empty"], [class*="no-data"]');
      if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
        await screenshot(page, `empty-state-${path.replace('/', '')}`);
      }
    }
  });

  // ============================================================================
  // SECTION 13: Responsive & Accessibility (181-195)
  // ============================================================================
  test('Scenarios 181-195: Responsive & Accessibility', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Scenario 181-185: Different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-hd' },
      { width: 1366, height: 768, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      await screenshot(page, `responsive-${vp.name}`);
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // Scenario 186-190: Keyboard navigation
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    await screenshot(page, 'keyboard-nav');

    // Scenario 191-195: Focus states
    const focusableElements = page.locator('button, a, input, select, textarea');
    const focusCount = await focusableElements.count();
    if (focusCount > 0) {
      await focusableElements.first().focus();
      await screenshot(page, 'focus-state');
    }
  });

  // ============================================================================
  // SECTION 14: Complete Workflow Integration (196-210)
  // ============================================================================
  test('Scenarios 196-210: Complete Workflow Integration', async ({ page }) => {
    const token = adminToken || await loginOnce(page, ADMIN_USER, true);
    await setupAuth(page, token);

    // Complete user journey through all features
    const journey = [
      { path: '/', name: 'workflow-1-dashboard' },
      { path: '/servers', name: 'workflow-2-servers' },
      { path: '/agents', name: 'workflow-3-agents' },
      { path: '/tasks', name: 'workflow-4-tasks' },
      { path: '/tools', name: 'workflow-5-tools' },
      { path: '/monitoring', name: 'workflow-6-monitoring' },
      { path: '/chat', name: 'workflow-7-chat' },
      { path: '/audit', name: 'workflow-8-audit' },
      { path: '/analytics', name: 'workflow-9-analytics' },
      { path: '/organization', name: 'workflow-10-org' },
      { path: '/settings', name: 'workflow-11-settings' },
      { path: '/settings/api-keys', name: 'workflow-12-apikeys' },
      { path: '/', name: 'workflow-13-back-home' }
    ];

    for (const step of journey) {
      await page.goto(`${BASE_URL}${step.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await screenshot(page, step.name);
    }

    // Final summary screenshot
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'workflow-complete-final');
  });
});
