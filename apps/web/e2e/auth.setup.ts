import { expect, test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Fill credentials
  await page.locator('input[name="email"]').fill('admin@v4connect.com');
  await page.locator('input[name="password"]').fill('password123');

  // Click login button
  await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

  // Wait for redirect to dashboard/inbox (successful login)
  await expect(page).toHaveURL(/\/(inbox|overview|dashboard)/, { timeout: 15000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
