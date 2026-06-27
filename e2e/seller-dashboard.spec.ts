import { test, expect, type Page } from '@playwright/test';

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading the market');
  }, { timeout: 15000 });
}

test.describe('Seller Dashboard', () => {
  test('redirects anonymous users to login with return url', async ({ page }) => {
    await page.goto('/#/seller-dashboard/listings');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/.*#\/login\?redirect=%2Fseller-dashboard%2Flistings/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
