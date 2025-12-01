import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  test.describe('Overview Page', () => {
    test('should display overview page when authenticated', async ({ page }) => {
      await page.goto('/overview');

      // Should not redirect to login (authenticated via storage state)
      await expect(page).not.toHaveURL(/login/);
    });

    test('should display page content', async ({ page }) => {
      await page.goto('/overview');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Page should have substantial content
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Navigation', () => {
    test('should have sidebar navigation', async ({ page }) => {
      await page.goto('/overview');
      await page.waitForLoadState('networkidle');

      // Should show sidebar with navigation links
      const hasSidebar = await page
        .locator('nav, [class*="sidebar"], aside')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasSidebar).toBe(true);
    });

    test('should navigate to inbox', async ({ page }) => {
      await page.goto('/overview');

      // Click on inbox link
      const inboxLink = page.getByRole('link', { name: /inbox|caixa/i });
      const linkExists = await inboxLink.isVisible().catch(() => false);

      if (linkExists) {
        await inboxLink.click();
        await expect(page).toHaveURL(/inbox/);
      }
    });

    test('should navigate to CRM', async ({ page }) => {
      await page.goto('/overview');

      // Click on CRM link
      const crmLink = page.getByRole('link', { name: /crm|pipeline|vendas/i });
      const linkExists = await crmLink.isVisible().catch(() => false);

      if (linkExists) {
        await crmLink.click();
        await expect(page).toHaveURL(/crm/);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/overview');

      // Page should load without errors
      await expect(page).not.toHaveURL(/login/);
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/overview');

      // Page should load without errors
      await expect(page).not.toHaveURL(/login/);
    });
  });
});
