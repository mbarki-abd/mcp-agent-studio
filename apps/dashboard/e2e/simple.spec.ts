import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/MCP/i);
});

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');

  // Should see the login form
  await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('can login with test user', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect away from login
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
});

test('dashboard loads after login', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });

  // Dashboard should show key elements
  await expect(page.getByText(/MCP Agent Studio/i).first()).toBeVisible({ timeout: 10000 });
});

test('servers page is accessible', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });

  // Navigate to servers
  await page.goto('/servers');
  await expect(page.getByText(/Server/i).first()).toBeVisible({ timeout: 10000 });
});
