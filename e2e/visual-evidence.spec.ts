import { expect, test, type Page } from '@playwright/test';

/**
 * Browser-verification evidence for the stage gate: drives the real flow and
 * saves the screenshots referenced by the completion report. Also asserts
 * no console errors and no page-level horizontal overflow.
 */

const SHOTS = 'ai-communication-docs/phase-0/reports/screenshots';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

async function buildCircuitAndSelectOpponent(page: Page) {
  await page.goto('/circuit');
  const addButtons = page.getByRole('button', { name: /^Add PH_/ });
  for (let i = 0; i < 4; i++) {
    await addButtons.first().click();
  }
  // Add the fifth via keyboard only (focus + Enter) — keyboard route evidence.
  await addButtons.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'In Circuit' })).toHaveCount(5);
  await page.getByRole('radio', { name: /PH_GUARDIAN_WALL/ }).click();
}

async function assertNoHorizontalOverflow(page: Page) {
  // String form: runs in the browser; keeps DOM types out of the node tsconfig.
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow, 'page must not overflow horizontally').toBeLessThanOrEqual(0);
}

test('capture builder, mid-battle, and result evidence at 1440×900', async ({ page }) => {
  const errors = collectErrors(page);

  await buildCircuitAndSelectOpponent(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/stage-0.3-builder.png`, fullPage: false });

  await page.getByRole('button', { name: 'Battle this Circuit' }).click();
  await expect(page).toHaveURL(/\/battle$/);

  // Step (keyboard-activated) until the simultaneous exchange frame is visible.
  const next = page.getByRole('button', { name: 'Next' });
  for (let i = 0; i < 20; i++) {
    const hasExchange = await page.getByText(/strike simultaneously/).count();
    if (hasExchange > 0) break;
    await next.focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText(/strike simultaneously/).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/stage-0.3-battle.png`, fullPage: false });

  await page.getByRole('button', { name: 'Skip to Result' }).click();
  await expect(page.getByRole('region', { name: 'Battle result' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/stage-0.3-result.png`, fullPage: false });

  expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
});

test('usable at 1024×768 with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const errors = collectErrors(page);

  await buildCircuitAndSelectOpponent(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/stage-0.3-1024.png`, fullPage: false });

  await page.getByRole('button', { name: 'Battle this Circuit' }).click();
  await expect(page).toHaveURL(/\/battle$/);
  await page.getByRole('button', { name: 'Skip to Result' }).click();
  await expect(page.getByRole('region', { name: 'Battle result' })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  expect(errors).toEqual([]);
});

test('reduced motion and direct /battle empty state', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = collectErrors(page);

  // Direct navigation with no prepared match: friendly empty state, no throw.
  await page.goto('http://localhost:5173/battle');
  await expect(page.getByText(/No battle is prepared yet/)).toBeVisible();
  await page.getByRole('link', { name: 'Go to the Circuit Builder' }).click();
  await expect(page).toHaveURL(/\/circuit$/);

  // Reduced-motion playback still works (state changes are immediate).
  await buildCircuitAndSelectOpponent(page);
  await page.getByRole('button', { name: 'Battle this Circuit' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip to Result' }).click();
  await expect(page.getByRole('region', { name: 'Battle result' })).toBeVisible();

  expect(errors).toEqual([]);
  await context.close();
});
