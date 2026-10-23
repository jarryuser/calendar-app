import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
}
test.beforeEach(async ({ request }) => { await request.get('/api/__test/reset') })

test('login, create, reload through HttpOnly session and logout', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByPlaceholder('Event title').fill('Browser event')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText('Browser event', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Browser event', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeVisible()
})

test('ICS import and complete JSON backup download', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.locator('input[type=file][accept=".ics"]').setInputFiles({ name: 'event.ics', mimeType: 'text/calendar', buffer: Buffer.from(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:browser-import\r\nDTSTART;VALUE=DATE:${new Date().toISOString().slice(0, 10).replaceAll('-', '')}\r\nDURATION:P1D\r\nSUMMARY:Imported event\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`) })
  await expect(page.getByText('Imported 1 event')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByText('Imported event', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('calendar-backup.json')
})

test('month drag reschedules an event and survives reload', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByPlaceholder('Event title').fill('Drag event')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const chip = page.getByRole('button').filter({ has: page.getByText('Drag event', { exact: true }) })
  const source = await chip.boundingBox()
  const cells = page.locator('[data-day-key]')
  const target = await cells.last().boundingBox()
  expect(source).not.toBeNull(); expect(target).not.toBeNull()
  await page.mouse.move(source!.x + 20, source!.y + 8)
  await page.mouse.down()
  await page.mouse.move(source!.x + 35, source!.y + 8, { steps: 5 })
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect(cells.last().getByText('Drag event', { exact: true })).toBeVisible()
  await page.reload()
  await expect(cells.last().getByText('Drag event', { exact: true })).toBeVisible()
})

test('mobile settings, language and timezone are accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Timezone', exact: true }).selectOption('America/New_York')
  await page.getByRole('dialog').getByRole('combobox', { name: 'Language', exact: true }).selectOption('ru')
  await expect(page.getByRole('button', { name: 'Скачать резервную копию', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Настройки', exact: true })).toBeVisible()
})

test('keyboard navigation and accessible settings controls', async ({ page }) => {
  await login(page)
  await page.keyboard.press('n')
  await expect(page.getByPlaceholder('Event title')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([])
})
