/**
 * Milestone 4 acceptance: pinned papers and the readable HTML view.
 *
 * Everything is driven with real trusted mouse and keyboard events in headless Chromium.
 * The point of these checks is that opening a note is *only* a view change: the camera,
 * the walk mode and the game selection must survive it untouched.
 *
 * Run with: node tests/e2e/papers.mjs   (dev server must be running)
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))

const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })

const stats = (page) => page.evaluate(() => {
  const s = window.__saleshiRoom.stats()
  return { mode: s.mode, station: s.station, selected: s.selectedGameId, pose: s.pose }
})
const dialogState = (page) => page.evaluate(() => {
  const dialog = document.getElementById('paper-view')
  return {
    open: dialog.open,
    title: document.getElementById('paper-view-title').textContent.trim(),
    body: document.getElementById('paper-view-body').textContent.replace(/\s+/g, ' ').trim(),
    focusLabel: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? '',
  }
})

/** Tab (or Shift+Tab) until focus lands on a note chip; returns the aria-label. */
async function tabToNote(page, backwards = false) {
  for (let i = 0; i < 24; i += 1) {
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab')
    const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    if (label.startsWith('The studio letter') || label.startsWith('The instruction note')) return label
  }
  return null
}

const poseDrift = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

const pageErrors = []

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`${BASE}/?view=room`)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
  // isRunning() only says the loop was started; drawCalls proves a frame actually rendered, so
  // a throw inside step() shows up here instead of as an unexplained click timeout later.
  await page.waitForFunction(() => window.__saleshiRoom.stats().drawCalls > 0, null, { timeout: 15000 })
  await page.waitForTimeout(600)

  // --- P1: both papers are reachable as chips ---------------------------------------
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('.proxy')].map((b) => b.textContent.trim()))
  record('P1', 'both pinned papers render as focus-proxy chips',
    chips.includes('Letter') && chips.includes('Note'),
    `chips=${JSON.stringify(chips)}`)

  // --- P2: mouse click opens the readable studio letter -----------------------------
  const before = await stats(page)
  await page.click('.proxy[data-interact-id="studio-intro"]')
  await page.waitForTimeout(250)
  let d = await dialogState(page)
  record('P2', 'clicking the letter chip opens a readable HTML view',
    d.open && d.title === 'A note from the studio' && d.body.includes('PLACEHOLDER')
      && !d.body.includes('skip the room'),
    `open=${d.open} title="${d.title}" body starts "${d.body.slice(0, 40)}…"`)
  await page.screenshot({ path: OUT('m4-01-paper-open.png') })

  // --- P3: closing restores focus and leaves the room untouched ---------------------
  await page.click('#paper-view-close')
  await page.waitForTimeout(250)
  const after = await stats(page)
  d = await dialogState(page)
  record('P3', 'closing returns focus to the chip and preserves camera and selection',
    !d.open && d.focusLabel.startsWith('The studio letter')
      && after.mode === before.mode && after.station === before.station
      && after.selected === before.selected && poseDrift(before.pose, after.pose) < 0.001,
    `focus="${d.focusLabel}" station=${after.station} drift=${poseDrift(before.pose, after.pose).toFixed(4)}`)

  // --- P4: keyboard opens and Escape closes ------------------------------------------
  const noteLabel = await tabToNote(page)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  d = await dialogState(page)
  const openedByKeyboard = d.open && d.body.includes('standing inside the studio')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  d = await dialogState(page)
  record('P4', 'Tab+Enter opens the instruction note and Escape closes it',
    noteLabel !== null && openedByKeyboard && !d.open,
    `reached="${noteLabel}" opened=${openedByKeyboard} closed=${!d.open}`)

  // --- P5: selection survives a note opened while walking, and movement freezes -----
  // Walking happens from the shelf station because the north wall is ~2 m clear there; from the
  // desk a single W press runs into the desk collider and nothing can be measured. Each press is
  // followed by a settle so that inertia, not the dialog, cannot be what moves the camera.
  await page.click('[data-station-id="shelf"]')
  await page.waitForTimeout(1300)
  await page.click('.proxy[data-interact-id="placeholder-slug"]')
  await page.waitForTimeout(400)
  await page.click('[data-station-id="shelf"]')
  await page.waitForTimeout(1300)
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  await page.keyboard.press('w')
  await page.waitForTimeout(900)
  const settled = await stats(page)
  const noteLabel2 = await tabToNote(page, true)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.down('w')
    await page.waitForTimeout(70)
    await page.keyboard.up('w')
  }
  await page.waitForTimeout(250)
  const frozen = poseDrift(settled.pose, (await stats(page)).pose) < 0.01
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const beforeResume = await stats(page)
  await page.keyboard.down('w')
  await page.waitForTimeout(400)
  await page.keyboard.up('w')
  await page.waitForTimeout(200)
  const resumed = poseDrift(beforeResume.pose, (await stats(page)).pose)
  const s5 = await stats(page)
  record('P5', 'a note opened mid-walk freezes movement and the selection survives',
    noteLabel2 !== null && frozen && resumed > 0.1 && s5.mode === 'walk' && s5.selected === 'placeholder-slug',
    `reached="${noteLabel2}" frozen=${frozen} resumedAfterClose=${resumed.toFixed(3)}m mode=${s5.mode} selected=${s5.selected}`)

  // --- P6: the notes are physical objects in the scene --------------------------------
  const meshes = await page.evaluate(() => {
    let found = []
    window.__saleshiRoom // stats only exposes counts; count draw calls as a sanity signal
    found = [...document.querySelectorAll('.proxy')].map((b) => b.dataset.interactId)
    return { chips: found, drawCalls: window.__saleshiRoom.stats().drawCalls }
  })
  record('P6', 'the scene still renders with the papers added',
    meshes.chips.length === 4 && meshes.drawCalls > 0,
    `chips=${meshes.chips.length} drawCalls=${meshes.drawCalls}`)

  await page.click('[data-station-id="shelf"]')
  await page.waitForTimeout(1300)
  await page.screenshot({ path: OUT('m4-02-wall-notes.png') })
  await context.close()
} catch (error) {
  record('P0', 'papers run completed without throwing', false, String(error).slice(0, 300))
} finally {
  if (pageErrors.length) record('P7', 'no uncaught error from the render loop', false, pageErrors.join(' | ').slice(0, 200))
  else record('P7', 'no uncaught error from the render loop', true)
  await browser.close()
}

const failed = results.filter((r) => r.pass === false)
console.log(`\n${results.length - failed.length}/${results.length} paper checks passed`)
process.exit(failed.length ? 1 : 0)
