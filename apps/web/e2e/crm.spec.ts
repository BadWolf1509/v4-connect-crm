import { expect, test } from '@playwright/test';

test.describe('CRM Pipeline', () => {
  test.describe('Access Control', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/crm');

      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Pipeline View (Authenticated)', () => {
    // These tests require authentication fixtures

    test.skip('should display pipeline board', async ({ page }) => {
      await page.goto('/crm');

      // Should show Kanban-style pipeline
      await expect(page.getByTestId('pipeline-board')).toBeVisible();
    });

    test.skip('should display pipeline stages', async ({ page }) => {
      await page.goto('/crm');

      // Default pipeline should have stages
      await expect(page.getByTestId('stage-column')).toHaveCount(4);
    });

    test.skip('should show deals in stages', async ({ page }) => {
      await page.goto('/crm');

      // Deals should be visible as cards
      await expect(page.getByTestId('deal-card')).toBeVisible();
    });
  });

  test.describe('Deal Management (Authenticated)', () => {
    test.skip('should open deal creation modal', async ({ page }) => {
      await page.goto('/crm');

      // Click add deal button
      await page.getByRole('button', { name: /novo deal|new deal|adicionar/i }).click();

      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/novo deal|new deal|criar/i)).toBeVisible();
    });

    test.skip('should create new deal', async ({ page }) => {
      await page.goto('/crm');

      // Open modal
      await page.getByRole('button', { name: /novo deal|new deal/i }).click();

      // Fill form
      await page.getByLabel(/título|title/i).fill('E2E Test Deal');
      await page.getByLabel(/valor|value/i).fill('10000');

      // Select contact
      await page.getByLabel(/contato|contact/i).click();
      await page.getByRole('option').first().click();

      // Submit
      await page.getByRole('button', { name: /criar|create|salvar|save/i }).click();

      // Deal should appear in first stage
      await expect(page.getByText('E2E Test Deal')).toBeVisible();
    });

    test.skip('should drag and drop deal between stages', async ({ page }) => {
      await page.goto('/crm');

      // Get deal card
      const dealCard = page.getByTestId('deal-card').first();
      const targetStage = page.getByTestId('stage-column').nth(1);

      // Drag and drop
      await dealCard.dragTo(targetStage);

      // Deal should be in new stage
      await expect(targetStage.getByTestId('deal-card')).toContainText(await dealCard.textContent() || '');
    });

    test.skip('should open deal details on click', async ({ page }) => {
      await page.goto('/crm');

      // Click on deal
      await page.getByTestId('deal-card').first().click();

      // Details panel or modal should open
      await expect(page.getByTestId('deal-details')).toBeVisible();
    });

    test.skip('should mark deal as won', async ({ page }) => {
      await page.goto('/crm');

      // Click on deal
      await page.getByTestId('deal-card').first().click();

      // Click won button
      await page.getByRole('button', { name: /ganho|won/i }).click();

      // Should show success
      await expect(page.getByText(/ganho|won|sucesso/i)).toBeVisible();
    });

    test.skip('should mark deal as lost', async ({ page }) => {
      await page.goto('/crm');

      // Click on deal
      await page.getByTestId('deal-card').first().click();

      // Click lost button
      await page.getByRole('button', { name: /perdido|lost/i }).click();

      // Should prompt for reason
      await expect(page.getByLabel(/motivo|reason/i)).toBeVisible();

      // Fill reason and submit
      await page.getByLabel(/motivo|reason/i).fill('Budget constraints');
      await page.getByRole('button', { name: /confirmar|confirm/i }).click();

      // Should show success
      await expect(page.getByText(/perdido|lost/i)).toBeVisible();
    });
  });

  test.describe('Pipeline Filtering (Authenticated)', () => {
    test.skip('should filter deals by assignee', async ({ page }) => {
      await page.goto('/crm');

      // Open filter
      await page.getByRole('button', { name: /filtrar|filter/i }).click();

      // Select assignee
      await page.getByLabel(/responsável|assignee/i).click();
      await page.getByRole('option').first().click();

      // Apply filter
      await page.getByRole('button', { name: /aplicar|apply/i }).click();

      // Results should be filtered
    });

    test.skip('should filter deals by value range', async ({ page }) => {
      await page.goto('/crm');

      // Open filter
      await page.getByRole('button', { name: /filtrar|filter/i }).click();

      // Set value range
      await page.getByLabel(/valor mínimo|min value/i).fill('5000');
      await page.getByLabel(/valor máximo|max value/i).fill('50000');

      // Apply filter
      await page.getByRole('button', { name: /aplicar|apply/i }).click();
    });
  });
});
