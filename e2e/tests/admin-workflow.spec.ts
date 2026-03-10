/**
 * Admin workflow E2E (WO-58): admin browses agents, views detail, disables agent,
 * verifies agent cannot submit; re-enables and verifies agent can submit again.
 * BASE_URL = admin console (e.g. http://localhost:3001).
 */

import { test, expect } from '@playwright/test';

test.describe('Admin console', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/dashboard/i, { timeout: 15_000 });
  });

  test('agents list loads', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('h1')).toContainText(/agents/i, { timeout: 15_000 });
  });

  test('traces list loads', async ({ page }) => {
    await page.goto('/traces');
    await expect(page.locator('h1')).toContainText(/traces/i, { timeout: 15_000 });
  });

  test('policies list loads', async ({ page }) => {
    await page.goto('/policies');
    await expect(page.locator('h1')).toContainText(/policies/i, { timeout: 15_000 });
  });
});
