import { expect, menuItem, test } from '../../../support/app'

test('switches to the light theme and keeps it', async ({ page }) => {
  const html = page.locator('html')
  await expect(html).toHaveClass('dark')
  await menuItem(page, 'Settings').click()
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }).click()
  await expect(html).not.toHaveClass('dark')
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await expect(html).not.toHaveClass('dark')
})
