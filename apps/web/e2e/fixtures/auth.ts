import { type Page, test as base } from '@playwright/test';

/**
 * Authentication fixtures for E2E tests
 *
 * This file provides test fixtures for authenticated user testing.
 * Configure proper authentication before running authenticated tests.
 */

// Test user credentials - use environment variables in production
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

/**
 * Login helper function
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');

  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/senha|password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /login|entrar|sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/overview|dashboard|inbox/);
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sair|logout|sign out/i }).click();
  await page.waitForURL(/login/);
}

/**
 * Extended test with authentication
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await login(page);

    // Use authenticated page
    await use(page);

    // Logout after test (optional, depends on test isolation needs)
    // await logout(page);
  },
});

/**
 * Storage state file path for session persistence
 */
export const STORAGE_STATE = 'playwright/.auth/user.json';

/**
 * Setup global authentication state
 * Run this as a setup project in playwright.config.ts
 */
export async function globalSetup(page: Page): Promise<void> {
  await login(page);

  // Save authentication state
  await page.context().storageState({ path: STORAGE_STATE });
}

export { expect } from '@playwright/test';
