/**
 * Gate checks that the in-app browser channel could not perform:
 * E1/E2 — the room is the default entry experience, and the text view is still opt-in;
 * G1/G2 — real trusted Enter/Space activation of a focused cassette button;
 * G3 and the screenshots — full-page captures in which the HTML computer panel and the
 * object chips are visible.
 *
 * Run with: node tests/e2e/gate.mjs   (dev server must be running)
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))

const results = []
const record = (id, name, pass, detail) => {
  results.push({ id, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function tabToCassette(page) {
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab')
    const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    if (label.startsWith('Cassette:')) return true
  }
  return false
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

try {
  // --- E1: the room is the entry experience on a capable desktop ------------------
  // No click, no query string: a plain load must start the room and give it the whole
  // first viewport, with the text fallbacks continuing below the fold.
  await page.goto(`${BASE}/`)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  const layout = await page.evaluate(() => {
    const rect = (id) => document.getElementById(id).getBoundingClientRect()
    const stage = rect('stage')
    const controls = rect('room-controls')
    const letter = rect('studio-letter')
    return {
      running: window.__saleshiRoom.isRunning(),
      stageTop: stage.top,
      controlsBottom: controls.bottom,
      letterTop: letter.top,
      vh: window.innerHeight,
      orientation: document.getElementById('selection-status').textContent.trim(),
    }
  })
  record('E1', 'a plain load starts the room and gives it the first viewport',
    layout.running && layout.stageTop < 90 && layout.controlsBottom <= layout.vh + 2
      && layout.letterTop >= layout.vh - 2 && layout.orientation.length > 0,
    `stageTop=${layout.stageTop.toFixed(0)} controlsBottom=${layout.controlsBottom.toFixed(0)} letterTop=${layout.letterTop.toFixed(0)} vh=${layout.vh}`)

  // --- E2: ?view=list is still the text-first fallback ----------------------------
  await page.goto(`${BASE}/?view=list`)
  await page.waitForTimeout(400)
  const listView = await page.evaluate(() => ({
    running: window.__saleshiRoom.isRunning(),
    launcherVisible: document.getElementById('room-launcher').offsetParent !== null,
    launchEnabled: document.querySelector('[data-action="enter-room"]')?.disabled === false,
    letterTop: document.getElementById('studio-letter').getBoundingClientRect().top,
    vh: window.innerHeight,
  }))
  record('E2', '?view=list keeps the room off and the text view first',
    listView.running === false && listView.launcherVisible && listView.launchEnabled
      && listView.letterTop < listView.vh,
    `running=${listView.running} launcher=${listView.launcherVisible} letterTop=${listView.letterTop.toFixed(0)}`)

  // --- E3: a narrow screen that explicitly enters still lays out ------------------
  const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await narrow.goto(`${BASE}/?view=room`)
  await narrow.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  const narrowLayout = await narrow.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const controls = document.getElementById('room-controls').getBoundingClientRect()
    return {
      scrollWidth: document.documentElement.scrollWidth,
      stageHeight: stage.height,
      controlsBottom: controls.bottom,
      vh: window.innerHeight,
    }
  })
  record('E3', 'a narrow screen that explicitly enters the room lays out without overflow',
    narrowLayout.scrollWidth <= 391 && narrowLayout.stageHeight >= 200
      && narrowLayout.controlsBottom <= narrowLayout.vh + 2,
    `scrollWidth=${narrowLayout.scrollWidth} stageHeight=${narrowLayout.stageHeight.toFixed(0)} controlsBottom=${narrowLayout.controlsBottom.toFixed(0)} vh=${narrowLayout.vh}`)
  await narrow.close()

  // --- E4/E5: a capable phone gets the room, without keyboard-only controls ----------
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  await mobile.goto(`${BASE}/`)
  await mobile.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  const mobileState = await mobile.evaluate(() => ({
    coarse: window.matchMedia('(pointer: coarse)').matches,
    walkToggle: Boolean(document.getElementById('walk-toggle')),
    stations: document.querySelectorAll('#station-list button').length,
    hint: document.getElementById('move-hint').textContent,
  }))
  record('E4', 'a capable phone enters the room by default and hides the keyboard-only walk control',
    mobileState.coarse && !mobileState.walkToggle && mobileState.stations === 2
      && !mobileState.hint.includes('Walk freely'),
    `coarse=${mobileState.coarse} walkToggle=${mobileState.walkToggle} stations=${mobileState.stations}`)
  await mobile.locator('.proxy[data-interact-id="placeholder-slug"]').tap()
  await mobile.waitForTimeout(400)
  const mobileSelect = await mobile.evaluate(() => window.__saleshiRoom.stats().selectedGameId)
  record('E5', 'a touch tap on a cassette chip selects the game',
    mobileSelect === 'placeholder-slug', `selected=${mobileSelect}`)
  await mobile.screenshot({ path: OUT('m4-03-phone-room.png') })
  await mobile.close()

  // --- G1: Enter activates the focused cassette button -------------------------
  await page.goto(`${BASE}/?view=room`)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  const reached = await tabToCassette(page)
  record('G1a', 'Tab reaches the cassette button with real key events', reached,
    reached ? '' : 'focus never landed on the cassette chip')

  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  let state = await page.evaluate(() => ({
    selected: window.__saleshiRoom.stats().selectedGameId,
    url: location.search,
    announce: document.getElementById('selection-status').textContent.trim(),
  }))
  record('G1b', 'Enter selects the cassette', state.selected === 'placeholder-slug',
    `selected=${state.selected} url=${state.url}`)

  // Integrated screenshot: the travel to the desk has finished by now.
  await page.waitForTimeout(1200)
  await page.screenshot({ path: OUT('m2-01-desk-integrated.png') })
  const panel = await page.evaluate(() => {
    const screen = document.getElementById('monitor-screen')
    const links = [...screen.querySelectorAll('a')].map((a) => a.textContent.trim())
    const chips = [...document.querySelectorAll('.proxy')].map((b) => b.textContent.trim())
    return { hidden: screen.hidden, links, chips, docked: screen.classList.contains('is-docked') }
  })
  record('G1c', 'computer panel is visible with live and unavailable actions',
    panel.hidden === false && panel.links.length >= 1,
    `links=${JSON.stringify(panel.links)} chips=${JSON.stringify(panel.chips)} docked=${panel.docked}`)

  // --- G2: Space activates the focused cassette button -------------------------
  await page.goto(`${BASE}/?view=room`)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  const reached2 = await tabToCassette(page)
  await page.keyboard.press('Space')
  await page.waitForTimeout(400)
  state = await page.evaluate(() => ({
    selected: window.__saleshiRoom.stats().selectedGameId,
    url: location.search,
  }))
  record('G2', 'Space selects the cassette', reached2 && state.selected === 'placeholder-slug',
    `selected=${state.selected} url=${state.url}`)

  // --- G3: integrated screenshot of the shelf station --------------------------
  await page.goto(`${BASE}/?view=room`)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  await page.click('[data-station-id="shelf"]')
  await page.waitForTimeout(1300)
  await page.screenshot({ path: OUT('m2-02-shelf-integrated.png') })
  const shelf = await page.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const chips = [...document.querySelectorAll('.proxy')].map((b) => {
      const r = b.getBoundingClientRect()
      return { label: b.textContent.trim(), inside: r.left >= stage.left && r.right <= stage.right && r.top >= stage.top && r.bottom <= stage.bottom }
    })
    return { station: window.__saleshiRoom.stats().station, chips }
  })
  record('G3', 'shelf station renders with every chip inside the stage',
    shelf.station === 'shelf' && shelf.chips.every((c) => c.inside),
    JSON.stringify(shelf.chips))
} catch (error) {
  record('G0', 'gate run completed without throwing', false, String(error).slice(0, 300))
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} gate checks passed`)
process.exit(failed.length ? 1 : 0)
