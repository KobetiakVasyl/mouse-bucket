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

test('sets the storage class the Upload page starts with', async ({ page }) => {
  await menuItem(page, 'Settings').click()
  const setting = page.getByRole('group', { name: 'Storage class for new uploads' })
  await expect(setting.getByRole('button', { name: 'Glacier Deep Archive' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await setting.getByRole('button', { name: 'Standard' }).click()
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await menuItem(page, 'Settings').click()
  await expect(setting.getByRole('button', { name: 'Standard' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test("shows the system's Downloads folder as the download folder", async ({ app, page }) => {
  const downloads = await app.evaluate(({ app: electronApp }) => electronApp.getPath('downloads'))
  await menuItem(page, 'Settings').click()
  const setting = page.getByRole('region', { name: 'Download folder' })
  await expect(setting).toContainText(downloads)
  await expect(setting.getByRole('button', { name: 'Change…' })).toBeEnabled()
})
