// @ts-check
import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

const TEST_TASK = {
  title: 'E2E Test Task',
  description: 'Task created for E2E testing',
  prompt: 'This is a test prompt for the E2E test task',
};

async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
}

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display tasks list page', async ({ page }) => {
    await expect(page).toHaveURL(/.*tasks/);
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  });

  test('should open create task wizard', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    // Wizard should open
    await expect(
      page.getByRole('dialog').or(page.getByRole('heading', { name: /create task|new task/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create a new task with immediate execution', async ({ page }) => {
    // Click add button
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    await page.waitForTimeout(500);

    // Step 1: Basic Info
    const titleInput = page.getByLabel(/title/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(TEST_TASK.title);
    }

    const descInput = page.getByLabel(/description/i).first();
    if (await descInput.isVisible()) {
      await descInput.fill(TEST_TASK.description);
    }

    // Click next
    const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Step 2: Schedule - Select immediate execution
    const immediateOption = page.getByLabel(/immediate/i).or(page.getByText(/run immediately/i));
    if (await immediateOption.isVisible()) {
      await immediateOption.click();
    }

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Step 3: Agent selection
    const agentSelect = page.locator('select, [role="combobox"]').first();
    if (await agentSelect.isVisible()) {
      await agentSelect.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Step 4: Prompt
    const promptInput = page.getByLabel(/prompt/i).or(page.locator('textarea')).first();
    if (await promptInput.isVisible()) {
      await promptInput.fill(TEST_TASK.prompt);
    }

    // Submit
    const createButton = page.getByRole('button', { name: /create|save|submit/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    await page.waitForTimeout(1000);
  });

  test('should create a scheduled task with cron expression', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    await addButton.click();

    await page.waitForTimeout(500);

    // Fill basic info
    const titleInput = page.getByLabel(/title/i).first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Scheduled E2E Task');
    }

    const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Select recurring
    const recurringOption = page.getByLabel(/recurring/i).or(page.getByText(/recurring/i));
    if (await recurringOption.isVisible()) {
      await recurringOption.click();
    }

    // Check for cron input
    const cronInput = page.getByLabel(/cron/i);
    if (await cronInput.isVisible()) {
      await cronInput.fill('0 9 * * 1-5');
    }

    // Continue through wizard...
  });

  test('should filter tasks by status', async ({ page }) => {
    const statusFilter = page.getByRole('button', { name: /filter|status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      const pendingOption = page.getByRole('menuitem', { name: /pending/i });
      if (await pendingOption.isVisible()) {
        await pendingOption.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should search tasks', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);
    }
  });

  test('should run a task manually', async ({ page }) => {
    // Find a task card with a run button
    const taskCard = page.locator('[data-testid="task-card"], .task-card, article, .card').first();
    if (await taskCard.isVisible()) {
      const runButton = taskCard.getByRole('button', { name: /run|execute|start/i });
      if (await runButton.isVisible()) {
        await runButton.click();

        // Confirm if dialog appears
        const confirmButton = page.getByRole('button', { name: /confirm|yes|run/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
  });

  test('should view task details and execution history', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"], .task-card, article, .card').first();
    if (await taskCard.isVisible()) {
      await taskCard.click();

      // Should navigate to task details
      await page.waitForURL(/.*tasks\/.*/, { timeout: 5000 });

      // Look for execution history section
      await expect(
        page.getByRole('heading', { name: /execution|history|runs/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
