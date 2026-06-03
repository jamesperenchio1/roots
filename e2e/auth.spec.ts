import { test, expect } from '@playwright/test';

async function waitForAppReady(page: any) {
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading the market');
  }, { timeout: 15000 });
}

test.describe('Auth pages', () => {
  test('signup page loads', async ({ page }) => {
    await page.goto('/#/signup');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/#/login');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('can fill signup form without submitting', async ({ page }) => {
    await page.goto('/#/signup');
    await waitForAppReady(page);

    await page.getByLabel(/display name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByPlaceholder(/08xxxxxxxx/i).fill('0812345678');
    await page.getByPlaceholder(/bangkok/i).fill('Bangkok');

    // Verify values are entered correctly without submitting
    await expect(page.getByLabel(/display name/i)).toHaveValue('Test User');
    await expect(page.getByLabel(/email/i)).toHaveValue('test@example.com');
    await expect(page.getByLabel(/password/i)).toHaveValue('password123');
    await expect(page.getByPlaceholder(/08xxxxxxxx/i)).toHaveValue('0812345678');
    await expect(page.getByPlaceholder(/bangkok/i)).toHaveValue('Bangkok');
  });
});
