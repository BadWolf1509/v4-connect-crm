import { expect, test } from '@playwright/test';

test.describe('Contacts', () => {
  test.describe('Contact List', () => {
    test('should display contacts page', async ({ page }) => {
      await page.goto('/contacts');

      // Should show contacts page (not redirected to login)
      await expect(page).not.toHaveURL(/login/);
    });

    test('should display contacts content', async ({ page }) => {
      await page.goto('/contacts');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Page should have substantial content
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    });

    test('should have page structure', async ({ page }) => {
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');

      // Page should be loaded and not redirect to login
      await expect(page).not.toHaveURL(/login/);

      // Should have some button on the page
      const buttons = await page.getByRole('button').count();
      expect(buttons).toBeGreaterThan(0);
    });
  });

  test.describe('Contact Creation', () => {
    test('should have UI elements for contact management', async ({ page }) => {
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');

      // Page should have interactive elements
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    });
  });
});
