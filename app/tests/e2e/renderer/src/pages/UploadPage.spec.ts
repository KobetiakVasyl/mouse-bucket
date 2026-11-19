import {
  azureTemplate,
  downloadTemplate,
  driveTemplate,
  expect,
  openFromHome,
  test,
  uploadTemplate
} from '../../../support/app'

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
  await page.getByRole('combobox', { name: 'More templates' }).click()
  await page.getByRole('option', { name: /^A12/ }).click()
  await expect(page.getByRole('combobox', { name: 'More templates' })).toHaveText('A12')
  await expect(page.getByText('s3://example-bucket/a12/').last()).toBeVisible()
})

test('shows the settings every upload uses, as tags with their names above', async ({ page }) => {
  const settings = page.getByRole('region', { name: 'Upload settings' })
  const tag = (name: string): ReturnType<typeof page.locator> =>
    settings.locator('dl > div').filter({ has: page.getByText(name, { exact: true }) })
  await expect(tag('Encryption')).toContainText("The bucket's default encryption")
  await expect(tag('Checksum')).toContainText('CRC64NVME')
  await expect(tag('Tags')).toContainText('None')
  await expect(tag('Metadata')).toContainText('None')
  await expect(settings.getByRole('textbox')).toHaveCount(0)
  await expect(settings.getByText('Soon')).toHaveCount(0)
})

test('starts with Deep Archive and can switch to Standard', async ({ page }) => {
  const storageClass = page.getByRole('combobox', { name: 'Storage class' })
  await expect(storageClass).toHaveText('Glacier Deep Archive')
  await expect(page.getByText(/billed for at least 180 days/)).toBeVisible()
  await storageClass.click()
  await page.getByRole('option', { name: 'Standard' }).click()
  await expect(storageClass).toHaveText('Standard')
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

test('adds a chosen folder’s files to the transfers, keeping their paths', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose a folder…' }).click()
  await expect(page.getByRole('status')).toHaveText('2 files added to the transfers.')
  await expect(page.getByText('Upload: Photos/2026/snow.jpg')).toBeVisible()
})

test('queues nothing for a dropped file that isn’t on this computer', async ({ page }) => {
  const dropped = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['made up'], 'made-up.txt'))
    return transfer
  })
  const zone = page.getByRole('region', { name: 'Drop files or folders here' })
  await zone.dispatchEvent('drop', { dataTransfer: dropped })
  await expect(page.getByRole('status')).toHaveText(
    'Nothing to upload. Drop files or folders from this computer.'
  )
})

test.describe('on other platforms', () => {
  test.use({
    setup: {
      templates: [azureTemplate('Backups', 'upload'), driveTemplate('Family', 'upload')],
      settings: { welcomeSeen: true }
    }
  })

  test("offers Azure's access tiers, and nothing to choose on Google Drive", async ({ page }) => {
    const picker = page.getByRole('region', { name: 'Template' })
    await picker.getByRole('button', { name: /^Backups/ }).click()
    const tier = page.getByRole('combobox', { name: 'Access tier' })
    await expect(tier).toHaveText('Archive')
    await expect(
      page.getByText('Files must be rehydrated before they can be downloaded')
    ).toBeVisible()
    await expect(page.getByText('MD5, for each block')).toBeVisible()
    await picker.getByRole('button', { name: /^Family/ }).click()
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByText('Google Drive keeps both files')).toBeVisible()
    await page.getByRole('button', { name: 'Choose files…' }).click()
    await expect(page.getByRole('status')).toHaveText('2 files added to the transfers.')
  })
})
