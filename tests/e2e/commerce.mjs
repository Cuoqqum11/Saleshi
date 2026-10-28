import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5174'
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))
const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

try {
  const health = await (await page.request.get(`${BASE}/api/health`)).json()
  console.log(`Commerce API adapter: ${health.databaseDriver}; ${BASE}`)
  await page.goto(`${BASE}/?view=room`)
  await page.locator('.proxy[data-interact-id="placeholder-slug"]').click()
  await page.locator('#monitor-screen a[href="/games/placeholder-slug/"]').click()
  await page.waitForURL('**/games/placeholder-slug/')
  await page.locator('#support a[href^="/store/"]').click()
  record('C24', 'room cassette leads through real game details to its store offering', new URL(page.url()).pathname === '/store/'
    && await page.locator('[data-offering-form="studio-support"]').isVisible())
  await page.goto(`${BASE}/games/`)
  const catalogue = await page.evaluate(() => ({
    title: document.querySelector('.game-card h3')?.textContent.trim(),
    cards: document.querySelectorAll('.game-card').length,
  }))
  record('C1', 'catalogue renders from shared game data', catalogue.cards === 1 && catalogue.title.includes('Untitled game'), JSON.stringify(catalogue))
  await page.screenshot({ path: OUT('m6-03-catalogue.png'), fullPage: true })

  await page.click('.game-card h3 a')
  await page.waitForURL('**/games/placeholder-slug/')
  record('C2', 'catalogue navigates to reusable game details', await page.locator('h1').textContent() === '[PLACEHOLDER] Untitled game'
    && await page.locator('#support a[href^="/store/"]').count() === 1)

  await page.goto(`${BASE}/store/`)
  const form = page.locator('[data-offering-form="studio-support"]')
  await form.locator('input').fill('7.25')
  await form.locator('button').click()
  record('C3', 'store adds a validated contribution', (await page.locator('[data-offering-feedback]').textContent()).includes('£7.25'))
  await page.screenshot({ path: OUT('m6-04-store.png'), fullPage: true })

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
  await page.screenshot({ path: OUT('m6-05-cart.png'), fullPage: true })

  await page.getByRole('button', { name: 'Remove Voluntary studio support' }).click()
  record('C6', 'cart removes a line and shows an honest empty state', await page.getByRole('heading', { name: 'Your cart is empty' }).isVisible())

  await page.goto(`${BASE}/store/`)
  await form.locator('input').fill('12.50')
  await form.locator('button').click()
  await page.goto(`${BASE}/checkout/`)
  await page.waitForFunction(() => document.getElementById('checkout-review').textContent.includes('£12.50'))
  await page.screenshot({ path: OUT('m6-06-checkout.png'), fullPage: true })
  await page.getByLabel('Name', { exact: true }).fill('X')
  await page.getByLabel('Email address').fill('invalid')
  await page.getByRole('button', { name: 'Create simulated order — no payment' }).click()
  record('C7', 'checkout associates validation with the invalid field', (await page.locator('#customer-name-error').textContent()).includes('between 2 and 100')
    && await page.getByLabel('Name', { exact: true }).getAttribute('aria-invalid') === 'true'
    && await page.getByLabel('Name', { exact: true }).evaluate((input) => input === document.activeElement))

  const tampered = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
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
  await page.screenshot({ path: OUT('m6-07-order-confirmation.png'), fullPage: true })

  await page.reload()
  await page.waitForFunction(() => document.querySelector('main').textContent.includes('Simulated order confirmed'))
  const retrieved = await page.request.get(`${BASE}/api/orders/${reference}`)
  const orderBody = await retrieved.json()
  record('C10', 'safe reference retrieves one persistent order without exposing customer data', retrieved.ok()
    && retrieved.headers()['cache-control'] === 'no-store'
    && orderBody.order.lines.length === 1 && orderBody.order.total === 12.5 && !('customerEmail' in orderBody.order))

  const retryKey = crypto.randomUUID()
  const retryOptions = {
    headers: { 'Idempotency-Key': retryKey },
    data: {
      customer: { name: 'Retry User', email: 'retry@example.com' },
      lines: [{ offeringId: 'studio-support', amount: 6 }],
    },
  }
  const firstRetry = await page.request.post(`${BASE}/api/orders`, retryOptions)
  const secondRetry = await page.request.post(`${BASE}/api/orders`, retryOptions)
  const firstRetryBody = await firstRetry.json()
  const secondRetryBody = await secondRetry.json()
  record('C11', 'an identical checkout retry returns the original order', firstRetry.status() === 201
    && secondRetry.status() === 201 && firstRetryBody.order.reference === secondRetryBody.order.reference)

  const conflict = await page.request.post(`${BASE}/api/orders`, {
    ...retryOptions,
    data: { ...retryOptions.data, lines: [{ offeringId: 'studio-support', amount: 7 }] },
  })
  record('C12', 'a checkout identifier cannot be reused for different details', conflict.status() === 409)

  const missingKey = await page.request.post(`${BASE}/api/orders`, { data: retryOptions.data })
  record('C13', 'order creation requires a valid checkout interaction identifier', missingKey.status() === 400)

  const malformed = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Content-Type': 'application/json' },
    data: '{"customer":',
  })
  const oversized = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Content-Type': 'application/json' },
    data: `{"customer":"${'x'.repeat(21000)}"}`,
  })
  record('C14', 'malformed and oversized JSON receive safe client errors', malformed.status() === 400
    && (await malformed.json()).error === 'Request body must be valid JSON.' && oversized.status() === 413
    && (await oversized.json()).error === 'Request body must be 20 KB or smaller.')

  await page.goto(`${BASE}/cart/`)
  record('C15', 'successful checkout clears the browser cart', await page.getByRole('heading', { name: 'Your cart is empty' }).isVisible())

  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await staticPage.goto(`${BASE}/store/`)
  const staticText = await staticPage.locator('main').textContent()
  record('C16', 'no-JS store keeps offering content and hides nonfunctional controls', staticText.includes('GBP 1.00')
    && staticText.includes('No payment is taken') && await staticPage.locator('[data-offering-form]').isHidden())
  await staticPage.goto(`${BASE}/checkout/`)
  const noJsCheckout = await staticPage.locator('#checkout-form').isHidden()
    && await staticPage.getByRole('link', { name: 'store page', exact: true }).isVisible()
  await staticPage.goto(`${BASE}/order/`)
  record('C23', 'no-JS checkout hides dead controls and order retains a heading', noJsCheckout
    && await staticPage.getByRole('heading', { level: 1, name: 'Order confirmation' }).isVisible())
  await noJs.close()

  for (const width of [390, 768, 900, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`${BASE}/store/`)
    await form.locator('input').fill('8')
    await form.locator('button').click()
    await page.goto(`${BASE}/cart/`)
    await page.waitForFunction(() => document.getElementById('cart-content').textContent.includes('Server-checked total: £8.00'))
    let fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    await page.getByRole('link', { name: 'Continue to simulated checkout' }).click()
    await page.waitForFunction(() => document.getElementById('checkout-review').textContent.includes('£8.00'))
    fits &&= await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Tab')
      if (await page.evaluate(() => document.activeElement?.id === 'customer-name')) break
    }
    const reachedName = await page.evaluate(() => document.activeElement?.id === 'customer-name')
    await page.keyboard.type('Keyboard Test')
    await page.keyboard.press('Tab')
    await page.keyboard.type('invalid')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    const emailError = await page.locator('#customer-email').evaluate((input) =>
      input === document.activeElement && input.getAttribute('aria-invalid') === 'true'
        && input.getAttribute('aria-describedby').includes('customer-email-error'))
    await page.keyboard.press('Control+A')
    await page.keyboard.type('keyboard@example.com')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/order/?reference=SAL-*')
    await page.waitForFunction(() => document.querySelector('main').textContent.includes('Simulated order confirmed'))
    fits &&= await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    record(`C18-${width}`, `keyboard cart-to-order journey and error focus at ${width}px`, fits && reachedName && emailError)
    if (width === 390) await page.screenshot({ path: OUT('m6-09-phone-order.png'), fullPage: true })
  }

  await page.goto(`${BASE}/store/`)
  await form.locator('input').fill('9')
  await form.locator('button').click()
  await page.goto(`${BASE}/checkout/`)
  await page.waitForFunction(() => document.getElementById('checkout-review').textContent.includes('£9.00'))
  await page.getByLabel('Name', { exact: true }).fill('Network Retry')
  await page.getByLabel('Email address').fill('network@example.com')
  let committedReference
  const requestKeys = []
  await page.route('**/api/orders', async (route) => {
    requestKeys.push(route.request().headers()['idempotency-key'])
    const response = await route.fetch()
    const body = await response.json()
    if (!committedReference) {
      committedReference = body.order.reference
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Test fixture: response delivery interrupted.' }) })
    } else {
      await route.fulfill({ response })
    }
  })
  const submit = page.getByRole('button', { name: 'Create simulated order — no payment' })
  await submit.click()
  await page.waitForFunction(() => document.getElementById('checkout-error').textContent.includes('response delivery interrupted'))
  const retryEnabled = await submit.isEnabled()
    && await page.locator('#checkout-error').evaluate((element) => element === document.activeElement)
    && await page.evaluate(() => JSON.parse(localStorage.getItem('saleshi-cart-v1')).length === 1)
  await page.screenshot({ path: OUT('m6-10-checkout-retry.png'), fullPage: true })
  await submit.click()
  await page.waitForURL('**/order/?reference=SAL-*')
  record('C19', 'lost-response retry retains cart and identifier without duplicating the committed order', retryEnabled
    && requestKeys.length === 2 && requestKeys[0] === requestKeys[1]
    && new URL(page.url()).searchParams.get('reference') === committedReference)
  await page.unroute('**/api/orders')

  for (const fixture of [
    { id: 'C25', body: '{"order":', error: 'unreadable response', name: 'truncated success JSON' },
    { id: 'C26', body: '{}', error: 'did not return an order reference', name: 'missing success reference' },
  ]) {
    await page.goto(`${BASE}/store/`)
    await form.locator('input').fill('9')
    await form.locator('button').click()
    await page.goto(`${BASE}/checkout/`)
    await page.waitForFunction(() => document.getElementById('checkout-review').textContent.includes('£9.00'))
    await page.getByLabel('Name', { exact: true }).fill('Response Retry')
    await page.getByLabel('Email address').fill('response@example.com')
    const keys = []
    let originalReference
    await page.route('**/api/orders', async (route) => {
      keys.push(route.request().headers()['idempotency-key'])
      const response = await route.fetch()
      if (keys.length === 1) {
        originalReference = (await response.json()).order.reference
        await route.fulfill({ status: 201, contentType: 'application/json', body: fixture.body })
      } else {
        await route.fulfill({ response })
      }
    })
    await submit.click()
    await page.waitForFunction((text) => document.getElementById('checkout-error').textContent.includes(text), fixture.error)
    const retained = await submit.isEnabled()
      && await page.locator('#checkout-error').evaluate((element) => element === document.activeElement)
      && await page.evaluate(() => JSON.parse(localStorage.getItem('saleshi-cart-v1')).length === 1)
    await submit.click()
    await page.waitForURL('**/order/?reference=SAL-*')
    record(fixture.id, `${fixture.name} preserves the cart and safely retries the committed order`, retained
      && keys.length === 2 && keys[0] === keys[1]
      && new URL(page.url()).searchParams.get('reference') === originalReference)
    await page.unroute('**/api/orders')
  }

  await page.goto(`${BASE}/store/`)
  await form.locator('input').fill('5')
  await form.locator('button').click()
  await page.route('**/api/cart/quote', (route) => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'The server could not complete this request.' }),
  }))
  await page.goto(`${BASE}/checkout/`)
  await page.getByRole('link', { name: 'Return to cart', exact: true }).waitFor()
  record('C20', 'failed quote hides checkout and offers a working cart return', await page.locator('#checkout-form').isHidden())
  await page.getByRole('link', { name: 'Return to cart', exact: true }).click()
  await page.waitForURL('**/cart/')
  await page.unroute('**/api/cart/quote')

  const forged = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { customer: { name: 'Price Test', email: 'price@example.com' },
      lines: [{ offeringId: 'studio-support', amount: 5, lineTotal: 0.01 }], total: 0.01, currency: 'USD' },
  })
  const forgedBody = await forged.json()
  record('C21', 'server ignores forged currency and totals for a valid amount', forged.status() === 201
    && forgedBody.order.total === 5 && forgedBody.order.currency === 'GBP' && forgedBody.order.lines[0].lineTotal === 5)
  const unknown = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { customer: { name: 'Unknown Test', email: 'unknown@example.com' }, lines: [{ offeringId: 'unknown', amount: 5 }] },
  })
  record('C22', 'unknown offerings and malformed references are rejected', unknown.status() === 400
    && (await page.request.get(`${BASE}/api/orders/not-a-reference`)).status() === 404)
  const duplicateAlias = await page.request.post(`${BASE}/api/orders`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { customer: { name: 'Alias Test', email: 'alias@example.com' },
      lines: [{ offeringId: 'studio-support', amount: 5 }, { offeringId: 'STUDIO-SUPPORT', amount: 5 }] },
  })
  record('C27', 'duplicate offering aliases cannot create an order', duplicateAlias.status() === 400)
  record('C17', 'commerce pages produce no uncaught browser errors', errors.length === 0, errors.join('; '))
} catch (error) {
  record('C0', 'commerce suite completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exitCode = 1
