import { expect, test } from '@playwright/test';

test('builder → choose opponent → battle → skip to result → return to builder', async ({
  page,
}) => {
  await page.goto('/circuit');

  // Build a legal five-creature Circuit.
  const addButtons = page.getByRole('button', { name: /^Add PH_/ });
  for (let i = 0; i < 5; i++) {
    await addButtons.first().click();
  }
  await expect(page.getByRole('button', { name: 'In Circuit' })).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Circuit full' })).toHaveCount(7);

  // Choose an opponent and confirm its ordered Circuit preview appears.
  await page.getByRole('radio', { name: /PH_GUARDIAN_WALL/ }).click();
  await expect(page.getByText('PH_GUARDIAN_WALL — ordered Circuit')).toBeVisible();

  // Start the battle.
  const battleButton = page.getByRole('button', { name: 'Battle this Circuit' });
  await expect(battleButton).toBeEnabled();
  await battleButton.click();
  await expect(page).toHaveURL(/\/battle$/);
  await expect(page.getByRole('heading', { name: /Battle vs PH_GUARDIAN_WALL/ })).toBeVisible();

  // Step once, then skip to the result.
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Skip to Result' }).click();
  const result = page.getByRole('region', { name: 'Battle result' });
  await expect(result).toBeVisible();
  await expect(result.getByText('Rounds')).toBeVisible();

  // The battle log survives skipping.
  await expect(page.getByText('Battle begins!')).toBeVisible();

  // Return to the builder with the Circuit intact.
  await result.getByRole('button', { name: 'Edit Circuit' }).click();
  await expect(page).toHaveURL(/\/circuit$/);
  await expect(page.getByRole('button', { name: 'In Circuit' })).toHaveCount(5);
});
