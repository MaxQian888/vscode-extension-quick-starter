import { expect, test } from '@playwright/test';

test.describe('Webview UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main title', async ({ page }) => {
    await expect(page.getByText('VSCode Extension Starter')).toBeVisible();
  });

  test('should display the subtitle', async ({ page }) => {
    await expect(page.getByText('React + shadcn/ui + Tailwind CSS')).toBeVisible();
  });

  test('should display version badge', async ({ page }) => {
    await expect(page.getByText('v0.0.1')).toBeVisible();
  });

  test('should display message card', async ({ page }) => {
    await expect(page.getByText('Message', { exact: true })).toBeVisible();
    await expect(page.getByText('Send a typed message to the VSCode extension')).toBeVisible();
  });

  test('should display state management card', async ({ page }) => {
    await expect(page.getByText('State Management')).toBeVisible();
    await expect(page.getByText('Persist state across webview sessions')).toBeVisible();
  });
});

test.describe('Message Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should update message input value', async ({ page }) => {
    const input = page.getByPlaceholder('Enter message...');
    await input.fill('Hello World');
    await expect(input).toHaveValue('Hello World');
  });

  test('should show message preview when typing', async ({ page }) => {
    const input = page.getByPlaceholder('Enter message...');
    await input.fill('Test message');
    await expect(page.getByText('Preview: Test message')).toBeVisible();
  });

  test('should have send message button', async ({ page }) => {
    const button = page.getByRole('button', { name: /send message/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should be able to click send message button', async ({ page }) => {
    const input = page.getByPlaceholder('Enter message...');
    await input.fill('Hello');

    const button = page.getByRole('button', { name: /send message/i });
    await button.click();
    // Button should still be enabled after click
    await expect(button).toBeEnabled();
  });
});

test.describe('State Management Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should update state input value', async ({ page }) => {
    const input = page.getByPlaceholder('Enter state...');
    await input.fill('my-state');
    await expect(input).toHaveValue('my-state');
  });

  test('should show state preview when typing', async ({ page }) => {
    const input = page.getByPlaceholder('Enter state...');
    await input.fill('current-state');
    await expect(page.getByText('Current: current-state')).toBeVisible();
  });

  test('should have save and load state buttons', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /save state/i });
    const loadButton = page.getByRole('button', { name: /load state/i });

    await expect(saveButton).toBeVisible();
    await expect(loadButton).toBeVisible();
  });

  test('should be able to click save state button', async ({ page }) => {
    const input = page.getByPlaceholder('Enter state...');
    await input.fill('test-state');

    const saveButton = page.getByRole('button', { name: /save state/i });
    await saveButton.click();
    await expect(saveButton).toBeEnabled();
  });
});

test.describe('Responsive Layout', () => {
  test('should display cards in grid layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    const messageCard = page.getByText('Message').first();
    const stateCard = page.getByText('State Management').first();

    await expect(messageCard).toBeVisible();
    await expect(stateCard).toBeVisible();
  });

  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByText('VSCode Extension Starter')).toBeVisible();
    await expect(page.getByPlaceholder('Enter message...')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper form labels', async ({ page }) => {
    await expect(page.getByLabel('Message content')).toBeVisible();
    await expect(page.getByLabel('State value')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    const messageInput = page.getByPlaceholder('Enter message...');
    await messageInput.focus();
    await expect(messageInput).toBeFocused();

    await page.keyboard.press('Tab');
    const sendButton = page.getByRole('button', { name: /send message/i });
    await expect(sendButton).toBeFocused();
  });
});
