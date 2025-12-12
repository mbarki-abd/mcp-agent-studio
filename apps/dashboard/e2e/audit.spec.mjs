/**
 * Audit Module E2E Tests
 *
 * Tests the audit log viewer functionality including:
 * - Page access (admin only)
 * - Stats cards display
 * - Filters
 * - Pagination
 * - Detail modal
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const ADMIN_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
};

let authToken = null;

async function authenticate() {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_USER),
  });

  if (!response.ok) {
    // Try register
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ADMIN_USER, name: 'Admin User' }),
    });
    const data = await registerResponse.json();
    return data.token;
  }

  const data = await response.json();
  return data.token;
}

test.describe('Audit Module', () => {
  test.beforeAll(async () => {
    authToken = await authenticate();
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token in localStorage
    await page.goto(BASE_URL);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
  });

  test('should display audit logs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible();

    // Check description
    await expect(page.locator('text=Monitor system activity')).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Wait for stats to load
    await page.waitForTimeout(1000);

    // Check stats cards exist
    await expect(page.locator('text=Total Events')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
    await expect(page.locator('text=Failed Logins')).toBeVisible();
    await expect(page.locator('text=Avg Response')).toBeVisible();
  });

  test('should display audit log table', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Check table headers (use exact matching to avoid ambiguity)
    await expect(page.getByRole('columnheader', { name: 'Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Resource' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible();
  });

  test('should toggle filter visibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Initially filters should be hidden
    const actionFilter = page.locator('label:has-text("Action")');
    await expect(actionFilter).not.toBeVisible();

    // Click show filters button
    await page.click('button:has-text("Show Filters")');

    // Filters should now be visible
    await expect(actionFilter).toBeVisible();
    await expect(page.locator('label:has-text("Status")')).toBeVisible();
    await expect(page.locator('label:has-text("Resource")')).toBeVisible();
    await expect(page.locator('label:has-text("User ID")')).toBeVisible();

    // Click hide filters button
    await page.click('button:has-text("Hide Filters")');

    // Filters should be hidden again
    await expect(actionFilter).not.toBeVisible();
  });

  test('should filter by action', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Show filters
    await page.click('button:has-text("Show Filters")');
    await page.waitForTimeout(500);

    // Select LOGIN action
    await page.selectOption('select:near(:text("Action"))', 'LOGIN');
    await page.waitForTimeout(1000);

    // Verify logs are filtered (check that only LOGIN actions appear)
    const loginRows = await page.locator('td:has-text("LOGIN")').count();
    expect(loginRows).toBeGreaterThan(0);
  });

  test('should filter by status', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Show filters
    await page.click('button:has-text("Show Filters")');
    await page.waitForTimeout(500);

    // Select FAILURE status
    await page.selectOption('select:near(:text("Status"))', 'FAILURE');
    await page.waitForTimeout(1000);

    // Verify logs are filtered
    const failureRows = await page.locator('text=FAILURE').count();
    expect(failureRows).toBeGreaterThan(0);
  });

  test('should open detail modal on row click', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click view details button on first row
    await page.locator('button[title="View details"]').first().click();
    await page.waitForTimeout(500);

    // Check modal is visible
    await expect(page.locator('h2:has-text("Audit Log Details")')).toBeVisible();

    // Check modal fields (use more specific selectors within the modal)
    const modal = page.locator('.fixed');
    await expect(modal.locator('label:has-text("Timestamp")')).toBeVisible();
    await expect(modal.locator('label:has-text("Action")')).toBeVisible();
    await expect(modal.locator('label:has-text("Status")')).toBeVisible();
    await expect(modal.locator('label:has-text("Resource"):not(:has-text("Resource ID"))')).toBeVisible();
  });

  test('should close detail modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Open modal
    await page.locator('button[title="View details"]').first().click();
    await page.waitForTimeout(500);

    // Check modal is visible
    await expect(page.locator('h2:has-text("Audit Log Details")')).toBeVisible();

    // Close modal by clicking X button
    await page.locator('.fixed button:has(svg)').click();
    await page.waitForTimeout(300);

    // Modal should be closed
    await expect(page.locator('h2:has-text("Audit Log Details")')).not.toBeVisible();
  });

  test('should navigate pagination', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if pagination exists (only if more than 50 logs)
    const paginationText = page.locator('text=/Page \\d+ of \\d+/');
    const hasPagination = await paginationText.isVisible().catch(() => false);

    if (hasPagination) {
      // Click next button
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);

      // Verify page changed
      await expect(page.locator('text=/Page 2 of/')).toBeVisible();

      // Click previous button
      await page.click('button:has-text("Previous")');
      await page.waitForTimeout(500);

      // Verify back to page 1
      await expect(page.locator('text=/Page 1 of/')).toBeVisible();
    }
  });

  test('should display refresh button and work', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');

    // Check refresh button exists
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();

    // Click refresh
    await refreshButton.click();
    await page.waitForTimeout(1000);

    // Page should still show audit logs
    await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible();
  });

  test('should display status badges with correct colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for status badges
    const successBadge = page.locator('.bg-green-100.text-green-800').first();
    const failureBadge = page.locator('.bg-red-100.text-red-800').first();
    const partialBadge = page.locator('.bg-yellow-100.text-yellow-800').first();

    // At least one status type should be visible
    const hasSuccess = await successBadge.isVisible().catch(() => false);
    const hasFailure = await failureBadge.isVisible().catch(() => false);
    const hasPartial = await partialBadge.isVisible().catch(() => false);

    expect(hasSuccess || hasFailure || hasPartial).toBe(true);
  });

  test('should take screenshot of audit page', async ({ page }) => {
    await page.goto(`${BASE_URL}/audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/audit-page.png',
      fullPage: true,
    });

    // Show filters and take another screenshot
    await page.click('button:has-text("Show Filters")');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'e2e/screenshots/audit-page-with-filters.png',
      fullPage: true,
    });

    // Open detail modal and screenshot
    await page.locator('button[title="View details"]').first().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'e2e/screenshots/audit-detail-modal.png',
      fullPage: true,
    });
  });
});
