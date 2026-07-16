import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.waitForSelector('nav', { timeout: 15000 });
}

test.describe('Homepage', () => {
  test('loads and shows hero text', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.getByText(/Thailand's plant marketplace/i)).toBeVisible();
    await expect(page.getByText(/Browse Plants/i).first()).toBeVisible();
    await expect(page.getByText(/Start Selling/i).first()).toBeVisible();
  });

  test('navigation to /browse works', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /browse plants/i }).first().click();
    await expect(page).toHaveURL(/.*\/browse/);
    await expect(page.getByRole('heading', { name: /all plants/i })).toBeVisible();
  });

  test('navigation to /market works', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /market data/i }).first().click();
    await expect(page).toHaveURL(/.*\/market/);
    await expect(page.getByRole('heading', { name: /market overview/i })).toBeVisible();
  });
});
