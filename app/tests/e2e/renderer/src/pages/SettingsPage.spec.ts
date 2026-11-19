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
  const setting = page.getByRole('combobox', { name: 'Storage class for new uploads' })
  await expect(setting).toHaveText('Glacier Deep Archive')
  await setting.click()
  await page.getByRole('option', { name: 'Standard' }).click()
  await expect(setting).toHaveText('Standard')
  await expect(page.getByRole('listbox')).toBeHidden()
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await menuItem(page, 'Settings').click()
  await expect(setting).toHaveText('Standard')
})

test('chooses from the drop-down with the keyboard', async ({ page }) => {
  await menuItem(page, 'Settings').click()
  const setting = page.getByRole('combobox', { name: 'Storage class for new uploads' })
  await setting.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(setting).toHaveText('Standard')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(setting).toHaveText('Standard')
})

test("shows the system's Downloads folder as the download folder", async ({ app, page }) => {
  const downloads = await app.evaluate(({ app: electronApp }) => electronApp.getPath('downloads'))
  await menuItem(page, 'Settings').click()
  const setting = page
    .getByRole('region', { name: 'Defaults' })
    .getByRole('group', { name: 'Download folder' })
  await expect(setting).toContainText(downloads)
  await expect(setting.getByRole('button', { name: 'Change…' })).toBeEnabled()
})

test.describe('with a download template', () => {
  test.use({ setup: { templates: [downloadTemplate('Archive')], settings: { welcomeSeen: true } } })

  test('sets the speed and days a restore starts with', async ({ page }) => {
    await menuItem(page, 'Settings').click()
    const speed = page.getByRole('group', { name: 'Restore speed' })
    await expect(speed.getByRole('button', { name: 'Bulk' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(page.getByText('Bulk is cheaper than Standard')).toBeVisible()
    await speed.getByRole('button', { name: 'Standard' }).click()
    const days = page.getByRole('group', { name: 'Days to keep a restored S3 copy' })
    await expect(days.getByRole('button', { name: '7', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await days.getByRole('button', { name: '3', exact: true }).click()

    await openFromHome(page, 'Browse')
    await page
      .getByRole('row', { name: /backup.tar.gz/ })
      .getByRole('button', { name: 'Restore' })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Restore from the archive' })
    await expect(dialog.getByRole('button', { name: 'Standard' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(
      dialog
        .getByRole('group', { name: 'Days to keep the copy' })
        .getByRole('button', { name: '3', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('saves another number of days, typed in', async ({ page }) => {
    await menuItem(page, 'Settings').click()
    const days = page.getByRole('group', { name: 'Days to keep a restored S3 copy' })
    const other = days.getByLabel('Other number of days')
    await other.fill('400')
    await expect(other).toHaveAttribute('aria-invalid', 'true')
    await expect(days.getByRole('button', { name: '7', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    await other.fill('30')
    await expect(other).toHaveAttribute('aria-invalid', 'false')
    await page.reload()
    await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
    await menuItem(page, 'Settings').click()
    await expect(other).toHaveValue('30')
  })
})
