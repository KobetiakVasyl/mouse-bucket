import {
  copiedText,
  downloadTemplate,
  expect,
  menuItem,
  test,
  uploadTemplate
} from '../../../support/app'

test.use({
  setup: {
    templates: [uploadTemplate('Zeta'), downloadTemplate('Alpha')],
    settings: { welcomeSeen: true }
  }
})

test.beforeEach(async ({ page }) => {
  await menuItem(page, 'Templates').click()
})

test('lists the templates by name', async ({ page }) => {
  const rows = page.getByRole('row')
  await expect(rows.nth(1)).toContainText('Alpha')
  await expect(rows.nth(1)).toContainText('s3://example-archive/')
  await expect(rows.nth(2)).toContainText('Zeta')
})

test('adds a template', async ({ page }) => {
  await page.getByLabel('Name').fill('Invoices')
  await page.getByLabel('S3 location').fill('s3://example-bucket/invoices/')
  await expect(page.getByText('Uploads go to s3://example-bucket/invoices/')).toBeVisible()
  await page.getByLabel('Access key ID').fill('AKIAEXAMPLEKEY000001')
  await page.getByLabel('Secret access key').fill('example-secret')
  await page.getByRole('button', { name: 'Add template' }).click()
  await expect(page.getByRole('status')).toHaveText('Added "Invoices".')
  await expect(page.getByRole('row', { name: /Invoices/ })).toBeVisible()
})

test('offers to copy the keys of another template', async ({ page }) => {
  await page
    .getByRole('group', { name: 'IAM user' })
    .getByRole('button', { name: 'Copy from a template' })
    .click()
  await expect(page.getByRole('combobox', { name: 'Copy the keys of' })).toBeVisible()
  await expect(page.getByLabel('Access key ID')).toBeHidden()
})

test('deletes a template only after confirming', async ({ page }) => {
  const row = page.getByRole('row', { name: /Alpha/ })
  const dialog = page.getByRole('dialog', { name: 'Delete this template?' })
  await row.getByRole('button', { name: 'Delete' }).click()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Delete' }).click()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toBeHidden()
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await menuItem(page, 'Templates').click()
  await expect(page.getByRole('row', { name: /Zeta/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Alpha/ })).toBeHidden()
})

test('renames a template, keeping its keys, and keeps the change', async ({ page }) => {
  await page.getByRole('row', { name: /Zeta/ }).getByRole('button', { name: 'Edit' }).click()
  const form = page.getByRole('form', { name: 'Edit Zeta' })
  await expect(form.getByLabel('S3 location')).toHaveValue('s3://example-bucket/zeta/')
  await expect(form.getByRole('button', { name: 'Keep the current keys' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(form.getByLabel('Access key ID')).toBeHidden()
  await form.getByLabel('Name').fill('Zeta reports')
  await form.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved "Zeta reports".')
  await expect(page.getByRole('form', { name: 'New template' })).toBeVisible()
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
  await menuItem(page, 'Templates').click()
  await expect(page.getByRole('row', { name: /Zeta reports/ })).toBeVisible()
})

test('stops editing with Cancel', async ({ page }) => {
  await page.getByRole('row', { name: /Alpha/ }).getByRole('button', { name: 'Edit' }).click()
  await page
    .getByRole('form', { name: 'Edit Alpha' })
    .getByRole('button', { name: 'Cancel' })
    .click()
  await expect(page.getByRole('form', { name: 'New template' })).toBeVisible()
})

test('adds an Azure template with its account key, marked as beta', async ({ page }) => {
  const platform = page.getByRole('group', { name: 'Platform' })
  await platform.getByRole('button', { name: /Azure Blob Storage/ }).click()
  await expect(platform.getByRole('button', { name: /Azure Blob Storage/ })).toContainText('Beta')
  await expect(page.getByText('Azure Blob Storage is in beta')).toBeVisible()
  await page.getByLabel('Name').fill('Backups')
  await page
    .getByLabel('Container URL')
    .fill('https://myaccount.blob.core.windows.net/backups/photos')
  await expect(
    page.getByText('Uploads go to https://myaccount.blob.core.windows.net/backups/photos/')
  ).toBeVisible()
  await expect(page.getByLabel('Access key ID')).toBeHidden()
  await page.getByLabel('Account key').fill(`${'A'.repeat(86)}==`)
  await page.getByRole('button', { name: 'Add template' }).click()
  await expect(page.getByRole('status')).toHaveText('Added "Backups".')
  const row = page.getByRole('row', { name: /Backups/ })
  await expect(row).toContainText('Azure Blob Storage')
  await expect(row).toContainText('Beta')
  await expect(row).toContainText('https://myaccount.blob.core.windows.net/backups/photos/')
})

test('adds a Google Drive template with an OAuth client of your own', async ({ page }) => {
  await page
    .getByRole('group', { name: 'Platform' })
    .getByRole('button', { name: /Google Drive/ })
    .click()
  await page.getByLabel('Name').fill('Family')
  await page.getByLabel('Google Drive folder').fill('My Drive')
  await expect(page.getByText('Uploads go to My Drive')).toBeVisible()
  await page.getByLabel('OAuth client ID').fill('1234-abc.apps.googleusercontent.com')
  await page.getByLabel('Client secret').fill('client-secret')
  await expect(page.getByText("Saving opens Google's sign-in page in your browser.")).toBeVisible()
  await page.getByRole('button', { name: 'Add template' }).click()
  await expect(page.getByRole('status')).toHaveText('Added "Family".')
  await expect(page.getByRole('row', { name: /Family/ })).toContainText('Google Drive')
})

test('copies keys only from templates on the same platform', async ({ page }) => {
  await page
    .getByRole('group', { name: 'Platform' })
    .getByRole('button', { name: /Google Drive/ })
    .click()
  await expect(
    page
      .getByRole('group', { name: 'Google sign-in' })
      .getByRole('button', { name: 'Copy from a template' })
  ).toBeHidden()
  await expect(page.getByLabel('OAuth client ID')).toBeVisible()
})

test('shows how to make an IAM user in CloudShell, and copies the script', async ({
  app,
  page
}) => {
  await page
    .getByRole('button', { name: 'No keys yet? Make an IAM user with AWS CloudShell' })
    .click()
  await expect(page.getByText('Paste this script and press Enter.')).toBeVisible()
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  const script = await copiedText(app)
  expect(script).toContain('aws iam create-user --user-name mousebucket')
  expect(script).toContain('aws iam create-access-key --user-name mousebucket')
})
