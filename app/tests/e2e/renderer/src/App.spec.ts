import { downloadTemplate, expect, menuItem, test, uploadTemplate } from '../../support/app'

test.describe('with no templates', () => {
  test('lands on Templates, even when Home is chosen', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1, name: 'Templates' })
    await expect(heading).toBeVisible()
    await expect(page.getByText('Add your first template')).toBeVisible()
    await menuItem(page, 'Home').click()
    await expect(heading).toBeVisible()
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
