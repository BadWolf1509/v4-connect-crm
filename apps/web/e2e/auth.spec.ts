import { expect, test } from '@playwright/test';

// Auth tests run without storage state (no-auth project)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check for login form elements
      await expect(page.getByRole('heading', { name: /login|entrar/i })).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /login|entrar|sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Get the email input
      const emailInput = page.locator('input[name="email"]');

      // Submit empty form - HTML5 validation should prevent submission
      await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

      // Check that the email input is invalid (HTML5 validation)
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with invalid credentials
      await page.locator('input[name="email"]').fill('invalid@example.com');
      await page.locator('input[name="password"]').fill('wrongpassword');
      await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/inválido|invalid|incorreto|incorrect/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test('should have link to register page', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', {
        name: /cadastr|register|sign up|criar conta/i,
      });
      await expect(registerLink).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with valid credentials
      await page.locator('input[name="email"]').fill('admin@v4connect.com');
      await page.locator('input[name="password"]').fill('password123');
      await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

      // Should redirect to dashboard/inbox
      await expect(page).toHaveURL(/\/(inbox|overview|dashboard)/, { timeout: 15000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/overview');

      // Should be redirected to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing inbox without auth', async ({ page }) => {
      await page.goto('/inbox');

      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing CRM without auth', async ({ page }) => {
      await page.goto('/crm');

      await expect(page).toHaveURL(/login/);
    });
  });
});
