import { expect, menuItem, test } from '../../../support/app'

test.use({ setup: { templates: [], settings: { welcomeSeen: false } } })

test('shows on the first start, and stays closed once closed', async ({ page }) => {
  const welcome = page.getByRole('dialog', { name: 'Welcome to MouseBucket' })
  await expect(welcome).toBeVisible()
  await welcome.getByRole('button', { name: 'Close' }).click()
  await expect(welcome).toBeHidden()
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await expect(page.getByRole('heading', { level: 1, name: 'Templates' })).toBeVisible()
  await expect(welcome).toBeHidden()
})

test('opens How it works', async ({ page }) => {
  const welcome = page.getByRole('dialog', { name: 'Welcome to MouseBucket' })
  await welcome.getByRole('button', { name: 'How it works' }).click()
  await expect(welcome).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'How it works' })).toBeVisible()
  await expect(menuItem(page, 'How it works')).toHaveAttribute('aria-current', 'page')
})

test('opens again from the side menu', async ({ page }) => {
  const welcome = page.getByRole('dialog', { name: 'Welcome to MouseBucket' })
  await welcome.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Show welcome page again' }).click()
  await expect(welcome).toBeVisible()
})
