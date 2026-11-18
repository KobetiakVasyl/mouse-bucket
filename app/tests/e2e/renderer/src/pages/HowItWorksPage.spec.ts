import { expect, menuItem, test } from '../../../support/app'

test('explains the app, with the CloudShell script and a policy for each template type', async ({
  page
}) => {
  await menuItem(page, 'How it works').click()
  for (const section of ['Templates', 'Uploading', 'Downloading and restoring', 'Your keys']) {
    await expect(page.getByRole('heading', { level: 2, name: section })).toBeVisible()
  }
  for (const kind of ['Upload', 'Download']) {
    await expect(
      page.getByRole('heading', { level: 3, name: new RegExp(`^${kind} templates:`) })
    ).toBeVisible()
  }
  await expect(page.getByText(/aws iam create-user --user-name mousebucket/)).toBeVisible()
})
