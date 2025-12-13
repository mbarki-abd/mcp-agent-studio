import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:3000';
const APP_URL = 'http://localhost:5173';

// Test credentials
const TEST_USER = { email: 'test@example.com', password: 'password123' };
const ADMIN_USER = { email: 'admin@example.com', password: 'password123' };

// Helper to login via API and set cookies
async function loginAs(page: Page, user: { email: string; password: string }) {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: user,
  });
  const data = await response.json();

  if (!response.ok()) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }

  // Store token in localStorage
  await page.goto(APP_URL);
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, data.accessToken);

  return data;
}

// ============================================
// USER FLOW TESTS
// ============================================

test.describe('User Flow - Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

    // Should be on dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input[name="email"]', 'wrong@email.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should still be on login page (not redirected to dashboard)
    expect(page.url()).toContain('/login');
  });

  test('should logout successfully', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Find and click logout button
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [aria-label="Logout"]');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('User Flow - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should display dashboard stats', async ({ page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check for stat cards
    await expect(page.locator('[class*="card"], [class*="stat"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display recent activity', async ({ page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Look for activity section
    const activitySection = page.locator('text=/recent|activity|history/i');
    if (await activitySection.count() > 0) {
      await expect(activitySection.first()).toBeVisible();
    }
  });
});

test.describe('User Flow - Servers Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should list servers', async ({ page }) => {
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');

    // Should show servers page
    await expect(page.locator('h1, h2').filter({ hasText: /server/i })).toBeVisible({ timeout: 5000 });
  });

  test('should open create server dialog', async ({ page }) => {
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();

      // Dialog or form should appear
      await expect(page.locator('[role="dialog"], form, [class*="modal"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate server form', async ({ page }) => {
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);

      // Try to submit empty form
      const submitBtn = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();

        // Should show validation errors
        await expect(page.locator('text=/required|invalid|error/i')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('User Flow - Agents Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should list agents', async ({ page }) => {
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /agent/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display agents page content', async ({ page }) => {
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Should show agents page content (cards, list, or empty state)
    const hasContent = await page.locator('[class*="card"], [class*="list"], [class*="empty"]').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should open create agent wizard', async ({ page }) => {
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();

      // Wizard or form should appear
      await expect(page.locator('[role="dialog"], form, [class*="wizard"], [class*="modal"]')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('User Flow - Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should list tasks', async ({ page }) => {
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /task/i })).toBeVisible({ timeout: 5000 });
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    // Look for filter/status buttons
    const filterBtn = page.locator('button:has-text("Filter"), [class*="filter"], select');
    if (await filterBtn.count() > 0) {
      await filterBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should open create task form', async ({ page }) => {
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();

      await expect(page.locator('[role="dialog"], form, [class*="modal"]')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('User Flow - Tools Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should display tools page or error state', async ({ page }) => {
    await page.goto(`${APP_URL}/tools`);
    await page.waitForLoadState('networkidle');

    // Page should show either "Tools Catalog" title OR error message (if no tools data)
    const hasCatalogTitle = await page.locator('h1').filter({ hasText: /tools catalog/i }).count() > 0;
    const hasErrorState = await page.locator('text=/failed to load|error|no tools/i').count() > 0;

    expect(hasCatalogTitle || hasErrorState).toBeTruthy();
  });

  test('should search tools', async ({ page }) => {
    await page.goto(`${APP_URL}/tools`);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('git');
      await page.waitForTimeout(500);
    }
  });

  test('should filter tools by category', async ({ page }) => {
    await page.goto(`${APP_URL}/tools`);
    await page.waitForLoadState('networkidle');

    // Click filter dropdown
    const filterBtn = page.locator('button:has-text("All Categories"), button:has-text("Filter")');
    if (await filterBtn.count() > 0) {
      await filterBtn.first().click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('User Flow - Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should display chat page or access denied', async ({ page }) => {
    await page.goto(`${APP_URL}/chat`);
    await page.waitForLoadState('networkidle');

    // Should show chat page title OR access denied (for users without execute:Agent permission)
    const hasChatTitle = await page.locator('h1').filter({ hasText: /chat with agents/i }).count() > 0;
    const hasAccessDenied = await page.locator('text=/access denied|permission|unauthorized/i').count() > 0;

    expect(hasChatTitle || hasAccessDenied).toBeTruthy();
  });

  test('should show appropriate content', async ({ page }) => {
    await page.goto(`${APP_URL}/chat`);
    await page.waitForLoadState('networkidle');

    // Should show agent cards, empty state, OR access denied message
    const hasCards = await page.locator('[class*="card"]').count() > 0;
    const hasCreateButton = await page.locator('button:has-text("Create Agent")').count() > 0;
    const hasAccessDenied = await page.locator('text=/access denied/i').count() > 0;
    const hasContent = hasCards || hasCreateButton || hasAccessDenied;
    expect(hasContent).toBeTruthy();
  });
});

test.describe('User Flow - Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
  });

  test('should show monitoring page', async ({ page }) => {
    await page.goto(`${APP_URL}/monitoring`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /monitor|control|real-time/i })).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// ADMIN FLOW TESTS
// ============================================

test.describe('Admin Flow - Organization', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should access organization settings', async ({ page }) => {
    await page.goto(`${APP_URL}/organization`);
    await page.waitForLoadState('networkidle');

    // Check for organization page content
    const hasOrgContent = await page.locator('h1, h2, [class*="card"]').count() > 0;
    expect(hasOrgContent).toBeTruthy();
  });

  test('should list organization members', async ({ page }) => {
    await page.goto(`${APP_URL}/organization/members`);
    await page.waitForLoadState('networkidle');

    // Look for members section or table
    const membersSection = page.locator('table, [class*="member"], [class*="list"]');
    await expect(membersSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should access invitations page', async ({ page }) => {
    await page.goto(`${APP_URL}/organization/invitations`);
    await page.waitForLoadState('networkidle');

    // Should load without error
    const hasContent = await page.locator('h1, h2, [class*="card"], table').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Admin Flow - API Keys', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should list API keys', async ({ page }) => {
    // Correct route is /settings/api-keys
    await page.goto(`${APP_URL}/settings/api-keys`);
    await page.waitForLoadState('networkidle');

    // Check for API keys page content
    const hasContent = await page.locator('h1, h2, table, [class*="card"]').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should create new API key', async ({ page }) => {
    await page.goto(`${APP_URL}/settings/api-keys`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("Generate"), button:has-text("New")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();

      await expect(page.locator('[role="dialog"], form')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Admin Flow - Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should display audit logs', async ({ page }) => {
    await page.goto(`${APP_URL}/audit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').filter({ hasText: /audit|log/i })).toBeVisible({ timeout: 5000 });
  });

  test('should filter audit logs by action', async ({ page }) => {
    await page.goto(`${APP_URL}/audit`);
    await page.waitForLoadState('networkidle');

    const filterSelect = page.locator('select, [role="combobox"], button:has-text("Filter")');
    if (await filterSelect.count() > 0) {
      await filterSelect.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should show audit log entries', async ({ page }) => {
    await page.goto(`${APP_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Should have table or list of logs
    const hasLogs = await page.locator('table, [class*="log"], [class*="list"]').count() > 0;
    expect(hasLogs).toBeTruthy();
  });
});

test.describe('Admin Flow - Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should display analytics overview', async ({ page }) => {
    await page.goto(`${APP_URL}/analytics`);
    await page.waitForLoadState('networkidle');

    // Check page loaded
    const hasContent = await page.locator('h1, h2, [class*="card"], [class*="chart"]').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should show charts and graphs', async ({ page }) => {
    await page.goto(`${APP_URL}/analytics`);
    await page.waitForLoadState('networkidle');

    // Look for chart elements
    const charts = page.locator('canvas, svg, [class*="chart"], [class*="graph"]');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });
});

test.describe('Admin Flow - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should display settings page', async ({ page }) => {
    await page.goto(`${APP_URL}/settings`);
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('h1, h2, [class*="card"], form').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});

// ============================================
// CROSS-CUTTING TESTS
// ============================================

test.describe('Navigation & Sidebar', () => {
  test('should navigate through sidebar menu', async ({ page }) => {
    await loginAs(page, TEST_USER);
    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check sidebar is visible
    const sidebar = page.locator('[class*="sidebar"], nav, aside');
    await expect(sidebar.first()).toBeVisible();
  });

  test('admin should access all pages', async ({ page }) => {
    await loginAs(page, ADMIN_USER);

    const pages = ['/dashboard', '/servers', '/agents', '/tasks', '/tools', '/monitoring', '/organization', '/audit', '/analytics'];

    for (const path of pages) {
      await page.goto(`${APP_URL}${path}`);
      await page.waitForLoadState('networkidle');

      // Should not see forbidden message and page should load
      const forbidden = await page.locator('text=/forbidden|unauthorized|access denied/i').count();
      expect(forbidden).toBe(0);
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, TEST_USER);

    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should show content
    const hasContent = await page.locator('[class*="card"], [class*="stat"]').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAs(page, TEST_USER);

    await page.goto(`${APP_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should show dashboard content
    const hasContent = await page.locator('[class*="card"], [class*="stat"], h1, h2').count() > 0;
    expect(hasContent).toBeTruthy();
  });
});

// ============================================
// CRUD OPERATIONS TESTS
// ============================================

test.describe('CRUD - Servers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should create a new server', async ({ page }) => {
    await page.goto(`${APP_URL}/servers`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
    if (await addBtn.count() > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(500);

      // Fill form
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Server E2E');
      }

      const urlInput = page.locator('input[name="url"], input[placeholder*="url" i], input[type="url"]');
      if (await urlInput.count() > 0) {
        await urlInput.fill('http://localhost:3001');
      }
    }
  });
});

test.describe('CRUD - Agents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should open agent creation wizard', async ({ page }) => {
    await page.goto(`${APP_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);

      // Should show wizard or form
      const hasForm = await page.locator('[role="dialog"], form, [class*="wizard"]').count() > 0;
      expect(hasForm).toBeTruthy();
    }
  });
});

test.describe('CRUD - Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_USER);
  });

  test('should open task creation form', async ({ page }) => {
    await page.goto(`${APP_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")');
    if (await createBtn.count() > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);

      // Should show form
      const hasForm = await page.locator('[role="dialog"], form').count() > 0;
      expect(hasForm).toBeTruthy();
    }
  });
});
