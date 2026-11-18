import { downloadTemplate, expect, menuItem, openFromHome, test } from '../../../support/app'

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
  const setting = page.getByLabel('Storage class for new uploads')
  await expect(setting).toHaveValue('DEEP_ARCHIVE')
  await setting.selectOption('STANDARD')
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await menuItem(page, 'Settings').click()
  await expect(setting).toHaveValue('STANDARD')
})

test("shows the system's Downloads folder as the download folder", async ({ app, page }) => {
  const downloads = await app.evaluate(({ app: electronApp }) => electronApp.getPath('downloads'))
  await menuItem(page, 'Settings').click()
  const setting = page.getByRole('region', { name: 'Download folder' })
  await expect(setting).toContainText(downloads)
  await expect(setting.getByRole('button', { name: 'Change…' })).toBeEnabled()
})

test.describe('with a download template', () => {
  test.use({ setup: { templates: [downloadTemplate('Archive')], settings: { welcomeSeen: true } } })

  test('sets the speed and days a restore starts with', async ({ page }) => {
    await menuItem(page, 'Settings').click()
    const speed = page.getByRole('group', { name: 'Restore speed' })
    await expect(speed.getByRole('button', { name: 'Bulk (cheaper)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await speed.getByRole('button', { name: 'Standard' }).click()
    await page.getByLabel('Days to keep a restored copy').fill('3')

    await openFromHome(page, 'Browse')
    await page
      .getByRole('row', { name: /backup\.tar\.gz/ })
      .getByRole('button', { name: 'Restore' })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Restore from the archive' })
    await expect(dialog.getByRole('button', { name: 'Standard' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(dialog.getByLabel('Days to keep the copy')).toHaveValue('3')
  })
})

test('shows the version, and that only an installed copy updates itself', async ({ page }) => {
  await menuItem(page, 'Settings').click()
  const updates = page.getByRole('region', { name: 'Updates' })
  await expect(updates).toContainText(/Version \d+\.\d+\.\d+/)
  await expect(updates).toContainText('Updates work only in an installed copy of the app.')
  await expect(updates.getByRole('button', { name: 'Check for updates' })).toBeHidden()
})
