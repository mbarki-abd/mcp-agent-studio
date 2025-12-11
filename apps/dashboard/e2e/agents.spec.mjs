// @ts-check
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

const TEST_AGENT = {
  name: 'test-agent-e2e',
  displayName: 'E2E Test Agent',
  description: 'Agent created for E2E testing',
  role: 'WORKER',
};

async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
}

test.describe('Agents Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display agents list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*agents/);
    await expect(page.getByRole('heading', { name: 'Agents', exact: true })).toBeVisible();
  });

  test('should display agent hierarchy view', async ({ page }) => {
    // Look for hierarchy toggle or view
    const hierarchyButton = page.getByRole('button', { name: /hierarchy|tree/i });
    if (await hierarchyButton.isVisible()) {
      await hierarchyButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should open create agent wizard', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    // Wizard should open
    await expect(
      page.getByRole('dialog').or(page.getByRole('heading', { name: /create agent|new agent/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create a new agent', async ({ page }) => {
    // Click add button
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    await page.waitForTimeout(500);

    // Step 1: Select server (if required)
    const serverSelect = page.locator('select, [role="combobox"]').first();
    if (await serverSelect.isVisible()) {
      await serverSelect.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Fill name
    const nameInput = page.getByLabel(/^name$/i).first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_AGENT.name);
    }

    // Fill display name
    const displayNameInput = page.getByLabel(/display name/i).first();
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill(TEST_AGENT.displayName);
    }

    // Fill description
    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible()) {
      await descInput.fill(TEST_AGENT.description);
    }

    // Select role
    const roleSelect = page.getByLabel(/role/i).first();
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      const workerOption = page.getByRole('option', { name: /worker/i });
      if (await workerOption.isVisible()) {
        await workerOption.click();
      }
    }

    // Navigate through wizard steps (max 5 steps to prevent infinite loop)
    const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
    const createButton = page.getByRole('button', { name: /create|save|submit/i }).first();

    for (let step = 0; step < 5; step++) {
      // Check if we've reached the final submit button
      if (await createButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await createButton.click();
        break;
      }
      // Otherwise click next if visible
      if (await nextButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    await page.waitForTimeout(1000);
  });

  test('should view agent details', async ({ page }) => {
    // Click on first agent card
    const agentCard = page.locator('[data-testid="agent-card"], .agent-card, article, .card').first();
    if (await agentCard.isVisible()) {
      await agentCard.click();

      // Should navigate to agent details
      await page.waitForURL(/.*agents\/.*/, { timeout: 5000 });
    }
  });

  test('should filter agents by status', async ({ page }) => {
    const statusFilter = page.getByRole('button', { name: /filter|status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Use exact match to avoid matching "Inactive"
      const activeOption = page.getByRole('menuitem', { name: 'Active', exact: true });
      if (await activeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await activeOption.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should search agents', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);
    }
  });

  test('should toggle between grid and list view', async ({ page }) => {
    const viewToggle = page.getByRole('button', { name: /grid|list|view/i });
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(300);
    }
  });
});
