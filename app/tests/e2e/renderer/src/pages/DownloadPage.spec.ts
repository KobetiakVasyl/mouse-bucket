import { downloadTemplate, expect, openFromHome, test, uploadTemplate } from '../../../support/app'

test.use({
  setup: {
    templates: [uploadTemplate('Reports'), downloadTemplate('Archive')],
    settings: { welcomeSeen: true }
  }
})

test.beforeEach(async ({ page }) => {
  await openFromHome(page, 'Browse')
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

test('downloads, restores and deletes the selected files', async ({ page }) => {
  const select = (name: string): Promise<void> =>
    page.getByRole('checkbox', { name: `Select ${name}` }).check()
  await select('invoice.pdf')
  await select('contracts.zip')
  await select('backup.tar.gz')
  const bar = page.getByRole('toolbar', { name: 'Selected files' })
  await expect(bar).toContainText('3 files selected')

  await bar.getByRole('button', { name: 'Download (2)' }).click()
  await expect(page.getByRole('status')).toHaveText(
    "Downloading 2 files. They're in the transfers below."
  )
  await expect(page.getByText('Download: invoice.pdf')).toBeVisible()
  await expect(page.getByText('Download: contracts.zip')).toBeVisible()

  await bar.getByRole('button', { name: 'Restore (1)' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('row', { name: /backup\.tar\.gz/ })).toContainText('Restoring…')
  await expect(bar.getByRole('button', { name: 'Restore (0)' })).toBeDisabled()

  await page.getByRole('checkbox', { name: 'Select all files' }).check()
  await expect(bar).toContainText('4 files selected')
  await bar.getByRole('button', { name: 'Delete (4)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete 4 files?' })
  await expect(dialog).toContainText('backup.tar.gz, contracts.zip, invoice.pdf, photos-2025.zip')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted 4 files.')
  await expect(page.getByRole('row', { name: /invoice\.pdf/ })).toBeHidden()
  await expect(bar).toBeHidden()
})
