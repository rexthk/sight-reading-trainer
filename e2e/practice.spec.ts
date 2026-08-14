import { expect, test } from '@playwright/test'

test('starts the recommended construction path on desktop and mobile', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Continue learning/ }).click()
  await expect(page.getByText(/BUILD THE CHORD/)).toBeVisible()
  await expect(page.locator('.pitch-staff svg')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check construction' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
})

test('opens guided reasoning without revealing the chord', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Guided Recognition/ }).click()
  await expect(page.locator('.staff svg')).toBeVisible()
  await page.getByRole('button', { name: 'I don’t know this chord' }).click()
  await expect(page.getByRole('heading', { name: 'What pitch classes are present?' })).toBeVisible()
  await expect(page.getByText('STEP 1 · INVENTORY')).toBeVisible()
})

test('guided root testing can derive the answer without a spelling lookup', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Guided Recognition/ }).click()
  await page.getByRole('button', { name: 'I don’t know this chord' }).click()
  await page.getByRole('button', { name: /Try to stack/ }).click()
  const candidates = page.locator('.pitch-token-row.selectable button')
  for (let index = 0; index < await candidates.count(); index += 1) {
    await candidates.nth(index).click()
    await page.getByRole('button', { name: 'Test this order' }).click()
    if (await page.getByText(/STEP 3 · READ THE STRUCTURE/).isVisible()) break
  }
  await expect(page.getByText(/STEP 3 · READ THE STRUCTURE/)).toBeVisible()
  const firstThird = await page.locator('.interval-stack span').nth(0).innerText()
  const secondThird = await page.locator('.interval-stack span').nth(1).innerText()
  const quality = firstThird.includes('Major') ? 'Major' : secondThird.includes('Major') ? 'Minor' : 'Diminished'
  await page.getByRole('button', { name: quality, exact: true }).click()
  await page.getByRole('button', { name: 'Check the quality' }).click()
  await expect(page.getByText(/STEP 4 · ROOT IS NOT BASS/)).toBeVisible()
  const roles = page.locator('.guided-options button')
  for (let index = 0; index < await roles.count(); index += 1) {
    await roles.nth(index).click()
    await page.getByRole('button', { name: 'Check bass and inversion' }).click()
    if (await page.getByText('How to derive it').isVisible()) break
  }
  await expect(page.getByText('How to derive it')).toBeVisible()
})

test('production app reloads offline after its service worker is ready', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    }
  })
  await page.getByRole('button', { name: /Continue learning/ }).click()
  await expect(page.locator('.pitch-staff svg')).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Read the shape/i })).toBeVisible()
})
