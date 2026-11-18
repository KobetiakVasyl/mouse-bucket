import { downloadTemplate, expect, openFromHome, test, uploadTemplate } from '../../../support/app'

const NAMES = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12']

test.use({
  setup: {
    templates: [...NAMES.map((name) => uploadTemplate(name)), downloadTemplate('Archive')],
    settings: { welcomeSeen: true }
  }
})

test.beforeEach(async ({ page }) => {
  await openFromHome(page, 'Upload')
})

test('shows six template tiles and the rest in a drop-down', async ({ page }) => {
  const picker = page.getByRole('region', { name: 'Template' })
  await expect(picker.getByRole('button')).toHaveCount(6)
  await expect(picker.getByRole('button', { name: /^A01/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('More templates').selectOption({ label: 'A12' })
  await expect(page.getByText('s3://example-bucket/a12/').last()).toBeVisible()
})

test('shows the settings every upload uses', async ({ page }) => {
  for (const value of ["The bucket's default encryption", 'CRC64NVME']) {
    await expect(page.getByText(value, { exact: true })).toBeVisible()
  }
})

test('starts with Deep Archive and can switch to Standard', async ({ page }) => {
  const storageClass = page.getByRole('group', { name: 'Storage class' })
  const deepArchive = storageClass.getByRole('button', { name: 'Glacier Deep Archive' })
  await expect(deepArchive).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/billed for at least 180 days/)).toBeVisible()
  await storageClass.getByRole('button', { name: 'Standard' }).click()
  await expect(deepArchive).toHaveAttribute('aria-pressed', 'false')
  await expect(
    page.getByText('Files can be downloaded at once, but cost more to store.')
  ).toBeVisible()
})

test('adds the chosen files to the transfers', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose files…' }).click()
  await expect(page.getByRole('status')).toHaveText('2 files added to the transfers.')
  await expect(page.getByText('Upload: report.pdf')).toBeVisible()
  await expect(page.getByText('Upload: photo.jpg')).toBeVisible()
})

test('pauses, resumes and cancels a transfer, asking first once something moved', async ({
  page
}) => {
  await page.getByRole('button', { name: 'Choose files…' }).click()
  const report = page.getByRole('listitem', { name: 'Upload: report.pdf' })
  await report.getByRole('button', { name: 'Pause' }).click()
  await expect(report).toContainText('Paused')
  await report.getByRole('button', { name: 'Resume' }).click()
  await expect(report).toContainText('In progress')

  await report.getByRole('button', { name: 'Cancel' }).click()
  const dialog = page.getByRole('dialog', { name: 'Cancel this upload?' })
  await expect(dialog).toContainText('uploaded so far is deleted from the bucket')
  await dialog.getByRole('button', { name: 'Keep it' }).click()
  await expect(report).toContainText('In progress')
  await report.getByRole('button', { name: 'Cancel' }).click()
  await dialog.getByRole('button', { name: 'Cancel upload' }).click()
  await expect(report).toContainText('Cancelled')

  const photo = page.getByRole('listitem', { name: 'Upload: photo.jpg' })
  await photo.getByRole('button', { name: 'Cancel' }).click()
  await expect(photo).toContainText('Cancelled')
})
