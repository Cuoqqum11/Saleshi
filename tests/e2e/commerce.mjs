import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5174'
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))
const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

try {
  await page.goto(`${BASE}/games/`)
  const catalogue = await page.evaluate(() => ({
    title: document.querySelector('.game-card h3')?.textContent.trim(),
    cards: document.querySelectorAll('.game-card').length,
  }))
  record('C1', 'catalogue renders from shared game data', catalogue.cards === 1 && catalogue.title.includes('Untitled game'), JSON.stringify(catalogue))
  await page.screenshot({ path: OUT('m5-03-catalogue.png'), fullPage: true })

  await page.click('.game-card h3 a')
  await page.waitForURL('**/games/placeholder-slug/')
  record('C2', 'catalogue navigates to reusable game details', await page.locator('h1').textContent() === '[PLACEHOLDER] Untitled game'
    && await page.locator('#support a[href^="/store/"]').count() === 1)

  await page.goto(`${BASE}/store/`)
  const form = page.locator('[data-offering-form="studio-support"]')
  await form.locator('input').fill('7.25')
  await form.locator('button').click()
  record('C3', 'store adds a validated contribution', (await page.locator('[data-offering-feedback]').textContent()).includes('£7.25'))
  await page.screenshot({ path: OUT('m5-04-store.png'), fullPage: true })

  await page.goto(`${BASE}/cart/`)
  await page.waitForSelector('[data-offering-id="studio-support"]')
  await page.reload()
  await page.waitForSelector('[data-offering-id="studio-support"]')
  record('C4', 'cart line survives navigation and reload', await page.locator('#cart-amount-studio-support').inputValue() === '7.25'
    && (await page.locator('#cart-content').textContent()).includes('Server-checked total: £7.25'))

  await page.locator('#cart-amount-studio-support').fill('12.50')
  await page.getByRole('button', { name: 'Update amount' }).click()
  await page.waitForFunction(() => document.getElementById('cart-content').textContent.includes('Server-checked total: £12.50'))
  record('C5', 'cart updates a contribution without adding a quantity', Number(await page.locator('#cart-amount-studio-support').inputValue()) === 12.5
    && await page.locator('input[type="number"][name="quantity"]').count() === 0)
  await page.screenshot({ path: OUT('m5-05-cart.png'), fullPage: true })

  await page.getByRole('button', { name: 'Remove Voluntary studio support' }).click()
  record('C6', 'cart removes a line and shows an honest empty state', await page.getByRole('heading', { name: 'Your cart is empty' }).isVisible())

  await page.goto(`${BASE}/store/`)
  await form.locator('input').fill('12.50')
  await form.locator('button').click()
  await page.goto(`${BASE}/checkout/`)
  await page.waitForFunction(() => document.getElementById('checkout-review').textContent.includes('£12.50'))
  await page.screenshot({ path: OUT('m5-06-checkout.png'), fullPage: true })
  await page.getByLabel('Name', { exact: true }).fill('X')
  await page.getByLabel('Email address').fill('invalid')
  await page.getByRole('button', { name: 'Create simulated order — no payment' }).click()
  record('C7', 'checkout validates minimal customer information', (await page.locator('#checkout-error').textContent()).includes('at least two characters'))

  const tampered = await page.request.post(`${BASE}/api/orders`, {
    data: {
      customer: { name: 'Test User', email: 'test@example.com' },
      lines: [{ offeringId: 'studio-support', amount: 0.01 }],
      total: 0.01,
    },
  })
  record('C8', 'server rejects a tampered contribution even with a forged total', tampered.status() === 400)

  await page.getByLabel('Name', { exact: true }).fill('Test User')
  await page.getByLabel('Email address').fill('test@example.com')
  await page.getByRole('button', { name: 'Create simulated order — no payment' }).click()
  await page.waitForURL('**/order/?reference=SAL-*')
  const confirmation = await page.locator('main').textContent()
  const reference = new URL(page.url()).searchParams.get('reference')
  record('C9', 'checkout creates and displays a simulated order', confirmation.includes('No payment was taken')
    && confirmation.includes('£12.50') && /^SAL-[A-F0-9]{32}$/.test(reference), reference)
  await page.screenshot({ path: OUT('m5-07-order-confirmation.png'), fullPage: true })

  await page.reload()
  await page.waitForFunction(() => document.querySelector('main').textContent.includes('Simulated order confirmed'))
  const retrieved = await page.request.get(`${BASE}/api/orders/${reference}`)
  const orderBody = await retrieved.json()
  record('C10', 'safe reference retrieves one persistent order without exposing customer data', retrieved.ok()
    && orderBody.order.lines.length === 1 && orderBody.order.total === 12.5 && !('customerEmail' in orderBody.order))

  await page.goto(`${BASE}/cart/`)
  record('C11', 'successful checkout clears the browser cart', await page.getByRole('heading', { name: 'Your cart is empty' }).isVisible())

  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await staticPage.goto(`${BASE}/store/`)
  const staticText = await staticPage.locator('main').textContent()
  record('C12', 'no-JS store keeps offering content and hides nonfunctional controls', staticText.includes('GBP 1.00')
    && staticText.includes('No payment is taken') && await staticPage.locator('[data-offering-form]').isHidden())
  await noJs.close()

  record('C13', 'commerce pages produce no uncaught browser errors', errors.length === 0, errors.join('; '))
} catch (error) {
  record('C0', 'commerce suite completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exitCode = 1
