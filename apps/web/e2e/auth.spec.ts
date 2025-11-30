import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check for login form elements
      await expect(page.getByRole('heading', { name: /login|entrar/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/senha|password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login|entrar|sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email.*obrigatório|email.*required/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/senha|password/i).fill('wrongpassword');
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

  test.describe('Logout', () => {
    test.skip('should logout and redirect to login', async () => {
      // This test requires authentication setup
      // Skip for now - implement when auth fixtures are ready
    });
  });
});
