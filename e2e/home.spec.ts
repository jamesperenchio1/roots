import { test, expect } from '@playwright/test';

async function waitForAppReady(page: any) {
  // Wait for the BootGate loading screen to disappear
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading the market');
  }, { timeout: 15000 });
}

test.describe('Homepage', () => {
  test('loads and shows hero text', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.getByText('Buy plants.')).toBeVisible();
    await expect(page.getByText('Sell plants.')).toBeVisible();
    await expect(page.getByText('Simple.')).toBeVisible();
  });

  test('navigation to /browse works', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /browse plants/i }).first().click();
    await expect(page).toHaveURL(/.*#\/browse/);
    await expect(page.getByRole('heading', { name: /browse plants/i })).toBeVisible();
  });

  test('navigation to /market works', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /market prices/i }).first().click();
    await expect(page).toHaveURL(/.*#\/market/);
    await expect(page.getByRole('heading', { name: /market pulse/i })).toBeVisible();
  });
});
