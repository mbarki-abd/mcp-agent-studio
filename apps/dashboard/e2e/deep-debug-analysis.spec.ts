import { test, expect, Page, BrowserContext, ConsoleMessage, Request, Response } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Production URLs
const BASE_URL = process.env.TEST_URL || 'https://mcp.ilinqsoft.com';
const API_URL = BASE_URL.includes('localhost')
  ? 'http://localhost:3000'
  : BASE_URL.replace('mcp.', 'api.mcp.');

const ADMIN_USER = { email: 'admin@example.com', password: 'password123' };

// Debug data collection
interface DebugData {
  consoleLogs: { type: string; text: string; timestamp: string }[];
  networkRequests: { url: string; method: string; status?: number; duration?: number; timestamp: string }[];
  errors: { message: string; stack?: string; timestamp: string }[];
  performance: { name: string; duration: number }[];
  screenshots: string[];
}

let debugData: DebugData = {
  consoleLogs: [],
  networkRequests: [],
  errors: [],
  performance: [],
  screenshots: []
};

let screenshotCounter = 1;
let adminToken: string | null = null;

// Ensure debug output directory exists
const debugDir = 'e2e/debug-output';

async function ensureDebugDir() {
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
}

async function screenshot(page: Page, name: string) {
  const filename = `debug-${String(screenshotCounter++).padStart(3, '0')}-${name}.png`;
  const filepath = `e2e/screenshots/${filename}`;
  await page.screenshot({ path: filepath, fullPage: true });
  debugData.screenshots.push(filename);
  return filename;
}

async function loginOnce(page: Page): Promise<string> {
  if (adminToken) return adminToken;

  const response = await page.request.post(`${API_URL}/api/auth/login`, { data: ADMIN_USER });
  const data = await response.json();
  if (!response.ok()) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  adminToken = data.accessToken;
  return data.accessToken;
}

async function setupAuth(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
}

