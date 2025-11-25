
import { test, expect } from '@playwright/test';

// Note: These tests will require a seeded database user to run successfully.
// The global-setup.ts script handles the seeding when run locally.

test.describe('Club Responsible Flow', () => {

  // Login as the responsible user before each test.
  // Since this user is freshly created and has no club, they should be prompted to create one.
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(process.env.E2E_RESPONSIBLE_EMAIL!);
    await page.getByLabel('Wachtwoord').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Log in' }).click();
  });

  test('should be prompted to create a club and can create a team', async ({ page }) => {
    // 1. Should see the prompt to create a club on the dashboard.
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Creëer Je Club' })).toBeVisible();
    
    // 2. Navigate to the create club page.
    await page.getByRole('button', { name: 'Club aanmaken' }).click();
    await expect(page).toHaveURL('/create-club');

    // 3. Fill out and submit the create club form.
    const clubName = `Test Club ${Date.now()}`;
    await page.getByLabel('Clubnaam').fill(clubName);
    await page.getByRole('button', { name: 'Club aanmaken' }).click();

    // 4. After creation, land on the dashboard and see the club management UI.
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: clubName })).toBeVisible();
    
    // 5. Create a new team within the club.
    const teamName = `Test Team ${Date.now()}`;
    await page.getByLabel('Teamnaam').fill(teamName);
    await page.getByRole('button', { name: 'Team aanmaken' }).click();

    // 6. The new team should appear in the list with an invitation code.
    const newTeamCard = page.locator('.card', { hasText: teamName });
    await expect(newTeamCard).toBeVisible();
    await expect(newTeamCard.getByText(/Uitnodigingscode/)).toBeVisible();
    await expect(newTeamCard.getByRole('button', { name: /Genereer code/})).toBeVisible();
  });
});
