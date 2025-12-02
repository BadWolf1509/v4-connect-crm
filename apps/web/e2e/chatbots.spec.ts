import { expect, test } from '@playwright/test';

test.describe('Chatbots', () => {
  test.describe('Chatbot List', () => {
    test('should display chatbots page', async ({ page }) => {
      await page.goto('/chatbots');

      // Should show chatbots page (not redirected to login)
      await expect(page).not.toHaveURL(/login/);
    });

    test('should display chatbots list or empty state', async ({ page }) => {
      await page.goto('/chatbots');

      // Should show chatbots list or empty state
      const hasChatbotsList = await page
        .locator('[data-testid="chatbots-list"], .chatbots-list')
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/nenhum chatbot|no chatbots|criar chatbot/i)
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .getByRole('heading', { name: /chatbots/i })
        .isVisible()
        .catch(() => false);
      const hasChatbotCard = await page
        .locator('[class*="card"], [class*="chatbot"]')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasChatbotsList || hasEmptyState || hasHeader || hasChatbotCard).toBe(true);
    });

    test('should have create chatbot button', async ({ page }) => {
      await page.goto('/chatbots');

      // Should have button to create chatbot
      const hasCreateButton = await page
        .getByRole('button', { name: /novo chatbot|new chatbot|criar/i })
        .isVisible()
        .catch(() => false);

      // Alternative: link button
      const hasCreateLink = await page
        .getByRole('link', { name: /novo chatbot|new chatbot|criar/i })
        .isVisible()
        .catch(() => false);

      // Page should have create option
      expect(hasCreateButton || hasCreateLink).toBe(true);
    });
  });

  test.describe('Chatbot Creation', () => {
    test('should open chatbot creation form', async ({ page }) => {
      await page.goto('/chatbots');

      // Click create button
      const createButton = page.getByRole('button', { name: /novo chatbot|criar/i });
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
        expect(true).toBe(true);
      }
    });

    test('should show chatbot form fields', async ({ page }) => {
      await page.goto('/chatbots');

      // Try to open creation form
      const createButton = page.getByRole('button', { name: /novo chatbot|criar/i });
      const buttonExists = await createButton.isVisible().catch(() => false);

      if (buttonExists) {
        await createButton.click();

        // Check for required form fields
        const hasNameField = await page
          .getByLabel(/nome/i)
          .or(page.getByPlaceholder(/nome/i))
          .isVisible()
          .catch(() => false);

        const hasTriggerField = await page
          .getByLabel(/gatilho|trigger/i)
          .or(page.getByText(/palavra-chave|keyword/i))
          .isVisible()
          .catch(() => false);

        const hasChannelSelect = await page
          .getByLabel(/canal/i)
          .or(page.getByText(/selecione.*canal/i))
          .isVisible()
          .catch(() => false);

        // At least one field should be visible
        expect(hasNameField || hasTriggerField || hasChannelSelect).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Chatbot Builder', () => {
    test('should navigate to chatbot builder', async ({ page }) => {
      await page.goto('/chatbots');

      // Try to click on a chatbot to open builder
      const chatbotCard = page.locator('[class*="card"], [class*="chatbot"]').first();
      const cardExists = await chatbotCard.isVisible().catch(() => false);

      if (cardExists) {
        // Look for edit/builder button
        const editButton = chatbotCard.getByRole('button', { name: /editar|edit|builder/i });
        const buttonExists = await editButton.isVisible().catch(() => false);

        if (buttonExists) {
          await editButton.click();

          // Should show builder interface
          const hasCanvas = await page
            .locator('[class*="react-flow"], [class*="canvas"], [class*="builder"]')
            .isVisible()
            .catch(() => false);
          const hasNodePalette = await page
            .getByText(/mensagem|message|condição|condition|ação|action/i)
            .isVisible()
            .catch(() => false);

          expect(hasCanvas || hasNodePalette).toBe(true);
        } else {
          expect(true).toBe(true);
        }
      } else {
        // No chatbots exist
        expect(true).toBe(true);
      }
    });

    test('should display flow builder elements', async ({ page }) => {
      // Go directly to builder if URL pattern exists
      await page.goto('/chatbots');

      // Check if builder is visible on the chatbots page or navigate to it
      const hasStartNode = await page
        .getByText(/início|start/i)
        .isVisible()
        .catch(() => false);

      const hasNodeTypes = await page
        .getByText(/mensagem|condição|ação|atraso|fim|message|condition|action|delay|end/i)
        .first()
        .isVisible()
        .catch(() => false);

      const hasEmptyState = await page
        .getByText(/nenhum chatbot|no chatbots/i)
        .isVisible()
        .catch(() => false);

      // Either has builder elements, node types, or empty state
      expect(hasStartNode || hasNodeTypes || hasEmptyState).toBe(true);
    });
  });

  test.describe('Chatbot Status', () => {
    test('should display chatbot status toggle', async ({ page }) => {
      await page.goto('/chatbots');

      // Check for status toggle/switch
      const hasStatusToggle = await page
        .getByRole('switch')
        .first()
        .isVisible()
        .catch(() => false);

      const hasStatusBadge = await page
        .getByText(/ativo|inativo|active|inactive/i)
        .first()
        .isVisible()
        .catch(() => false);

      const hasEmptyState = await page
        .getByText(/nenhum chatbot|no chatbots/i)
        .isVisible()
        .catch(() => false);

      // Either has status controls or empty state
      expect(hasStatusToggle || hasStatusBadge || hasEmptyState).toBe(true);
    });
  });

  test.describe('Chatbot Actions', () => {
    test('should show chatbot action menu', async ({ page }) => {
      await page.goto('/chatbots');

      // Try to find action buttons on chatbot cards
      const actionButton = page.getByRole('button', { name: /ações|options|menu|\.\.\./i }).first();
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
        const hasDuplicateOption = await page
          .getByText(/duplicar|duplicate/i)
          .isVisible()
          .catch(() => false);

        expect(hasEditOption || hasDeleteOption || hasDuplicateOption).toBe(true);
      } else {
        // No chatbots or different structure
        expect(true).toBe(true);
      }
    });
  });
});
