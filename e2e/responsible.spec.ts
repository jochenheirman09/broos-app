
import { test, expect } from '@playwright/test';

// Note: These tests will require a seeded database user to run successfully.
// They are set up to test the UI flow.

test.describe('Club Responsible Flow', () => {

  test.beforeEach(async ({ page }) => {
    // This login step will fail without a real user.
    test.skip(true, 'Skipping until test user seeding is implemented.');

    await page.goto('/login');
    await page.getByLabel('E-mail').fill('responsible@example.com');
    await page.getByLabel('Wachtwoord').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should be prompted to create a club if they have none', async ({ page }) => {
    // Assuming the test user has no clubId, they should see this prompt.
    await expect(page.getByRole('heading', { name: 'Creëer Je Club' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Club aanmaken' }).click();
    await expect(page).toHaveURL('/create-club');

    const clubName = `Test Club ${Date.now()}`;
    await page.getByLabel('Clubnaam').fill(clubName);
    await page.getByRole('button', { name: 'Club aanmaken' }).click();

    // After creation, they should land on the dashboard and see the club management UI
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: clubName })).toBeVisible();
  });

  test('should be able to create a new team', async ({ page }) => {
    // This test assumes the user already has a club and is on the dashboard.
    await expect(page.getByRole('heading', { name: /Test Club/ })).toBeVisible();

    const teamName = `Test Team ${Date.now()}`;
    await page.getByLabel('Teamnaam').fill(teamName);
    await page.getByRole('button', { name: 'Team aanmaken' }).click();

    // The new team should appear in the list
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();
    // And it should have an invitation code
    const newTeamCard = page.locator('.card', { hasText: teamName });
    await expect(newTeamCard.getByText(/Uitnodigingscode/)).toBeVisible();
  });
});
