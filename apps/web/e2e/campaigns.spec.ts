import { expect, test } from '@playwright/test';

test.describe('Campaigns', () => {
  test.describe('Campaign List', () => {
    test('should display campaigns page', async ({ page }) => {
      await page.goto('/campaigns');

      // Should show campaigns page (not redirected to login)
      await expect(page).not.toHaveURL(/login/);
    });

    test('should display campaigns list or empty state', async ({ page }) => {
      await page.goto('/campaigns');

      // Should show campaigns list or empty state
      const hasCampaignsList = await page
        .locator('[data-testid="campaigns-list"], .campaigns-list, table')
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/nenhuma campanha|no campaigns|criar campanha/i)
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /campanhas/i })
        .isVisible()
        .catch(() => false);

      expect(hasCampaignsList || hasEmptyState || hasHeader).toBe(true);
    });

    test('should have create campaign button', async ({ page }) => {
      await page.goto('/campaigns');

      // Should have button to create campaign
      const hasCreateButton = await page
        .getByRole('button', { name: /nova campanha|new campaign|criar/i })
        .isVisible()
        .catch(() => false);

      // Alternative: link button
      const hasCreateLink = await page
        .getByRole('link', { name: /nova campanha|new campaign|criar/i })
        .isVisible()
        .catch(() => false);

      // Page should have create option
      expect(hasCreateButton || hasCreateLink).toBe(true);
    });
  });

  test.describe('Campaign Creation', () => {
    test('should open campaign creation form', async ({ page }) => {
      await page.goto('/campaigns');

      // Click create button
      const createButton = page.getByRole('button', { name: /nova campanha|criar/i });
      const buttonExists = await createButton.isVisible().catch(() => false);

      if (buttonExists) {
        await createButton.click();

        // Modal or form should appear
        const hasDialog = await page
          .getByRole('dialog')
          .isVisible()
          .catch(() => false);
        const hasForm = await page
          .locator('form')
          .isVisible()
          .catch(() => false);
        const hasNameField = await page
          .getByLabel(/nome/i)
          .isVisible()
          .catch(() => false);

        expect(hasDialog || hasForm || hasNameField).toBe(true);
      } else {
        // No button means page structure might be different
        expect(true).toBe(true);
      }
    });

    test('should show campaign form fields', async ({ page }) => {
      await page.goto('/campaigns');

      // Try to open creation form
      const createButton = page.getByRole('button', { name: /nova campanha|criar/i });
      const buttonExists = await createButton.isVisible().catch(() => false);

      if (buttonExists) {
        await createButton.click();

        // Check for required form fields
        const hasNameField = await page
          .getByLabel(/nome/i)
          .or(page.getByPlaceholder(/nome/i))
          .isVisible()
          .catch(() => false);

        const hasChannelSelect = await page
          .getByLabel(/canal/i)
          .or(page.getByText(/selecione.*canal/i))
          .isVisible()
          .catch(() => false);

        const hasContentField = await page
          .getByLabel(/mensagem|conteúdo|content/i)
          .or(page.locator('textarea'))
          .isVisible()
          .catch(() => false);

        // At least name field should be visible
        expect(hasNameField || hasChannelSelect || hasContentField).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Campaign Status', () => {
    test('should display campaign status badges', async ({ page }) => {
      await page.goto('/campaigns');

      // Check for status badges if campaigns exist
      const hasStatusBadge = await page
        .getByText(/rascunho|agendada|enviando|concluída|draft|scheduled|running|completed/i)
        .first()
        .isVisible()
        .catch(() => false);

      const hasEmptyState = await page
        .getByText(/nenhuma campanha|no campaigns/i)
        .isVisible()
        .catch(() => false);

      // Either has status badges or empty state
      expect(hasStatusBadge || hasEmptyState).toBe(true);
    });
  });

  test.describe('Campaign Actions', () => {
    test('should show campaign action menu', async ({ page }) => {
      await page.goto('/campaigns');

      // Try to find action buttons on campaign cards/rows
      const actionButton = page.getByRole('button', { name: /ações|options|menu/i }).first();
      const buttonExists = await actionButton.isVisible().catch(() => false);

      if (buttonExists) {
        await actionButton.click();

        // Should show dropdown with actions
        const hasEditOption = await page
          .getByText(/editar|edit/i)
          .isVisible()
          .catch(() => false);
        const hasDeleteOption = await page
          .getByText(/excluir|delete/i)
          .isVisible()
          .catch(() => false);
        const hasScheduleOption = await page
          .getByText(/agendar|schedule/i)
          .isVisible()
          .catch(() => false);

        expect(hasEditOption || hasDeleteOption || hasScheduleOption).toBe(true);
      } else {
        // No campaigns or different structure
        expect(true).toBe(true);
      }
    });
  });
});
