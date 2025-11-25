import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const userEmail = `test.user.${Date.now()}@example.com`;
  const userPassword = 'password123';

  test('should allow a new player to register', async ({ page }) => {
    await page.goto('/');

    // 1. Select role
    await page.getByRole('button', { name: 'Ik ben een speler' }).click();
    await expect(page).toHaveURL('/register?role=player');

    // 2. Fill out registration form
    await page.getByLabel('Naam').fill('Test Speler');
    await page.getByLabel('E-mail').fill(userEmail);
    await page.getByLabel('Wachtwoord').fill(userPassword);
    await page.getByLabel('Herhaal wachtwoord').fill(userPassword);
    
    // Select gender
    await page.getByRole('combobox', { name: 'Geslacht' }).click();
    await page.getByRole('option', { name: 'Jongen' }).click();

    // Accept terms
    await page.getByLabel(/Ik ga akkoord/).check();

    // 3. Submit form
    await page.getByRole('button', { name: 'Account aanmaken' }).click();

    // 4. Verify redirect to email verification page
    await expect(page).toHaveURL('/verify-email');
    await expect(page.getByRole('heading', { name: 'Verifieer je e-mailadres' })).toBeVisible();
    await expect(page.getByText(userEmail)).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-mail').fill('invalid@user.com');
    await page.getByLabel('Wachtwoord').fill('invalidpassword');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Wait for the toast to appear
    const toast = page.getByRole('alert');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Inloggen mislukt');
  });
});
