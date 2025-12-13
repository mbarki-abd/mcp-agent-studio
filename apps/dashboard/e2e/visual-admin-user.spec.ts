import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:3000';
const APP_URL = 'http://localhost:5173';

const TEST_USER = { email: 'test@example.com', password: 'password123' };
const ADMIN_USER = { email: 'admin@example.com', password: 'password123' };

async function loginAs(page: Page, user: { email: string; password: string }) {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: user,
  });
  const data = await response.json();
  if (!response.ok()) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  await page.goto(APP_URL);
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, data.accessToken);
  return data;
}

test.describe('Visual Test - User Access', () => {
  test('capture user dashboard and pages', async ({ page }) => {
    await loginAs(page, TEST_USER);

    // Dashboard
    await page.goto(`${APP_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/user-01-dashboard.png', fullPage: true });

    // Servers
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-02-servers.png', fullPage: true });

    // Agents
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-03-agents.png', fullPage: true });

    // Tasks
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-04-tasks.png', fullPage: true });

    // Tools
    await page.goto(`${APP_URL}/tools`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-05-tools.png', fullPage: true });

    // Monitoring
    await page.goto(`${APP_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-06-monitoring.png', fullPage: true });

    // Chat (may show access denied for USER role)
    await page.goto(`${APP_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-07-chat.png', fullPage: true });

    // Settings
    await page.goto(`${APP_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/user-08-settings.png', fullPage: true });
  });
});

test.describe('Visual Test - Admin Access', () => {
  test('capture admin dashboard and pages', async ({ page }) => {
    await loginAs(page, ADMIN_USER);

    // Dashboard
    await page.goto(`${APP_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/admin-01-dashboard.png', fullPage: true });

    // Servers
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-02-servers.png', fullPage: true });

    // Agents
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-03-agents.png', fullPage: true });

    // Tasks
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-04-tasks.png', fullPage: true });

    // Tools
    await page.goto(`${APP_URL}/tools`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-05-tools.png', fullPage: true });

    // Monitoring
    await page.goto(`${APP_URL}/monitoring`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-06-monitoring.png', fullPage: true });

    // Chat
    await page.goto(`${APP_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-07-chat.png', fullPage: true });

    // Organization
    await page.goto(`${APP_URL}/organization`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-08-organization.png', fullPage: true });

    // Organization Members
    await page.goto(`${APP_URL}/organization/members`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-09-members.png', fullPage: true });

    // API Keys
    await page.goto(`${APP_URL}/settings/api-keys`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-10-apikeys.png', fullPage: true });

    // Audit Logs
    await page.goto(`${APP_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-11-audit.png', fullPage: true });

    // Analytics
    await page.goto(`${APP_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-12-analytics.png', fullPage: true });

    // Settings
    await page.goto(`${APP_URL}/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/admin-13-settings.png', fullPage: true });
  });
});
