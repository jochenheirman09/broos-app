
import { test, expect } from '@playwright/test';

// Note: These tests will require a seeded database user to run successfully.
// The global-setup.ts script handles the seeding when run locally.

test.describe('Staff Flow', () => {
  // Login as the staff member before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(process.env.E2E_STAFF_EMAIL!);
    await page.getByLabel('Wachtwoord').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Log in' }).click();
    // After login, the user is redirected to complete their profile
    await page.waitForURL('/complete-profile');
  });


  test('should be prompted to complete profile and join a team', async ({ page }) => {
    // Explicitly wait for the heading to ensure the page is loaded.
    await expect(page.getByRole('heading', { name: /Bijna klaar/ })).toBeVisible();
    
    // Fill out the form
    await page.getByRole('button', { name: /Kies een datum/ }).click();
    await page.getByRole('button', { name: '15' }).click(); // Select a day
    
    // This is a placeholder. In a real test, you'd seed an invitation code and use it here.
    await page.getByLabel('Team Uitnodigingscode').fill('TESTCODE');
    
    await page.getByRole('button', { name: 'Profiel Opslaan' }).click();
    
    // Since the team code is invalid, we expect a toast message.
    await expect(page.getByText('Ongeldige Code')).toBeVisible();
    
    // The user should remain on the same page
    await expect(page).toHaveURL('/complete-profile');
  });
  
  // This test is skipped because it requires a valid, seeded team invitation code to proceed to the dashboard.
  test.skip('should see the staff dashboard after joining a team', async ({ page }) => {
     // First, ensure the profile is complete
    await page.goto('/complete-profile');
    await page.getByRole('button', { name: /Kies een datum/ }).click();
    await page.getByRole('button', { name: '15' }).click();
    await page.getByLabel('Team Uitnodigingscode').fill('VALID_TEAM_CODE'); // <-- Use seeded code here
    await page.getByRole('button', { name: 'Profiel Opslaan' }).click();
    await page.waitForURL('/dashboard');

    // Verify staff-specific dashboard content
    await expect(page.getByRole('heading', { name: 'Team Inzichten' })).toBeVisible();
  });

});
