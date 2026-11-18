import { downloadTemplate, expect, menuItem, test, uploadTemplate } from '../../support/app'

test.describe('with no templates', () => {
  test('lands on Home, which leads to Templates', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
    await expect(page.getByText('Add your first template')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Upload/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Add a template' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Templates' })).toBeVisible()
    await expect(page.getByText('Add your first template')).toBeVisible()
  })

  test('still opens How it works and Settings', async ({ page }) => {
    await menuItem(page, 'How it works').click()
    await expect(page.getByRole('heading', { level: 1, name: 'How it works' })).toBeVisible()
    await menuItem(page, 'Settings').click()
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
  })
})

test.describe('with templates', () => {
  test.use({
    setup: {
      templates: [uploadTemplate('Reports'), downloadTemplate('Archive')],
      settings: { welcomeSeen: true }
    }
  })

  test('opens each page from the side menu and marks it', async ({ page }) => {
    for (const name of ['Home', 'Templates', 'How it works', 'Settings']) {
      await menuItem(page, name).click()
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await expect(menuItem(page, name)).toHaveAttribute('aria-current', 'page')
    }
  })
})
