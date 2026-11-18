import { downloadTemplate, expect, openFromHome, test, uploadTemplate } from '../../../support/app'

test.use({
  setup: {
    templates: [uploadTemplate('Reports'), downloadTemplate('Archive')],
    settings: { welcomeSeen: true }
  }
})

test.beforeEach(async ({ page }) => {
  await openFromHome(page, 'Download')
})

test('shows each file’s storage class and what archived files need', async ({ page }) => {
  const archived = page.getByRole('row', { name: /backup\.tar\.gz/ })
  await expect(archived).toContainText('Glacier Deep Archive')
  await expect(archived).toContainText('Archived')
  await expect(archived.getByRole('button', { name: 'Restore' })).toBeVisible()
  await expect(archived.getByRole('button', { name: 'Download' })).toBeHidden()

  await expect(page.getByRole('row', { name: /contracts\.zip/ })).toContainText('Restored until')
  const restoring = page.getByRole('row', { name: /photos-2025\.zip/ })
  await expect(restoring).toContainText('Restoring…')
  await expect(restoring.getByRole('button', { name: 'Download' })).toBeHidden()
})

test('opens a folder', async ({ page }) => {
  await page.getByRole('button', { name: 'photos/' }).click()
  await expect(page.getByRole('row', { name: /beach\.jpg/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Folder' })).toContainText('photos')
})

test('restores an archived file', async ({ page }) => {
  const row = page.getByRole('row', { name: /backup\.tar\.gz/ })
  await row.getByRole('button', { name: 'Restore' }).click()
  const dialog = page.getByRole('dialog', { name: 'Restore from the archive' })
  await dialog.getByRole('button', { name: 'Bulk (cheaper)' }).click()
  await expect(dialog.getByText('Usually ready within 48 hours.')).toBeVisible()
  await dialog.getByLabel('Days to keep the copy').fill('3')
  await dialog.getByRole('button', { name: 'Restore' }).click()
  await expect(dialog).toBeHidden()
  await expect(row).toContainText('Restoring…')
  await expect(row.getByRole('button', { name: 'Restore' })).toBeHidden()
})

test('deletes a file only after confirming', async ({ page }) => {
  const row = page.getByRole('row', { name: /invoice\.pdf/ })
  await row.getByRole('button', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this file?' })
  await expect(dialog).toContainText('invoice.pdf')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toBeHidden()
  await expect(page.getByRole('status')).toHaveText('Deleted invoice.pdf.')
})

test('adds a download to the transfers', async ({ page }) => {
  await page
    .getByRole('row', { name: /invoice\.pdf/ })
    .getByRole('button', { name: 'Download' })
    .click()
  await expect(page.getByText('Download: invoice.pdf')).toBeVisible()
  await expect(page.getByText(/Done/)).toBeVisible()
})
