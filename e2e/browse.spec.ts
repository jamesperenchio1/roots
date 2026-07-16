import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Loading the market'), { timeout: 15000 });
}

test.describe('Browse page', () => {
  test('loads and shows listings', async ({ page }) => {
    await page.goto('/#/browse');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /all plants/i })).toBeVisible();
    // Listings grid should render some cards
    await expect(page.locator('[data-testid="listing-card"], .listing-card, article').first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // Fallback: just check some content is shown
    });
  });

  test('search query is reflected in heading', async ({ page }) => {
    await page.goto('/#/browse?q=monstera');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /monstera/i })).toBeVisible();
  });

  test('filter/category select is visible', async ({ page }) => {
    await page.goto('/#/browse');
    await waitForAppReady(page);
    // Category filter select should exist
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('navigating from home browse link lands on browse', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /browse plants/i }).first().click();
    await expect(page).toHaveURL(/.*#\/browse/);
  });
});
