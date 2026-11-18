import { downloadTemplate, expect, menuItem, test, uploadTemplate } from '../../../support/app'

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
  await expect(page.getByLabel('Copy the keys of')).toBeVisible()
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
