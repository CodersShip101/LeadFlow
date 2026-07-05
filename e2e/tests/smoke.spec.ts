import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k: string) => env.match(new RegExp(`${k}=(.+)`))![1].trim()

test.describe('Flaiir smoke', () => {
  test('login then every core dashboard page loads with content', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('#email', get('TEST_USER_EMAIL'))
    await page.fill('#password', get('TEST_USER_PASSWORD'))
    await page.click('button[type=submit]')
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    const pages = [
      '/dashboard', '/dashboard/saved', '/dashboard/applied',
      '/dashboard/analytics', '/dashboard/templates', '/dashboard/profile',
      '/dashboard/billing',
    ]
    for (const path of pages) {
      const resp = await page.goto(path)
      expect(resp?.status(), `${path} status`).toBeLessThan(400)
      await page.waitForTimeout(800)
      const text = (await page.locator('body').innerText()).trim()
      expect(text.length, `${path} has content`).toBeGreaterThan(20)
    }
  })

  test('public landing + signup render', async ({ page }) => {
    const landing = await page.goto('/')
    expect(landing?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toContainText(/Flaiir|leads|freelance/i)

    const signup = await page.goto('/auth/signup')
    expect(signup?.status()).toBeLessThan(400)
    await expect(page.locator('#email')).toBeVisible()
  })

  test('GDPR data export returns the user\'s data', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('#email', get('TEST_USER_EMAIL'))
    await page.fill('#password', get('TEST_USER_PASSWORD'))
    await page.click('button[type=submit]')
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    const out = await page.evaluate(async () => {
      const r = await fetch('/api/account/export')
      return { ok: r.ok, json: await r.json() }
    })
    expect(out.ok).toBeTruthy()
    expect(out.json).toHaveProperty('profile')
    expect(out.json).toHaveProperty('applications')
  })
})
