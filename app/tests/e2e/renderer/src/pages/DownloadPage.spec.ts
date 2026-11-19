import {
  azureTemplate,
  copiedText,
  downloadTemplate,
  driveTemplate,
  expect,
  openFromHome,
  test,
  uploadTemplate
} from '../../../support/app'

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
  await page.getByRole('button', { name: 'photos', exact: true }).click()
  await expect(page.getByRole('row', { name: /beach\.jpg/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Folder' })).toContainText('photos')
})

test('restores an archived file', async ({ page }) => {
  const row = page.getByRole('row', { name: /backup\.tar\.gz/ })
  await row.getByRole('button', { name: 'Restore' }).click()
  const dialog = page.getByRole('dialog', { name: 'Restore from the archive' })
  await dialog.getByRole('button', { name: 'Bulk' }).click()
  await expect(dialog.getByText('Usually ready within 48 hours.')).toBeVisible()
  await expect(dialog.getByText('Bulk is cheaper than Standard')).toBeVisible()
  const other = dialog.getByLabel('Other number of days')
  await other.fill('0')
  await expect(dialog.getByRole('button', { name: 'Restore' })).toBeDisabled()
  await other.fill('30')
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

  await page.getByRole('checkbox', { name: 'Select all files and folders' }).check()
  await expect(bar).toContainText('1 folder and 4 files selected')
  await bar.getByRole('button', { name: 'Delete (5)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete 1 folder and 4 files?' })
  await expect(dialog).toContainText(
    'photos, backup.tar.gz, contracts.zip, invoice.pdf, photos-2025.zip'
  )
  await expect(dialog).toContainText('Inside the folder, at any depth: 1 file, 4.0 MB.')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted 1 folder and 4 files.')
  await expect(page.getByRole('row', { name: /invoice\.pdf/ })).toBeHidden()
  await expect(page.getByRole('button', { name: 'photos', exact: true })).toBeHidden()
  await expect(bar).toBeHidden()
})

test('downloads, restores and deletes a whole folder', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Select folder photos' }).check()
  const bar = page.getByRole('toolbar', { name: 'Selected files' })
  await expect(bar).toContainText('1 folder selected')

  await bar.getByRole('button', { name: 'Download (1)' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Downloading 1 file into your download folder, with folders saved as photos.'
  )
  await expect(page.getByText('Download: photos/beach.jpg')).toBeVisible()

  await bar.getByRole('button', { name: 'Restore (1)' }).click()
  const restore = page.getByRole('dialog', { name: 'Restore from the archive' })
  await expect(restore).toContainText('the archived files inside 1 folder')
  await expect(restore).toContainText('Nothing inside the folder is archived.')
  await expect(restore.getByRole('button', { name: 'Restore' })).toBeDisabled()
  await restore.getByRole('button', { name: 'Cancel' }).click()

  await bar.getByRole('button', { name: 'Delete (1)' }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this folder?' })
  await expect(dialog).toContainText('Inside the folder, at any depth: 1 file, 4.0 MB.')
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted photos.')
  await expect(page.getByRole('button', { name: 'photos', exact: true })).toBeHidden()
})

test('sorts the files by name or by date, either way', async ({ page }) => {
  const fileNames = page
    .getByRole('row')
    .filter({ has: page.getByRole('checkbox') })
    .filter({ hasNot: page.getByRole('checkbox', { name: /^Select (all|folder) / }) })
  await expect(fileNames.first()).toContainText('backup.tar.gz')
  const modified = page.getByRole('columnheader', { name: 'Modified' })
  await modified.getByRole('button').click()
  await expect(modified).toHaveAttribute('aria-sort', 'descending')
  await expect(fileNames.first()).toContainText('invoice.pdf')
  await expect(fileNames.last()).toContainText('photos-2025.zip')
  await modified.getByRole('button').click()
  await expect(modified).toHaveAttribute('aria-sort', 'ascending')
  await expect(fileNames.first()).toContainText('photos-2025.zip')
  await page.getByRole('columnheader', { name: 'Name' }).getByRole('button').click()
  await expect(fileNames.first()).toContainText('backup.tar.gz')
})

test('finds files and folders in the open folder by name, keeping the selection', async ({
  page
}) => {
  const search = page.getByRole('searchbox', { name: 'Search this folder' })
  await search.fill('PHOTOS')
  await expect(page.getByRole('button', { name: 'photos', exact: true })).toBeVisible()
  await expect(page.getByRole('row', { name: /photos-2025\.zip/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /invoice\.pdf/ })).toBeHidden()

  await page.getByRole('checkbox', { name: 'Select all files and folders' }).check()
  const bar = page.getByRole('toolbar', { name: 'Selected files' })
  await expect(bar).toContainText('1 folder and 1 file selected')
  await search.fill('invoice')
  await page.getByRole('checkbox', { name: 'Select invoice.pdf' }).check()
  await expect(bar).toContainText('1 folder and 2 files selected')

  await search.fill('nothing like this')
  await expect(page.getByText('Nothing loaded so far matches the search.')).toBeVisible()
  await search.press('Escape')
  await expect(page.getByRole('row', { name: /invoice\.pdf/ })).toBeVisible()

  await search.fill('photos')
  await page.getByRole('button', { name: 'photos', exact: true }).click()
  await expect(page.getByRole('row', { name: /beach\.jpg/ })).toBeVisible()
  await expect(search).toHaveValue('')
})

test("copies the open folder's URL, and starts an upload template for it", async ({
  app,
  page
}) => {
  await page.getByRole('button', { name: 'photos', exact: true }).click()
  await page.getByRole('button', { name: 'Copy URL' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await copiedText(app)).toBe('s3://example-archive/photos/')

  await page.getByRole('button', { name: 'New upload template here' }).click()
  const form = page.getByRole('form', { name: 'New template' })
  await expect(form.getByLabel('Name')).toHaveValue('photos')
  await expect(form.getByLabel('S3 location')).toHaveValue('s3://example-archive/photos/')
  await expect(
    form.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Upload' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(form.getByRole('combobox', { name: 'Copy the keys of' })).toHaveText(/^Archive/)
  await form.getByRole('button', { name: 'Add template' }).click()
  await expect(page.getByRole('status')).toHaveText('Added "photos".')
})

test.describe('on Azure', () => {
  test.use({
    setup: { templates: [azureTemplate('Backups')], settings: { welcomeSeen: true } }
  })

  test('shows access tiers, and rehydrates into a tier at a priority', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Access tier' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Folder' })).toContainText('backups')
    await page
      .getByRole('row', { name: /backup\.tar\.gz/ })
      .getByRole('button', { name: 'Restore' })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Restore from the archive' })
    await expect(
      dialog.getByRole('group', { name: 'Tier' }).getByRole('button', { name: 'Hot' })
    ).toHaveAttribute('aria-pressed', 'true')
    await dialog
      .getByRole('group', { name: 'Priority' })
      .getByRole('button', { name: 'High' })
      .click()
    await expect(dialog.getByText('Usually ready within an hour')).toBeVisible()
    await dialog.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByRole('status')).toContainText('Azure is rehydrating backup.tar.gz')
  })
})

test.describe('on Google Drive', () => {
  test.use({
    setup: { templates: [driveTemplate('Family')], settings: { welcomeSeen: true } }
  })

  test('has no storage column, and moves deleted files to the trash', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Storage class' })).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Folder' })).toContainText('Family photos')
    await page
      .getByRole('row', { name: /invoice\.pdf/ })
      .getByRole('button', { name: 'Delete' })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Delete this file?' })
    await expect(dialog).toContainText('goes to the Google Drive trash')
    await dialog.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('status')).toHaveText('Moved invoice.pdf to the trash.')
  })
})
