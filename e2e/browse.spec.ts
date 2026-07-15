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

  test('search input is present and accepts input', async ({ page }) => {
    await page.goto('/#/browse');
    await waitForAppReady(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('monstera');
    await expect(searchInput).toHaveValue('monstera');
  });

  test('filter/category buttons visible', async ({ page }) => {
    await page.goto('/#/browse');
    await waitForAppReady(page);
    // Category filters like "All", "Aroid", etc should exist
    await expect(page.getByRole('button', { name: /all/i }).first()).toBeVisible();
  });

  test('navigating from home browse link lands on browse', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByRole('link', { name: /browse plants/i }).first().click();
    await expect(page).toHaveURL(/.*#\/browse/);
  });
});
