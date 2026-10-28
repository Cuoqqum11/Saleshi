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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

try {
  await page.goto(`${BASE}/?view=room&game=placeholder-slug`)
  await page.waitForFunction(() => window.__saleshiRoom?.stats()?.selectedGameId === 'placeholder-slug' && window.__saleshiRoom.stats().drawCalls > 0)
  await page.waitForTimeout(1000)
  const detailsLinkStyle = await page.locator('.screen-actions a.screen-link').evaluate((element) => {
    const style = getComputedStyle(element)
    return { text: style.color, background: style.backgroundColor }
  })
  record('R1', 'direct room URL restores selection and readable computer state', (await page.locator('#monitor-screen h2').textContent()).includes('Untitled game')
    && (await page.locator('#selection-status').textContent()).includes('Restored')
    && detailsLinkStyle.text !== detailsLinkStyle.background, JSON.stringify(detailsLinkStyle))
  await page.screenshot({ path: OUT('m5-01-computer-catalogue.png'), fullPage: true })

  await page.evaluate(() => window.__saleshiRoom.previewPanelGame({
    id: 'placeholder-slug', title: '[TEST FIXTURE] Panel states', statusLabel: 'Fixture only',
    summary: 'Synthetic component fixture; not a real game or site content.',
    cover: { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic one-pixel test cover' },
    screenshots: [
      { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic test screenshot one' },
      { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic test screenshot two' },
    ],
    availability: {
      details: { available: true }, browserDemo: { available: true, url: '/fixture-demo/' },
      download: { available: true, url: '/fixture-download/' }, itch: { available: true, url: 'https://example.invalid/fixture' },
    },
  }))
  await page.waitForSelector('.screen-screenshots img')
  const fixture = await page.evaluate(() => ({
    cover: Boolean(document.querySelector('.screen-media img')),
    screenshots: document.querySelectorAll('.screen-screenshots img').length,
    actions: [...document.querySelectorAll('.screen-actions a')].map((a) => a.getAttribute('href')),
  }))
  record('R2', 'test-only fixture proves cover, screenshots and available action rendering', fixture.cover && fixture.screenshots === 2
    && fixture.actions.includes('/fixture-demo/') && fixture.actions.includes('/fixture-download/')
    && fixture.actions.includes('https://example.invalid/fixture'), JSON.stringify(fixture))

  await page.goto(`${BASE}/games/`)
  await page.locator('.game-card h3 a').click()
  await page.waitForURL('**/games/placeholder-slug/')
  await page.goBack()
  await page.waitForURL('**/games/')
  await page.goForward()
  await page.waitForURL('**/games/placeholder-slug/')
  record('R3', 'real routes support normal browser back and forward navigation', await page.locator('h1').textContent() === '[PLACEHOLDER] Untitled game')

  for (const width of [768, 900]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(`${BASE}/?view=room&game=placeholder-slug`)
    await page.waitForFunction(() => window.__saleshiRoom?.stats()?.drawCalls > 0)
    const layout = await page.evaluate(() => {
      const viewport = document.getElementById('room-viewport').getBoundingClientRect()
      const panel = document.getElementById('monitor-screen').getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth > innerWidth, separate: panel.left >= viewport.right - 1 }
    })
    record(`R4-${width}`, `room and panel remain usable at ${width}px`, !layout.overflow && layout.separate, JSON.stringify(layout))
  }

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await phone.goto(`${BASE}/?view=room`)
  await phone.waitForFunction(() => window.__saleshiRoom?.stats()?.drawCalls > 0)
  await phone.locator('.proxy[data-interact-id="placeholder-slug"]').click()
  await phone.waitForTimeout(1000)
  const mobile = await phone.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const viewport = document.getElementById('room-viewport').getBoundingClientRect()
    const panel = document.getElementById('monitor-screen').getBoundingClientRect()
    return {
      layout: window.__saleshiRoom.stats().panelLayout,
      separate: panel.top >= viewport.bottom - 1,
      panelRatio: panel.height / stage.height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }
  })
  record('R5', 'phone selection uses a bounded drawer instead of covering the room', mobile.layout === 'drawer'
    && mobile.separate && mobile.panelRatio <= 0.46 && !mobile.overflow, JSON.stringify(mobile))
  await phone.screenshot({ path: OUT('m5-02-phone-panel.png'), fullPage: true })
  await phone.close()

  const noWebgl = await browser.newContext()
  await noWebgl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).includes('webgl') ? null : original.call(this, type, ...args)
    }
  })
  const fallback = await noWebgl.newPage()
  await fallback.goto(`${BASE}/`)
  record('R6', 'no-WebGL entry retains useful catalogue navigation and no fake room control', await fallback.locator('#stage').isHidden()
    && await fallback.locator('[data-action="enter-room"]').isDisabled()
    && await fallback.locator('.game-card h3 a').count() === 1)
  await noWebgl.close()

  const saveData = await browser.newContext()
  await saveData.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }))
  const reduced = await saveData.newPage()
  await reduced.goto(`${BASE}/`)
  record('R7', 'reduced-data preference starts the text view with an optional room launcher', !(await reduced.evaluate(() => window.__saleshiRoom.isRunning()))
    && (await reduced.locator('#room-status').textContent()).includes('reduced data')
    && await reduced.locator('[data-action="enter-room"]').isEnabled())
  await saveData.close()

  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await staticPage.goto(`${BASE}/`)
  const noJsState = {
    cards: await staticPage.locator('.game-card h3 a').count(),
    launcherHidden: await staticPage.locator('#room-launcher').isHidden(),
    statusHidden: await staticPage.locator('#room-status').isHidden(),
    storeVisible: await staticPage.getByRole('link', { name: 'Store', exact: true }).isVisible(),
  }
  record('R8', 'no-JS homepage has real shared content and no dead room launcher', noJsState.cards === 1
    && noJsState.launcherHidden && noJsState.statusHidden && noJsState.storeVisible, JSON.stringify(noJsState))
  await noJs.close()
} catch (error) {
  record('R0', 'route and fallback suite completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exitCode = 1
