import { test, expect } from '@playwright/test';

test('auth flow placeholder', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.locator('text=Sign In')).toBeVisible();
});
