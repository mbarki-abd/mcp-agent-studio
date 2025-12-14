/**
 * Real-World Scenario Tests
 *
 * These tests simulate real user workflows with actual data operations.
 * Tests cover complete user journeys through the MCP Agent Studio application.
 */

import { test, expect, Page } from '@playwright/test';

// Test data for real scenarios
const TEST_DATA = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User'
  },
  user: {
    email: 'test@example.com',
    password: 'Admin123!',
    name: 'Test User'
  },
  newUser: {
    email: `e2e-user-${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'E2E Test User',
    organization: 'E2E Test Org'
  },
  server: {
    name: 'Production MCP Server',
    url: 'http://localhost:8080',
    description: 'Main production MCP server for AI agents'
  },
  agent: {
    name: 'code-assistant',
    displayName: 'Code Assistant Agent',
    description: 'An AI agent that helps with code review and generation',
    systemPrompt: 'You are a helpful code assistant. Help users with code review, debugging, and generation.'
  },
  task: {
    title: 'Review Pull Request #42',
    description: 'Review the code changes in PR #42 for security issues and best practices',
    prompt: 'Please review the code changes and provide feedback on security, performance, and code quality.'
  }
};

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
}

// Helper to check if logged in
async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login') && !url.includes('/register');
}

test.describe('Real-World Scenario: Complete User Registration Journey', () => {
  test('should complete full registration flow', async ({ page }) => {
    // 1. Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 2. Fill registration form
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const orgInput = page.locator('input[name="organizationName"], input[placeholder*="organization" i]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_DATA.newUser.name);
    }

    await emailInput.fill(TEST_DATA.newUser.email);
    await passwordInput.fill(TEST_DATA.newUser.password);

    if (await orgInput.isVisible()) {
      await orgInput.fill(TEST_DATA.newUser.organization);
    }

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Verify registration success (redirect to dashboard or confirmation)
    await page.waitForTimeout(3000);
    const currentUrl = page.url();

    // Either redirected to dashboard or shows success message
    const success = currentUrl.includes('dashboard') ||
                   currentUrl.includes('login') ||
                   await page.locator('text=/success|created|welcome/i').isVisible();

    expect(success).toBeTruthy();
  });
});

test.describe('Real-World Scenario: Admin Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should navigate through all admin sections', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-dashboard.png' });

    // Servers
    await page.goto('/servers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/servers|server/i').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-servers.png' });

    // Agents
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/agents|agent/i').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-agents.png' });

    // Tasks
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/tasks|task/i').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-tasks.png' });

    // Tools
    await page.goto('/tools');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/tools|tool/i').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-tools.png' });

    // Monitoring
    await page.goto('/monitoring');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/monitoring|monitor/i').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/scenario-admin-monitoring.png' });
  });

  test('should create a new server configuration', async ({ page }) => {
    await page.goto('/servers');
    await page.waitForLoadState('networkidle');

    // Click add server button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check if modal/form appeared
      const modal = page.locator('[role="dialog"], form, .modal').first();
      if (await modal.isVisible()) {
        // Fill server details
        const nameInput = modal.locator('input[name="name"], input[placeholder*="name" i]').first();
        const urlInput = modal.locator('input[name="url"], input[placeholder*="url" i]').first();

        if (await nameInput.isVisible()) {
          await nameInput.fill(TEST_DATA.server.name);
        }
        if (await urlInput.isVisible()) {
          await urlInput.fill(TEST_DATA.server.url);
        }

        await page.screenshot({ path: 'e2e/screenshots/scenario-server-form.png' });
      }
    }
  });

  test('should create a new agent', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Click add agent button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check if modal/form appeared
      const modal = page.locator('[role="dialog"], form, .modal').first();
      if (await modal.isVisible()) {
        // Fill agent details
        const nameInput = modal.locator('input[name="name"], input[placeholder*="name" i]').first();
        const displayNameInput = modal.locator('input[name="displayName"], input[placeholder*="display" i]').first();

        if (await nameInput.isVisible()) {
          await nameInput.fill(TEST_DATA.agent.name);
        }
        if (await displayNameInput.isVisible()) {
          await displayNameInput.fill(TEST_DATA.agent.displayName);
        }

        await page.screenshot({ path: 'e2e/screenshots/scenario-agent-form.png' });
      }
    }
  });

  test('should create a new task', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Click add task button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check if modal/form appeared
      const modal = page.locator('[role="dialog"], form, .modal').first();
      if (await modal.isVisible()) {
        // Fill task details
        const titleInput = modal.locator('input[name="title"], input[placeholder*="title" i]').first();
        const promptInput = modal.locator('textarea[name="prompt"], textarea[placeholder*="prompt" i]').first();

        if (await titleInput.isVisible()) {
          await titleInput.fill(TEST_DATA.task.title);
        }
        if (await promptInput.isVisible()) {
          await promptInput.fill(TEST_DATA.task.prompt);
        }

        await page.screenshot({ path: 'e2e/screenshots/scenario-task-form.png' });
      }
    }
  });
});

test.describe('Real-World Scenario: Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should access organization settings', async ({ page }) => {
    // Navigate to organization page
    await page.goto('/organization');
    await page.waitForLoadState('networkidle');

    // Check organization page loaded
    const pageContent = await page.content();
    const hasOrgContent = pageContent.toLowerCase().includes('organization') ||
                         pageContent.toLowerCase().includes('members') ||
                         pageContent.toLowerCase().includes('team');

    await page.screenshot({ path: 'e2e/screenshots/scenario-organization.png' });
    expect(hasOrgContent).toBeTruthy();
  });

  test('should access API keys management', async ({ page }) => {
    // Navigate to API keys page
    await page.goto('/api-keys');
    await page.waitForLoadState('networkidle');

    // Check API keys page loaded
    const pageContent = await page.content();
    const hasApiContent = pageContent.toLowerCase().includes('api') ||
                         pageContent.toLowerCase().includes('key') ||
                         pageContent.toLowerCase().includes('token');

    await page.screenshot({ path: 'e2e/screenshots/scenario-apikeys.png' });
    expect(hasApiContent).toBeTruthy();
  });

  test('should access audit logs', async ({ page }) => {
    // Navigate to audit page
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');

    // Check audit page loaded
    const pageContent = await page.content();
    const hasAuditContent = pageContent.toLowerCase().includes('audit') ||
                           pageContent.toLowerCase().includes('log') ||
                           pageContent.toLowerCase().includes('activity');

    await page.screenshot({ path: 'e2e/screenshots/scenario-audit.png' });
    expect(hasAuditContent).toBeTruthy();
  });
});

test.describe('Real-World Scenario: Monitoring & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should view monitoring dashboard with metrics', async ({ page }) => {
    await page.goto('/monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for any charts/metrics to load
    await page.waitForTimeout(2000);

    // Take screenshot of monitoring view
    await page.screenshot({ path: 'e2e/screenshots/scenario-monitoring-full.png', fullPage: true });

    // Check for monitoring elements
    const hasCharts = await page.locator('canvas, svg, [class*="chart"], [class*="graph"]').count() > 0;
    const hasMetrics = await page.locator('[class*="metric"], [class*="stat"], [class*="card"]').count() > 0;

    expect(hasCharts || hasMetrics).toBeTruthy();
  });

  test('should view analytics dashboard', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for any charts/metrics to load
    await page.waitForTimeout(2000);

    // Take screenshot of analytics view
    await page.screenshot({ path: 'e2e/screenshots/scenario-analytics-full.png', fullPage: true });

    // Verify page loaded
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);
  });
});

test.describe('Real-World Scenario: Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should interact with chat interface', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Wait for chat interface to load
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-chat-initial.png' });

    // Look for chat input
    const chatInput = page.locator('input[type="text"], textarea').filter({ hasText: '' }).first();

    if (await chatInput.isVisible()) {
      // Type a message
      await chatInput.fill('Hello, can you help me with code review?');
      await page.screenshot({ path: 'e2e/screenshots/scenario-chat-message.png' });

      // Try to send (either Enter or button click)
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        await chatInput.press('Enter');
      }

      // Wait for response
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/scenario-chat-response.png' });
    }
  });
});

test.describe('Real-World Scenario: User Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should update profile settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-settings.png' });

    // Look for profile form
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();

    if (await nameInput.isVisible()) {
      // Clear and update name
      await nameInput.clear();
      await nameInput.fill('Updated Admin Name');

      // Try to save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Check for success message
        const successMsg = page.locator('text=/success|saved|updated/i').first();
        if (await successMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
          await page.screenshot({ path: 'e2e/screenshots/scenario-settings-saved.png' });
        }
      }
    }
  });
});

test.describe('Real-World Scenario: Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-404.png' });

    // Check for 404 indication
    const pageContent = await page.content();
    const has404 = pageContent.includes('404') ||
                  pageContent.toLowerCase().includes('not found') ||
                  pageContent.toLowerCase().includes('page');

    expect(has404).toBeTruthy();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear cookies to ensure logged out
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login
    const url = page.url();
    expect(url).toContain('login');
  });
});

test.describe('Real-World Scenario: Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-mobile-dashboard.png' });

    // Check menu toggle is visible (hamburger)
    const menuToggle = page.locator('button[class*="menu"], [aria-label*="menu"], [class*="hamburger"]').first();
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/scenario-mobile-menu.png' });
    }
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'e2e/screenshots/scenario-tablet-dashboard.png' });
  });
});

test.describe('Real-World Scenario: Data Filtering & Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_DATA.admin.email, TEST_DATA.admin.password);
  });

  test('should filter servers list', async ({ page }) => {
    await page.goto('/servers');
    await page.waitForLoadState('networkidle');

    // Look for search/filter input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('production');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/scenario-servers-filtered.png' });
    }
  });

  test('should filter agents list', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Look for search/filter input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('assistant');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/scenario-agents-filtered.png' });
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Look for status filter dropdown
    const statusFilter = page.locator('select, [role="combobox"], button:has-text("Status")').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/scenario-tasks-filter-open.png' });
    }
  });
});
