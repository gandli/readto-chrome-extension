import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4321/readto-chrome-extension';

test.describe('Readto Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/readto/);
  });

  test('should have hero section', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Read to know');
  });

  test('should have level selector', async ({ page }) => {
    const labels = page.locator('.slider-label');
    await expect(labels).toHaveCount(5);
  });

  test('should show tooltip on click', async ({ page }) => {
    const tooltip = page.locator('#tooltip');
    await page.locator('[data-word="sweeping"]').first().click();
    await expect(tooltip).toHaveClass(/show/);
  });
});

test.describe('Privacy Page', () => {
  test('should load privacy page', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Privacy/);
  });
});
