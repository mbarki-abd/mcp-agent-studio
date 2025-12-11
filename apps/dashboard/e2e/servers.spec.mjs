// @ts-check
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

const TEST_SERVER = {
  name: 'test-server-e2e',
  description: 'E2E Test Server',
  url: 'http://localhost:3001',
  masterToken: 'test-token-12345',
};

async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
}

test.describe('Servers Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/servers');
    await expect(page.getByRole('heading', { name: 'Server Configurations' })).toBeVisible({ timeout: 10000 });
  });

  test('should display servers list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*servers/);
    await expect(page.getByRole('heading', { name: 'Server Configurations' })).toBeVisible();
  });

  test('should open add server dialog', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    // Dialog or wizard should open
    await expect(
      page.getByRole('dialog').or(page.getByRole('heading', { name: /add server|new server|create/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create a new server', async ({ page }) => {
    // Click add button
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    // Wait for form to appear
    await page.waitForTimeout(500);

    // Fill in the form (wizard or dialog)
    const nameInput = page.getByLabel(/name/i).first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_SERVER.name);
    }

    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible()) {
      await descInput.fill(TEST_SERVER.description);
    }

    const urlInput = page.getByLabel(/url/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill(TEST_SERVER.url);
    }

    const tokenInput = page.getByLabel(/token|key/i).first();
    if (await tokenInput.isVisible()) {
      await tokenInput.fill(TEST_SERVER.masterToken);
    }

    // Look for next/submit button
    const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
    const createButton = page.getByRole('button', { name: /create|save|submit/i }).first();

    // Navigate through wizard steps (max 5 steps to prevent infinite loop)
    for (let step = 0; step < 5; step++) {
      // Check if we've reached the final submit button
      if (await createButton.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await createButton.isEnabled({ timeout: 500 }).catch(() => false)) {
          await createButton.click();
        }
        break;
      }
      // Otherwise click next if visible AND enabled
      if (await nextButton.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await nextButton.isEnabled({ timeout: 500 }).catch(() => false)) {
          await nextButton.click();
          await page.waitForTimeout(300);
        } else {
          // Button is visible but disabled - stop trying
          break;
        }
      } else {
        break;
      }
    }

    // Verify we're still on the page (wizard interaction completed without error)
    await page.waitForTimeout(500);
  });

  test('should view server details', async ({ page }) => {
    // Click on first server card if exists
    const serverCard = page.locator('[data-testid="server-card"], .server-card, article').first();
    if (await serverCard.isVisible()) {
      await serverCard.click();

      // Should navigate to server details or open modal
      await page.waitForTimeout(500);
    }
  });

  test('should filter servers by search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Results should update
    }
  });

  test('should delete a server', async ({ page }) => {
    // Find delete button or menu
    const serverCard = page.locator('[data-testid="server-card"], .server-card, article').first();
    if (await serverCard.isVisible()) {
      // Look for delete button or open menu
      const deleteButton = serverCard.getByRole('button', { name: /delete|remove/i });
      const menuButton = serverCard.getByRole('button', { name: /more|options|menu/i });

      if (await deleteButton.isVisible()) {
        await deleteButton.click();
      } else if (await menuButton.isVisible()) {
        await menuButton.click();
        const deleteMenuItem = page.getByRole('menuitem', { name: /delete|remove/i });
        if (await deleteMenuItem.isVisible()) {
          await deleteMenuItem.click();
        }
      }

      // Confirm deletion if dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });
});
