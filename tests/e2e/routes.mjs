import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

// BASE_URL must serve dev: __saleshiRoom (including pose and previewPanelGame) is DEV-only.
// ROUTES_BASE_URL optionally audits the built site without Vite/HMR in the public-page checks.
const BASE = process.env.BASE_URL ?? 'http://localhost:5174'
const ROUTES_BASE = process.env.ROUTES_BASE_URL ?? BASE
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))
const REAL_PAGES = [
  ['/', 'Saleshi — indie game studio [PLACEHOLDER]'],
  ['/games/', 'Games catalogue — Saleshi'],
  ['/games/placeholder-slug/', '[PLACEHOLDER] Untitled game — Saleshi'],
  ['/store/', 'Store and creator support — Saleshi'],
  ['/cart/', 'Your cart — Saleshi'],
  ['/checkout/', 'Simulated checkout — Saleshi'],
  ['/order/', 'Order confirmation — Saleshi'],
]
const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function auditRealPages(browser) {
  // A fresh context never receives previewPanelGame, so fixture links are not site links.
  const context = await browser.newContext()
  const audit = await context.newPage()
  const documents = new Map()
  try {
    for (const [index, [path, title]] of REAL_PAGES.entries()) {
      const url = new URL(path, ROUTES_BASE).href
      try {
        const response = await audit.goto(url)
        const snapshot = await audit.evaluate((html) => {
          const raw = new DOMParser().parseFromString(html, 'text/html')
          return {
            title: document.title,
            titleCount: document.querySelectorAll('title').length,
            lang: document.documentElement.lang,
            charset: document.characterSet,
            descriptions: [...document.querySelectorAll('meta[name="description"]')].map((meta) => meta.content.trim()),
            viewport: document.querySelector('meta[name="viewport"]')?.content ?? '',
            headings: [...document.querySelectorAll('h1')].map((heading) => heading.textContent.trim()),
            targets: [...document.querySelectorAll('[id], a[name]')].map((element) => element.id || element.getAttribute('name')),
            // Include authored noscript links as well as links rendered by JavaScript.
            links: [...new Set([...document.querySelectorAll('a[href]'), ...raw.querySelectorAll('a[href]')]
              .map((link) => link.getAttribute('href')))],
          }
        }, await response.text())
        snapshot.status = response.status()
        snapshot.html = response.headers()['content-type']?.includes('text/html') === true
        documents.set(url, snapshot)
        const problems = []
        if (snapshot.titleCount !== 1 || snapshot.title !== title) problems.push(`title=${JSON.stringify(snapshot.title)}`)
        if (snapshot.lang !== 'en') problems.push(`lang=${snapshot.lang}`)
        if (snapshot.charset !== 'UTF-8') problems.push(`charset=${snapshot.charset}`)
        if (snapshot.descriptions.length !== 1 || !snapshot.descriptions[0] || snapshot.descriptions[0].includes('{{')) problems.push('missing/unresolved description')
        if (!/width\s*=\s*device-width/.test(snapshot.viewport) || !/initial-scale\s*=\s*1(?:\s|,|$)/.test(snapshot.viewport)) problems.push('missing responsive viewport metadata')
        if (snapshot.headings.length !== 1 || !snapshot.headings[0] || snapshot.headings[0].includes('{{')) problems.push(`expected one nonempty h1, got ${JSON.stringify(snapshot.headings)}`)
        record(`R11-${index + 1}`, `${path} has page-specific title, metadata, lang and h1`, problems.length === 0,
          problems.join('; ') || `title=${snapshot.title}; h1=${snapshot.headings[0]}`)
      } catch (error) {
        documents.set(url, { status: 0, html: false, links: [], targets: [] })
        record(`R11-${index + 1}`, `${path} metadata can be inspected`, false, String(error))
      }
    }

    for (const [index, [path]] of REAL_PAGES.entries()) {
      const url = new URL(path, ROUTES_BASE).href
      const source = documents.get(url)
      const problems = []
      let localLinks = 0
      let fragments = 0
      if (source.status !== 200 || !source.html) problems.push(`page HTTP ${source.status}, HTML=${source.html}`)
      for (const href of source.links) {
        try {
          const target = new URL(href, url)
          if (!['http:', 'https:'].includes(target.protocol) || target.origin !== new URL(url).origin) continue
          localLinks += 1
          const fragment = decodeURIComponent(target.hash.slice(1))
          target.hash = ''
          if (!documents.has(target.href)) {
            const response = await context.request.get(target.href)
            const targets = response.headers()['content-type']?.includes('text/html')
              ? await audit.evaluate((html) => [...new DOMParser().parseFromString(html, 'text/html')
                .querySelectorAll('[id], a[name]')].map((element) => element.id || element.getAttribute('name')), await response.text())
              : []
            documents.set(target.href, { status: response.status(), targets })
          }
          const destination = documents.get(target.href)
          if (destination.status !== 200) problems.push(`${href}: HTTP ${destination.status}`)
          if (fragment) {
            fragments += 1
            if (!destination.targets.includes(fragment)) problems.push(`${href}: missing anchor target`)
          }
        } catch (error) {
          problems.push(`${href}: ${String(error)}`)
        }
      }
      record(`R12-${index + 1}`, `${path} and every local link resolve to HTTP routes and anchor targets`, problems.length === 0,
        `HTTP ${source.status}; ${localLinks} local links, ${fragments} fragments${problems.length ? `; ${problems.join('; ')}` : ''}`)
    }
  } finally {
    await context.close()
  }
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
  await page.screenshot({ path: OUT('m6-01-computer-catalogue.png'), fullPage: true })

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

  await page.goto(`${ROUTES_BASE}/games/`)
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

  // CDP dispatches browser-trusted touch input, not synthetic DOM events or mouse movement.
  const touchState = () => phone.evaluate(() => {
    const { pose, selectedGameId, station, mode } = window.__saleshiRoom.stats()
    return {
      pose, selectedGameId, station, mode, url: location.href,
      status: document.getElementById('selection-status').textContent,
      paperOpen: document.getElementById('paper-view').open,
      scrollX, scrollY,
    }
  })
  const beforeDrag = await touchState()
  const start = await phone.evaluate(() => {
    const canvas = document.querySelector('#room-viewport canvas')
    const rect = canvas.getBoundingClientRect()
    for (const fx of [0.3, 0.5, 0.6]) {
      for (const fy of [0.35, 0.55, 0.7]) {
        const x = Math.round(rect.left + rect.width * fx)
        const y = Math.round(rect.top + rect.height * fy)
        if (Array.from({ length: 7 }, (_, step) => document.elementFromPoint(x + step * 10, y + step * 6))
          .every((hit) => hit === canvas)) return { x, y }
      }
    }
    throw new Error('No unobstructed canvas path for the touch drag')
  })
  await phone.evaluate(() => {
    window.__m6TouchEvents = []
    window.__m6TouchListener = (event) => window.__m6TouchEvents.push({
      type: event.type, trusted: event.isTrusted, pointerType: event.pointerType, target: event.target.tagName,
    })
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(type, window.__m6TouchListener, true)
    }
  })
  const cdp = await phone.context().newCDPSession(phone)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] })
    for (let step = 1; step <= 6; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: start.x + step * 10, y: start.y + step * 6, id: 1 }],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
  await phone.waitForTimeout(250)
  const afterDrag = await touchState()
  const touchEvents = await phone.evaluate(() => {
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.removeEventListener(type, window.__m6TouchListener, true)
    }
    return window.__m6TouchEvents
  })
  record('R9a', 'emulated touch drag delivers trusted touch pointer events to the canvas',
    touchEvents.some((event) => event.type === 'pointerdown' && event.target === 'CANVAS')
    && touchEvents.some((event) => event.type === 'pointermove')
    && touchEvents.some((event) => event.type === 'pointerup')
    && touchEvents.every((event) => event.trusted && event.pointerType === 'touch' && event.type !== 'pointercancel'), JSON.stringify(touchEvents))
  const yawDelta = afterDrag.pose.yaw - beforeDrag.pose.yaw
  const pitchDelta = afterDrag.pose.pitch - beforeDrag.pose.pitch
  record('R9b', 'touch drag changes actual camera yaw and pitch', yawDelta > 0.02 && pitchDelta < -0.02,
    JSON.stringify({ before: beforeDrag.pose, after: afterDrag.pose, yawDelta, pitchDelta }))
  record('R9c', 'touch drag does not accidentally select, travel, open a note or scroll the page',
    beforeDrag.selectedGameId === null && afterDrag.selectedGameId === null
    && afterDrag.station === beforeDrag.station && afterDrag.mode === beforeDrag.mode
    && afterDrag.url === beforeDrag.url && afterDrag.status === beforeDrag.status
    && !afterDrag.paperOpen && afterDrag.scrollX === beforeDrag.scrollX && afterDrag.scrollY === beforeDrag.scrollY
    && Math.hypot(afterDrag.pose.x - beforeDrag.pose.x, afterDrag.pose.y - beforeDrag.pose.y, afterDrag.pose.z - beforeDrag.pose.z) < 0.001,
    JSON.stringify({ selected: afterDrag.selectedGameId, station: afterDrag.station, url: afterDrag.url, paperOpen: afterDrag.paperOpen }))

  await phone.locator('.proxy[data-interact-id="placeholder-slug"]').tap()
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
  await phone.screenshot({ path: OUT('m6-02-phone-panel.png'), fullPage: true })

  await phone.setViewportSize({ width: 844, height: 390 })
  await phone.goto(`${BASE}/?view=room&game=placeholder-slug`)
  await phone.waitForFunction(() => window.__saleshiRoom?.stats()?.selectedGameId === 'placeholder-slug' && window.__saleshiRoom.stats().drawCalls > 0)
  await phone.waitForTimeout(1000)
  const landscape = await phone.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const viewport = document.getElementById('room-viewport').getBoundingClientRect()
    const panelElement = document.getElementById('monitor-screen')
    const panel = panelElement.getBoundingClientRect()
    const controls = document.getElementById('room-controls').getBoundingClientRect()
    return {
      width: innerWidth, height: innerHeight,
      layout: window.__saleshiRoom.stats().panelLayout,
      roomWidth: viewport.width, roomHeight: viewport.height,
      stageTop: stage.top, stageBottom: stage.bottom, controlsBottom: controls.bottom,
      separate: panel.left >= viewport.right - 1,
      contained: panel.top >= stage.top - 1 && panel.bottom <= stage.bottom + 1
        && panel.left >= stage.left - 1 && panel.right <= stage.right + 1,
      firstViewport: stage.top >= 0 && stage.bottom <= innerHeight + 1 && controls.bottom <= innerHeight + 1,
      overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
      panelOverflow: panelElement.scrollWidth > panelElement.clientWidth + 1,
    }
  })
  record('R10', 'landscape phone room, panel and controls fit 844x390 without overflow',
    landscape.width === 844 && landscape.height === 390 && landscape.layout === 'side'
    && landscape.roomWidth >= 200 && landscape.roomHeight >= 192 && landscape.separate
    && landscape.contained && landscape.firstViewport && !landscape.overflow && !landscape.panelOverflow, JSON.stringify(landscape))
  await phone.screenshot({ path: OUT('m6-08-phone-landscape.png'), fullPage: true })
  await phone.close()

  const noWebgl = await browser.newContext()
  await noWebgl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).includes('webgl') ? null : original.call(this, type, ...args)
    }
  })
  const fallback = await noWebgl.newPage()
  await fallback.goto(`${ROUTES_BASE}/`)
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
  await staticPage.goto(`${ROUTES_BASE}/`)
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
}

// Still audit all real pages if a dev-only room check failed (for example, an HMR outage).
try {
  await auditRealPages(browser)
} catch (error) {
  record('R13', 'real-page audit completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exitCode = 1
