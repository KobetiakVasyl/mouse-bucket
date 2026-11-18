import { expect, menuItem, test } from '../../../support/app'

test('explains the app and shows a policy for each template type', async ({ page }) => {
  await menuItem(page, 'How it works').click()
  for (const section of ['Templates', 'Uploading', 'Downloading and restoring', 'Your keys']) {
    await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible()
  }
  await expect(page.getByText('"s3:PutObject"')).toBeVisible()
  await expect(page.getByText('"s3:RestoreObject"')).toBeVisible()
})