function setupPageDebugListeners(page: Page) {
  // Capture console logs
  page.on('console', (msg: ConsoleMessage) => {
    debugData.consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  // Capture page errors
  page.on('pageerror', (error: Error) => {
    debugData.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Capture network requests
  page.on('request', (request: Request) => {
    debugData.networkRequests.push({
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString()
    });
  });

  // Update request with response status
  page.on('response', (response: Response) => {
    const req = debugData.networkRequests.find(r => r.url === response.url() && !r.status);
    if (req) {
      req.status = response.status();
    }
  });

  // Capture request failures
  page.on('requestfailed', (request: Request) => {
    debugData.errors.push({
      message: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
      timestamp: new Date().toISOString()
    });
  });
}

function saveDebugReport() {
  ensureDebugDir();
  const reportPath = path.join(debugDir, `debug-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(debugData, null, 2));

  // Create HTML report
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Agent Studio - Deep Debug Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #4fc3f7; }
    h2 { color: #81c784; border-bottom: 1px solid #444; padding-bottom: 10px; }
    .section { margin: 20px 0; padding: 15px; background: #16213e; border-radius: 8px; }
    .error { color: #ef5350; }
    .warning { color: #ffb74d; }
    .info { color: #4fc3f7; }
    .success { color: #81c784; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #0f3460; }
    tr:hover { background: #1a3a5c; }
    .log-entry { padding: 5px 10px; margin: 2px 0; border-radius: 4px; font-family: monospace; font-size: 12px; }
    .log-error { background: rgba(239, 83, 80, 0.2); }
    .log-warning { background: rgba(255, 183, 77, 0.2); }
    .log-info { background: rgba(79, 195, 247, 0.2); }
    .log-log { background: rgba(255, 255, 255, 0.1); }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat-card { background: #0f3460; padding: 20px; border-radius: 8px; min-width: 150px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #4fc3f7; }
    .stat-label { color: #aaa; }
    pre { background: #0a0a1a; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔍 MCP Agent Studio - Deep Debug Analysis Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Environment: ${BASE_URL}</p>

  <div class="section stats">
    <div class="stat-card">
      <div class="stat-value">${debugData.screenshots.length}</div>
      <div class="stat-label">Screenshots</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${debugData.consoleLogs.length}</div>
      <div class="stat-label">Console Logs</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${debugData.networkRequests.length}</div>
      <div class="stat-label">Network Requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-value ${debugData.errors.length > 0 ? 'error' : 'success'}">${debugData.errors.length}</div>
      <div class="stat-label">Errors</div>
    </div>
  </div>

  <div class="section">
    <h2>❌ Errors (${debugData.errors.length})</h2>
    ${debugData.errors.length === 0 ? '<p class="success">No errors captured!</p>' : ''}
    ${debugData.errors.map(e => `
      <div class="log-entry log-error">
        <strong>[${e.timestamp}]</strong> ${e.message}
        ${e.stack ? `<pre>${e.stack}</pre>` : ''}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>📝 Console Logs (${debugData.consoleLogs.length})</h2>
    ${debugData.consoleLogs.slice(-100).map(log => `
      <div class="log-entry log-${log.type}">
        <strong>[${log.type.toUpperCase()}]</strong> ${log.text}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>🌐 Network Requests (${debugData.networkRequests.length})</h2>
    <table>
      <tr>
        <th>Method</th>
        <th>URL</th>
        <th>Status</th>
        <th>Time</th>
      </tr>
      ${debugData.networkRequests.slice(-50).map(req => `
        <tr>
          <td><strong>${req.method}</strong></td>
          <td style="max-width: 500px; overflow: hidden; text-overflow: ellipsis;">${req.url}</td>
          <td class="${req.status && req.status >= 400 ? 'error' : 'success'}">${req.status || 'pending'}</td>
          <td>${req.timestamp}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <h2>📸 Screenshots (${debugData.screenshots.length})</h2>
    <p>Screenshots saved in: e2e/screenshots/</p>
    <ul>
      ${debugData.screenshots.map(s => `<li>${s}</li>`).join('')}
    </ul>
  </div>
</body>
</html>
  `;

  const htmlPath = path.join(debugDir, `debug-report-${Date.now()}.html`);
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`Debug report saved to: ${htmlPath}`);
}

// ============================================================================
// DEEP DEBUG ANALYSIS SUITE
// ============================================================================

test.describe('Deep Debug Analysis - 100+ Scenarios with Console Capture', () => {
  test.setTimeout(900000); // 15 minutes

  test.beforeAll(async () => {
    await ensureDebugDir();
    // Reset debug data
    debugData = {
      consoleLogs: [],
      networkRequests: [],
      errors: [],
      performance: [],
      screenshots: []
    };
  });

  test.afterAll(async () => {
    saveDebugReport();
  });

  // ============================================================================
  // TEST 1: Complete Dashboard Analysis
  // ============================================================================
  test('Deep Analysis 1: Dashboard with full debug capture', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Dashboard Analysis...');

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'dashboard-loaded');

    // Capture performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      return entries.map(e => ({
        name: e.name,
        duration: e.duration
      }));
    });
    debugData.performance.push(...performanceMetrics);

    // Test all interactive elements
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on dashboard`);

    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      try {
        const btn = buttons[i];
        if (await btn.isVisible()) {
          const text = await btn.textContent();
          console.log(`Testing button ${i + 1}: ${text}`);
          await btn.hover();
          await page.waitForTimeout(200);
        }
      } catch (e) {
        console.log(`Button ${i + 1} interaction failed:`, e);
      }
    }
    await screenshot(page, 'dashboard-buttons-tested');

    // Check for JavaScript errors
    const jsErrors = debugData.errors.filter(e => e.message.includes('TypeError') || e.message.includes('ReferenceError'));
    console.log(`JavaScript errors found: ${jsErrors.length}`);

    // Scroll analysis
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page scroll height: ${scrollHeight}px`);

    for (let scrollPos = 0; scrollPos <= scrollHeight; scrollPos += 500) {
      await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
      await page.waitForTimeout(300);
    }
    await screenshot(page, 'dashboard-scroll-complete');
  });

  // ============================================================================
  // TEST 2: Servers Deep Analysis
  // ============================================================================
  test('Deep Analysis 2: Servers with network capture', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Servers Analysis...');

    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'servers-loaded');

    // Analyze API calls
    const apiCalls = debugData.networkRequests.filter(r => r.url.includes('/api/'));
    console.log(`API calls made: ${apiCalls.length}`);
    apiCalls.forEach(call => {
      console.log(`  ${call.method} ${call.url} -> ${call.status}`);
    });

    // Test Add Server form
    const addBtn = page.locator('button:has-text("Add"), button:has-text("Server")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'servers-add-modal-open');

      // Get all form fields
      const inputs = await page.locator('input, select, textarea').all();
      console.log(`Form fields found: ${inputs.length}`);

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (await input.isVisible()) {
          const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || `field-${i}`;
          const type = await input.getAttribute('type') || 'text';
          console.log(`  Field ${i + 1}: ${name} (${type})`);
        }
      }

      await page.keyboard.press('Escape');
    }

    // Check for empty states
    const emptyState = page.locator('[class*="empty"], text="No servers"');
    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Empty state detected on servers page');
      await screenshot(page, 'servers-empty-state');
    }
  });

  // ============================================================================
  // TEST 3: Agents Deep Analysis
  // ============================================================================
  test('Deep Analysis 3: Agents hierarchy and state', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Agents Analysis...');

    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'agents-loaded');

    // Analyze agent types
    const agentCards = await page.locator('[class*="agent"], [class*="card"]').all();
    console.log(`Agent elements found: ${agentCards.length}`);

    // Test filters
    const filterBtns = await page.locator('[role="tab"], button[data-filter]').all();
    console.log(`Filter buttons: ${filterBtns.length}`);

    for (let i = 0; i < filterBtns.length; i++) {
      const btn = filterBtns[i];
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        console.log(`Testing filter: ${text}`);
        await btn.click();
        await page.waitForTimeout(500);
        await screenshot(page, `agents-filter-${i + 1}`);
      }
    }

    // Test create agent modal
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'agents-create-modal');

      // Analyze modal structure
      const modalInputs = await page.locator('dialog input, [role="dialog"] input, .modal input').all();
      console.log(`Modal inputs: ${modalInputs.length}`);

      await page.keyboard.press('Escape');
    }
  });

  // ============================================================================
  // TEST 4: Tasks Deep Analysis
  // ============================================================================
  test('Deep Analysis 4: Tasks workflow and scheduling', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Tasks Analysis...');

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'tasks-loaded');

    // Analyze task list
    const taskRows = await page.locator('tr, [class*="task-item"]').all();
    console.log(`Task items found: ${taskRows.length}`);

    // Test status filters
    const statuses = ['All', 'Pending', 'Running', 'Completed', 'Failed'];
    for (const status of statuses) {
      const filterBtn = page.locator(`button:has-text("${status}")`).first();
      if (await filterBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Testing status filter: ${status}`);
        await filterBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, `tasks-filter-${status.toLowerCase()}`);
      }
    }

    // Test create task modal
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Task")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'tasks-create-modal');

      // Check for scheduling options
      const scheduleSection = page.locator('[class*="schedule"], [class*="cron"]');
      if (await scheduleSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Schedule section found in task form');
        await screenshot(page, 'tasks-schedule-options');
      }

      await page.keyboard.press('Escape');
    }
  });

  // ============================================================================
  // TEST 5: Monitoring Real-time Analysis
  // ============================================================================
  test('Deep Analysis 5: Monitoring real-time data', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Monitoring Analysis...');

    await page.goto(`${BASE_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for real-time data
    await screenshot(page, 'monitoring-loaded');

    // Check WebSocket connections
    const wsConnections = debugData.networkRequests.filter(r =>
      r.url.includes('socket') || r.url.includes('ws://') || r.url.includes('wss://')
    );
    console.log(`WebSocket connections: ${wsConnections.length}`);

    // Analyze charts
    const charts = await page.locator('canvas, [class*="chart"], svg').all();
    console.log(`Charts found: ${charts.length}`);

    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      if (await chart.isVisible()) {
        await chart.hover();
        await page.waitForTimeout(500);
        await screenshot(page, `monitoring-chart-${i + 1}`);
      }
    }

    // Check real-time updates
    const initialLogs = debugData.consoleLogs.length;
    await page.waitForTimeout(5000); // Wait for updates
    const newLogs = debugData.consoleLogs.length - initialLogs;
    console.log(`New console logs in 5 seconds: ${newLogs}`);

    // Scroll to see all metrics
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, 'monitoring-full-scroll');
  });

  // ============================================================================
  // TEST 6: Tools Catalog Analysis
  // ============================================================================
  test('Deep Analysis 6: Tools catalog and permissions', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Tools Analysis...');

    await page.goto(`${BASE_URL}/tools`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'tools-loaded');

    // Analyze tool categories
    const categories = await page.locator('[class*="category"], [role="tab"]').all();
    console.log(`Tool categories: ${categories.length}`);

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (await cat.isVisible()) {
        const text = await cat.textContent();
        console.log(`  Category ${i + 1}: ${text}`);
        await cat.click();
        await page.waitForTimeout(500);
        await screenshot(page, `tools-category-${i + 1}`);
      }
    }

    // Search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const searchTerms = ['read', 'write', 'execute', 'list', 'api'];
      for (const term of searchTerms) {
        console.log(`Searching for: ${term}`);
        await searchInput.fill(term);
        await page.waitForTimeout(500);

        const results = await page.locator('[class*="tool-item"], [class*="result"]').count();
        console.log(`  Results for "${term}": ${results}`);
        await screenshot(page, `tools-search-${term}`);
      }
      await searchInput.clear();
    }
  });

  // ============================================================================
  // TEST 7: Chat Interface Analysis
  // ============================================================================
  test('Deep Analysis 7: Chat interface and messaging', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Chat Analysis...');

    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'chat-loaded');

    // Analyze chat structure
    const chatElements = {
      agentSelector: await page.locator('select, [role="combobox"]').count(),
      messageInput: await page.locator('input, textarea').count(),
      sendButton: await page.locator('button:has-text("Send"), button[type="submit"]').count(),
      messageHistory: await page.locator('[class*="message"], [class*="history"]').count()
    };

    console.log('Chat structure:', chatElements);

    // Test message input
    const chatInput = page.locator('input[type="text"], textarea').first();
    if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const testMessages = [
        'Hello, how are you?',
        'Show me available tools',
        'List all agents',
        'Execute task: test'
      ];

      for (const msg of testMessages) {
        console.log(`Testing message: ${msg}`);
        await chatInput.fill(msg);
        await page.waitForTimeout(300);
        await screenshot(page, `chat-input-${testMessages.indexOf(msg) + 1}`);
        await chatInput.clear();
      }
    }
  });

  // ============================================================================
  // TEST 8: Audit Logs Analysis
  // ============================================================================
  test('Deep Analysis 8: Audit logs and security', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Audit Analysis...');

    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'audit-loaded');

    // Analyze log entries
    const logEntries = await page.locator('tr, [class*="log-entry"]').all();
    console.log(`Audit log entries: ${logEntries.length}`);

    // Test filters
    const filters = await page.locator('select, [role="combobox"]').all();
    console.log(`Available filters: ${filters.length}`);

    for (let i = 0; i < Math.min(filters.length, 3); i++) {
      const filter = filters[i];
      if (await filter.isVisible()) {
        await filter.click();
        await page.waitForTimeout(300);
        await screenshot(page, `audit-filter-${i + 1}`);
        await page.keyboard.press('Escape');
      }
    }

    // Check for export functionality
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Export functionality available');
      await exportBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'audit-export-options');
      await page.keyboard.press('Escape');
    }

    // Scroll through logs
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await screenshot(page, 'audit-full-scroll');
  });

  // ============================================================================
  // TEST 9: Analytics Deep Analysis
  // ============================================================================
  test('Deep Analysis 9: Analytics and metrics', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Analytics Analysis...');

    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'analytics-loaded');

    // Analyze charts and metrics
    const charts = await page.locator('canvas, [class*="chart"], svg').all();
    console.log(`Analytics charts: ${charts.length}`);

    const metrics = await page.locator('[class*="metric"], [class*="stat"]').all();
    console.log(`Metric cards: ${metrics.length}`);

    // Test time range selectors
    const timeSelectors = await page.locator('select, [role="combobox"], button:has-text("days")').all();
    for (let i = 0; i < Math.min(timeSelectors.length, 3); i++) {
      const selector = timeSelectors[i];
      if (await selector.isVisible()) {
        await selector.click();
        await page.waitForTimeout(300);
        await screenshot(page, `analytics-time-selector-${i + 1}`);
        await page.keyboard.press('Escape');
      }
    }

    // Hover over charts for tooltips
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      if (await chart.isVisible()) {
        const box = await chart.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
          await screenshot(page, `analytics-chart-hover-${i + 1}`);
        }
      }
    }
  });

  // ============================================================================
  // TEST 10: Settings & Configuration Analysis
  // ============================================================================
  test('Deep Analysis 10: Settings and configuration', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Settings Analysis...');

    // Main settings
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'settings-loaded');

    // Analyze settings tabs
    const tabs = await page.locator('[role="tab"], [class*="tab"]').all();
    console.log(`Settings tabs: ${tabs.length}`);

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (await tab.isVisible()) {
        const text = await tab.textContent();
        console.log(`Testing tab: ${text}`);
        await tab.click();
        await page.waitForTimeout(500);
        await screenshot(page, `settings-tab-${i + 1}`);
      }
    }

    // API Keys page
    await page.goto(`${BASE_URL}/settings/api-keys`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'api-keys-loaded');

    const createKeyBtn = page.locator('button:has-text("Create"), button:has-text("Generate")');
    if (await createKeyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createKeyBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'api-keys-create-modal');
      await page.keyboard.press('Escape');
    }

    // Organization settings
    await page.goto(`${BASE_URL}/organization`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'organization-loaded');
  });

  // ============================================================================
  // TEST 11: Performance Analysis
  // ============================================================================
  test('Deep Analysis 11: Performance metrics', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Performance Analysis...');

    const pages = ['/', '/servers', '/agents', '/tasks', '/monitoring', '/analytics'];
    const performanceResults: { page: string; loadTime: number; domContentLoaded: number }[] = [];

    for (const pagePath of pages) {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      const domMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perf?.domContentLoadedEventEnd - perf?.startTime || 0
        };
      });

      performanceResults.push({
        page: pagePath,
        loadTime,
        domContentLoaded: domMetrics.domContentLoaded
      });

      console.log(`${pagePath}: Load=${loadTime}ms, DOMContentLoaded=${domMetrics.domContentLoaded}ms`);
      await screenshot(page, `perf-${pagePath.replace('/', 'home') || 'home'}`);
    }

    // Save performance results
    debugData.performance = performanceResults.map(r => ({
      name: r.page,
      duration: r.loadTime
    }));

    console.log('\n=== Performance Summary ===');
    const avgLoadTime = performanceResults.reduce((sum, r) => sum + r.loadTime, 0) / performanceResults.length;
    console.log(`Average load time: ${avgLoadTime.toFixed(0)}ms`);
  });

  // ============================================================================
  // TEST 12: Error Boundary Testing
  // ============================================================================
  test('Deep Analysis 12: Error handling and edge cases', async ({ page }) => {
    setupPageDebugListeners(page);

    const token = await loginOnce(page);
    await setupAuth(page, token);

    console.log('Starting Error Handling Analysis...');

    // Test 404 page
    await page.goto(`${BASE_URL}/nonexistent-${Date.now()}`);
    await page.waitForLoadState('networkidle');
    await screenshot(page, 'error-404');

    // Check for error boundary
    const errorBoundary = page.locator('[class*="error"], [class*="boundary"], text="Something went wrong"');
    if (await errorBoundary.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Error boundary detected');
      await screenshot(page, 'error-boundary');
    }

    // Test form validation
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Try to submit empty form
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(500);

        // Check for validation messages
        const validationErrors = await page.locator('[class*="error"], [class*="invalid"], [aria-invalid="true"]').count();
        console.log(`Validation errors shown: ${validationErrors}`);
        await screenshot(page, 'form-validation-errors');
      }
      await page.keyboard.press('Escape');
    }

    // Summary of all errors captured
    console.log('\n=== Error Summary ===');
    console.log(`Total errors captured: ${debugData.errors.length}`);
    debugData.errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e.message}`);
    });
  });

  // ============================================================================
  // FINAL: Generate Complete Report
  // ============================================================================
  test('Final: Generate comprehensive debug report', async ({ page }) => {
    console.log('\n========================================');
    console.log('DEEP DEBUG ANALYSIS COMPLETE');
    console.log('========================================');
    console.log(`Screenshots captured: ${debugData.screenshots.length}`);
    console.log(`Console logs: ${debugData.consoleLogs.length}`);
    console.log(`Network requests: ${debugData.networkRequests.length}`);
    console.log(`Errors: ${debugData.errors.length}`);
    console.log('========================================');

    // Error breakdown
    const errorTypes = debugData.errors.reduce((acc, e) => {
      const type = e.message.includes('TypeError') ? 'TypeError' :
                   e.message.includes('Network') ? 'Network' :
                   e.message.includes('Request failed') ? 'Request' : 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nError breakdown:', errorTypes);

    // Network summary
    const networkSummary = debugData.networkRequests.reduce((acc, r) => {
      const status = r.status || 0;
      if (status >= 200 && status < 300) acc.success++;
      else if (status >= 400) acc.errors++;
      else acc.pending++;
      return acc;
    }, { success: 0, errors: 0, pending: 0 });

    console.log('Network summary:', networkSummary);

    // Console log types
    const logTypes = debugData.consoleLogs.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Console log types:', logTypes);

    // Save final report
    saveDebugReport();
    console.log('\nDebug report saved to: e2e/debug-output/');
  });
});
