import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Loading the market'), { timeout: 15000 });
}

test.describe('Navigation', () => {
  test('navbar is visible on homepage', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.locator('nav')).toBeVisible();
    // ROOTS logo link
    await expect(page.getByRole('link', { name: /ROOTS/i }).first()).toBeVisible();
  });

  test('market link goes to market page', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /market/i }).first().click();
    await expect(page).toHaveURL(/.*#\/market/);
    await expect(page.getByRole('heading', { name: /market overview/i })).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/#/about');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/.*#\/about/);
    // Should have some content
    await expect(page.locator('main, [role="main"], .about-page, h1, h2').first()).toBeVisible();
  });

  test('not found page shown for unknown route', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist-12345');
    await waitForAppReady(page);
    // Should show some kind of not found content
    await expect(page.getByText(/404|not found|page not found/i)).toBeVisible();
  });

  test('anonymous users redirected from protected dashboard to login', async ({ page }) => {
    await page.goto('/#/dashboard');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/.*#\/login/);
  });

  test('login page has login and signup links', async ({ page }) => {
    await page.goto('/#/login');
    await waitForAppReady(page);
    await expect(page.getByRole('link', { name: /sign up|create account/i })).toBeVisible();
  });

  test('signup page has login link', async ({ page }) => {
    await page.goto('/#/signup');
    await waitForAppReady(page);
    await expect(page.getByRole('link', { name: /log in|sign in/i })).toBeVisible();
  });

  test('QR scanner page loads for anonymous users', async ({ page }) => {
    await page.goto('/#/scan');
    await waitForAppReady(page);
    // Page should load (scanner may require camera permission but page itself renders)
    await expect(page).toHaveURL(/.*#\/scan/);
  });
});
