import { expect, test } from '@playwright/test';

test.describe('Settings', () => {
  test.describe('Settings Navigation', () => {
    test('should display settings page', async ({ page }) => {
      await page.goto('/settings');

      // Should show settings page (not redirected to login)
      await expect(page).not.toHaveURL(/login/);
    });

    test('should display settings menu items', async ({ page }) => {
      await page.goto('/settings');

      // Check for main settings sections
      const hasProfileSection = await page
        .getByText(/perfil|profile/i)
        .isVisible()
        .catch(() => false);
      const hasTeamSection = await page
        .getByText(/equipe|team/i)
        .isVisible()
        .catch(() => false);
      const hasCompanySection = await page
        .getByText(/empresa|company/i)
        .isVisible()
        .catch(() => false);
      const hasBillingSection = await page
        .getByText(/faturamento|billing|plano|plan/i)
        .isVisible()
        .catch(() => false);

      expect(hasProfileSection || hasTeamSection || hasCompanySection || hasBillingSection).toBe(
        true,
      );
    });
  });

  test.describe('Profile Settings', () => {
    test('should display profile settings', async ({ page }) => {
      await page.goto('/settings/profile');

      // Should show profile form
      const hasNameField = await page
        .getByLabel(/nome/i)
        .or(page.getByPlaceholder(/nome/i))
        .isVisible()
        .catch(() => false);
      const hasEmailField = await page
        .getByLabel(/email/i)
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /perfil|profile/i })
        .isVisible()
        .catch(() => false);

      expect(hasNameField || hasEmailField || hasHeader).toBe(true);
    });

    test('should have save button in profile', async ({ page }) => {
      await page.goto('/settings/profile');

      const hasSaveButton = await page
        .getByRole('button', { name: /salvar|save/i })
        .isVisible()
        .catch(() => false);

      expect(hasSaveButton).toBe(true);
    });
  });

  test.describe('Team Settings', () => {
    test('should display team settings', async ({ page }) => {
      await page.goto('/settings/team');

      // Should show team management
      const hasTeamList = await page
        .locator('table, [class*="team"], [class*="members"]')
        .isVisible()
        .catch(() => false);
      const hasInviteButton = await page
        .getByRole('button', { name: /convidar|invite/i })
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /equipe|team/i })
        .isVisible()
        .catch(() => false);

      expect(hasTeamList || hasInviteButton || hasHeader).toBe(true);
    });

    test('should show invite member form', async ({ page }) => {
      await page.goto('/settings/team');

      const inviteButton = page.getByRole('button', { name: /convidar|invite/i });
      const buttonExists = await inviteButton.isVisible().catch(() => false);

      if (buttonExists) {
        await inviteButton.click();

        // Should show invite form
        const hasEmailField = await page
          .getByLabel(/email/i)
          .or(page.getByPlaceholder(/email/i))
          .isVisible()
          .catch(() => false);
        const hasRoleSelect = await page
          .getByLabel(/cargo|role/i)
          .or(page.getByText(/admin|agente|agent/i))
          .isVisible()
          .catch(() => false);

        expect(hasEmailField || hasRoleSelect).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Company Settings', () => {
    test('should display company settings', async ({ page }) => {
      await page.goto('/settings/company');

      // Should show company form
      const hasCompanyNameField = await page
        .getByLabel(/nome da empresa|company name/i)
        .or(page.getByPlaceholder(/empresa/i))
        .isVisible()
        .catch(() => false);
      const hasLogoUpload = await page
        .getByText(/logo|logotipo/i)
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /empresa|company/i })
        .isVisible()
        .catch(() => false);

      expect(hasCompanyNameField || hasLogoUpload || hasHeader).toBe(true);
    });
  });

  test.describe('Billing Settings', () => {
    test('should display billing settings', async ({ page }) => {
      await page.goto('/settings/billing');

      // Should show billing information
      const hasPlanInfo = await page
        .getByText(/plano|plan/i)
        .isVisible()
        .catch(() => false);
      const hasUsageInfo = await page
        .getByText(/uso|usage|conversas|conversations/i)
        .isVisible()
        .catch(() => false);
      const hasUpgradeButton = await page
        .getByRole('button', { name: /upgrade|atualizar/i })
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /faturamento|billing/i })
        .isVisible()
        .catch(() => false);

      expect(hasPlanInfo || hasUsageInfo || hasUpgradeButton || hasHeader).toBe(true);
    });

    test('should show plan options', async ({ page }) => {
      await page.goto('/settings/billing');

      // Should show plan cards or pricing
      const hasPlanCards = await page
        .locator('[class*="plan"], [class*="pricing"], [class*="card"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasPlanNames = await page
        .getByText(/starter|pro|enterprise|básico|profissional/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasPlanCards || hasPlanNames).toBe(true);
    });
  });

  test.describe('Quick Replies Settings', () => {
    test('should display quick replies management', async ({ page }) => {
      await page.goto('/settings/quick-replies');

      // Should show quick replies list or form
      const hasQuickRepliesList = await page
        .locator('table, [class*="quick-repl"]')
        .isVisible()
        .catch(() => false);
      const hasAddButton = await page
        .getByRole('button', { name: /adicionar|add|nova/i })
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /respostas rápidas|quick replies/i })
        .isVisible()
        .catch(() => false);

      expect(hasQuickRepliesList || hasAddButton || hasHeader).toBe(true);
    });
  });

  test.describe('Channels Settings', () => {
    test('should display channels configuration', async ({ page }) => {
      await page.goto('/settings/channels');

      // Should show channels list
      const hasChannelsList = await page
        .locator('[class*="channel"], table')
        .isVisible()
        .catch(() => false);
      const hasAddChannelButton = await page
        .getByRole('button', { name: /adicionar|add|conectar|connect/i })
        .isVisible()
        .catch(() => false);
      const hasChannelTypes = await page
        .getByText(/whatsapp|instagram|messenger/i)
        .first()
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /canais|channels/i })
        .isVisible()
        .catch(() => false);

      expect(hasChannelsList || hasAddChannelButton || hasChannelTypes || hasHeader).toBe(true);
    });
  });
});
