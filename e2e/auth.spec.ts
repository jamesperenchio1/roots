import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading the market');
  }, { timeout: 15000 });
}

test.describe('Auth pages', () => {
  test('signup page loads', async ({ page }) => {
    await page.goto('/#/signup');
    await waitForAppReady(page);
    await expect(page.locator('h1')).toHaveText(/create your account/i);
    await expect(page.getByPlaceholder(/display name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/min 6 characters/i)).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/#/login');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  });

  test('can fill signup form without submitting', async ({ page }) => {
    await page.goto('/#/signup');
    await waitForAppReady(page);

    await page.getByPlaceholder(/display name/i).fill('Test User');
    await page.getByPlaceholder(/you@example.com/i).fill('test@example.com');
    await page.getByPlaceholder(/min 6 characters/i).fill('password123');
    await page.getByPlaceholder(/08xxxxxxxx/i).fill('0812345678');
    await page.getByPlaceholder(/province/i).fill('Bangkok');

    // Verify values are entered correctly without submitting
    await expect(page.getByPlaceholder(/display name/i)).toHaveValue('Test User');
    await expect(page.getByPlaceholder(/you@example.com/i)).toHaveValue('test@example.com');
    await expect(page.getByPlaceholder(/min 6 characters/i)).toHaveValue('password123');
    await expect(page.getByPlaceholder(/08xxxxxxxx/i)).toHaveValue('0812345678');
    await expect(page.getByPlaceholder(/province/i)).toHaveValue('Bangkok');
  });
});
