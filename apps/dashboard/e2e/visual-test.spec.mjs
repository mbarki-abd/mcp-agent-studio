import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Test credentials (match seed-test-data.mjs)
const TEST_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
};

// Helper function to login
async function login(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const loginForm = page.locator('form');
  if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/*', { timeout: 10000 });
  }
}

test('Visual Test - All Pages', async ({ page }) => {
  // Login
  await login(page);

  const routes = [
    { path: '/', name: '01-dashboard' },
    { path: '/agents', name: '02-agents-list' },
    { path: '/agents/new', name: '03-agents-create' },
    { path: '/tasks', name: '04-tasks-list' },
    { path: '/tasks/new', name: '05-tasks-create' },
    { path: '/monitoring', name: '06-monitoring' },
    { path: '/tools', name: '07-tools-catalog' },
    { path: '/servers', name: '08-servers-list' },
  ];

  for (const route of routes) {
    console.log(`Testing: ${route.name} (${route.path})`);

    await page.goto(`${BASE_URL}${route.path}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: `e2e/screenshots/${route.name}.png`,
      fullPage: true
    });

    // Basic visibility check
    await expect(page.locator('body')).toBeVisible();

    console.log(`  ✓ ${route.name} captured`);
  }

  console.log('\n✅ All visual tests completed!');
});
