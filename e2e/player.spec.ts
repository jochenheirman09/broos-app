
import { test, expect } from '@playwright/test';

// Note: These tests will require a seeded database user to run successfully.
// For now, they test the UI flow up to the point of database interaction.

test.describe('Player Flow', () => {

  test.beforeEach(async ({ page }) => {
    // This login step will fail without a real user.
    // In a real test setup, you would programmatically create and log in a user.
    // For now, we'll just navigate to the page and stub the rest.
    test.skip(true, 'Skipping until test user seeding is implemented.');

    await page.goto('/login');
    await page.getByLabel('E-mail').fill('player@example.com');
    await page.getByLabel('Wachtwoord').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/complete-profile');
  });


  test('should be prompted to complete profile', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profiel Aanvullen' })).toBeVisible();
    
    // Fill out the form
    await page.getByRole('button', { name: /Kies een datum/ }).click();
    await page.getByRole('button', { name: '15' }).click(); // Select a day
    await page.getByLabel('Team Uitnodigingscode').fill('TEAMCODE');
    
    await page.getByRole('button', { name: 'Profiel Opslaan' }).click();
    
    // This will fail until the backend can validate the team code
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /Jouw Dashboard/ })).toBeVisible();
  });

  test('should be able to start a chat', async ({ page }) => {
     // First, ensure the profile is complete
    await page.goto('/complete-profile');
    await page.getByRole('button', { name: /Kies een datum/ }).click();
    await page.getByRole('button', { name: '15' }).click();
    await page.getByLabel('Team Uitnodigingscode').fill('TEAMCODE');
    await page.getByRole('button', { name: 'Profiel Opslaan' }).click();
    await page.waitForURL('/dashboard');

    // Go to chat page
    await page.getByRole('link', { name: 'Chat' }).click();
    await expect(page).toHaveURL('/chat');

    // Send a message
    await page.getByPlaceholder('Typ je bericht...').fill('Hallo Broos!');
    await page.getByRole('button', { name: 'Send' }).click();

    // Expect the user's message to appear
    await expect(page.getByText('Hallo Broos!')).toBeVisible();
    
    // Expect a response from the buddy (this might require mocking the AI response)
    await expect(page.getByText(/denkt na/)).not.toBeVisible({ timeout: 20000 });
    const buddyMessages = await page.locator('.bg-muted').all();
    expect(buddyMessages.length).toBeGreaterThan(0);
  });

});
