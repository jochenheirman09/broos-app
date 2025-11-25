import { test, expect } from '@playwright/test';

test('homepage has role selection buttons', async ({ page }) => {
  await page.goto('/');

  // Expect the main title to be visible.
  await expect(page.getByRole('heading', { name: 'Welkom! Wie ben jij?' })).toBeVisible();

  // Expect the three role selection buttons to be present.
  await expect(page.getByRole('button', { name: 'Ik ben een speler' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ik ben lid van een staf' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ik ben clubverantwoordelijke' })).toBeVisible();
  
  // Expect the link to the login page to be present.
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
});
