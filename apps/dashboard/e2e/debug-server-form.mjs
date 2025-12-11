import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

const TEST_USER = {
  email: 'mbarki@ilinqsoft.com',
  password: 'P@55lin@',
};

async function debugServerForm() {
  console.log('🔍 Debugging Server Form...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Collect console messages
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));

  try {
    // Step 1: Login
    console.log('1. Going to base URL...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/debug-01-initial.png' });

    // Check for login form
    const loginForm = await page.locator('form').isVisible().catch(() => false);
    if (loginForm) {
      console.log('2. Logging in...');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'e2e/screenshots/debug-02-after-login.png' });
    console.log(`   Current URL after login: ${page.url()}`);

    // Step 2: Navigate to servers
    console.log('3. Navigating to /servers...');
    await page.goto(`${BASE_URL}/servers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/debug-03-servers-list.png' });
    console.log(`   Current URL: ${page.url()}`);

    // Step 3: Navigate to create server
    console.log('4. Navigating to /servers/new...');
    await page.goto(`${BASE_URL}/servers/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/debug-04-servers-new.png' });
    console.log(`   Current URL: ${page.url()}`);

    // Check page content
    const pageContent = await page.content();
    console.log(`   Page title: ${await page.title()}`);

    // Check for specific elements
    const hasNameInput = await page.locator('input[id="name"]').isVisible().catch(() => false);
    const hasForm = await page.locator('form').isVisible().catch(() => false);
    const hasAddServerText = await page.locator('text=Add Server').isVisible().catch(() => false);
    const hasAccessDenied = await page.locator('text=Access Denied').isVisible().catch(() => false);

    console.log(`   Has form: ${hasForm}`);
    console.log(`   Has name input: ${hasNameInput}`);
    console.log(`   Has 'Add Server' text: ${hasAddServerText}`);
    console.log(`   Has 'Access Denied': ${hasAccessDenied}`);

    // List all visible inputs
    const inputs = await page.locator('input').all();
    console.log(`   Visible inputs: ${inputs.length}`);
    for (let i = 0; i < inputs.length; i++) {
      const id = await inputs[i].getAttribute('id');
      const name = await inputs[i].getAttribute('name');
      const type = await inputs[i].getAttribute('type');
      const visible = await inputs[i].isVisible();
      console.log(`     - ${i + 1}: id="${id}" name="${name}" type="${type}" visible=${visible}`);
    }

    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`   Has token in localStorage: ${!!token}`);

    // Check the ability context
    const userAbility = await page.evaluate(() => {
      // @ts-ignore
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values()?.next()?.value;
    }).catch(() => null);
    console.log(`   React DevTools available: ${!!userAbility}`);

    // Final pause
    console.log('\n⏸️  Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'e2e/screenshots/debug-error.png' });
  } finally {
    await browser.close();
  }
}

debugServerForm();
