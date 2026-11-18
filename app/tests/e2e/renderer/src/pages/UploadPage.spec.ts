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

test('shows ten template tiles and the rest in a drop-down', async ({ page }) => {
  const picker = page.getByRole('region', { name: 'Template' })
  await expect(picker.getByRole('button')).toHaveCount(10)
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
