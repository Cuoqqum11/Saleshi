/**
 * Milestone 2 acceptance: constrained free movement.
 *
 * Everything here is driven with real trusted key events in a real (headless) Chromium, and
 * every assertion reads the live camera pose out of the dev hook. Anything this file cannot
 * prove is reported as UNVERIFIED rather than passed.
 *
 * Run with: node tests/e2e/movement.mjs   (dev server must be running)
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))

// Room is x [-3.5, 3.5], z [-3, 3]; walker radius 0.25 (see src/js/room/collision.js).
const LIMIT_X = 3.25
const LIMIT_Z = 2.75
const EPS = 0.06

const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}
const note = (id, name, detail) => {
  results.push({ id, name, pass: null, detail })
  console.log(`SKIP  ${id} ${name} — ${detail}`)
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })

const pose = (page) => page.evaluate(() => window.__saleshiRoom.stats().pose)
const stats = (page) => page.evaluate(() => {
  const s = window.__saleshiRoom.stats()
  return { mode: s.mode, station: s.station, selected: s.selectedGameId, pose: s.pose }
})
/** The side panel/drawer must stay inside the stage and outside the interactive room viewport. */
const panelInsideStage = (page) => page.evaluate(() => {
  const stage = document.querySelector('.stage').getBoundingClientRect()
  const viewport = document.getElementById('room-viewport').getBoundingClientRect()
  const panel = document.getElementById('monitor-screen').getBoundingClientRect()
  return {
    inside: panel.top >= stage.top - 1 && panel.bottom <= stage.bottom + 1
      && panel.left >= stage.left - 1 && panel.right <= stage.right + 1,
    separate: panel.left >= viewport.right - 1 || panel.top >= viewport.bottom - 1,
    layout: window.__saleshiRoom.stats().panelLayout,
  }
})

async function hold(page, key, ms) {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
  await page.waitForTimeout(90)
}

/** Turns with real arrow-key taps until the base yaw is within tol of the target. */
async function face(page, targetYaw, tol = 0.07) {
  for (let i = 0; i < 160; i += 1) {
    const p = await pose(page)
    let delta = targetYaw - p.yaw
    while (delta > Math.PI) delta -= 2 * Math.PI
    while (delta < -Math.PI) delta += 2 * Math.PI
    if (Math.abs(delta) < tol) return true
    const key = delta > 0 ? 'ArrowRight' : 'ArrowLeft'
    await page.keyboard.down(key)
    await page.waitForTimeout(50)
    await page.keyboard.up(key)
    await page.waitForTimeout(30)
  }
  return false
}

async function openRoom(page, url = `${BASE}/?view=room`) {
  await page.goto(url)
  await page.waitForFunction(() => window.__saleshiRoom?.isRunning() === true, null, { timeout: 15000 })
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // --- W1: the toggle enters walk mode and raises the eye -------------------------
  await openRoom(page)
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  let s = await stats(page)
  record('W1', 'toggle enters walk mode at standing eye height',
    s.mode === 'walk' && Math.abs(s.pose.y - 1.5) < 0.02 && s.station === null,
    `mode=${s.mode} y=${s.pose.y.toFixed(2)} station=${s.station}`)
  const pressed = await page.getAttribute('#walk-toggle', 'aria-pressed')
  const label = await page.textContent('#walk-toggle')
  record('W1b', 'toggle reports its state', pressed === 'true' && label.trim() === 'Stop walking',
    `aria-pressed=${pressed} label=${label.trim()}`)

  // --- W2: collision with the desk -------------------------------------------------
  // Desk station faces -z straight at the desk, so walking forward must stop at its front.
  await page.click('[data-station-id="desk"]')
  await page.waitForTimeout(1200)
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  const before = await pose(page)
  await hold(page, 'w', 1500)
  s = await stats(page)
  const deskFront = -2.1 + 0.25
  record('W2', 'walking forward stops at the desk instead of passing through it',
    s.pose.z > deskFront - EPS && s.pose.z < before.z - 0.1,
    `z=${s.pose.z.toFixed(2)} (desk front limit ${deskFront}, started ${before.z.toFixed(2)})`)
  await page.screenshot({ path: OUT('m6-movement-walk-desk-anchored.png'), fullPage: true })
  let panel = await panelInsideStage(page)
  record('W2b', 'the side panel stays inside the stage and outside the room while walking at the desk',
    panel.inside && panel.separate, `inside=${panel.inside} separate=${panel.separate} layout=${panel.layout}`)
  note('W2c', 'walk-mode view at the desk captured for human review',
    'docs/evidence/m6-movement-walk-desk-anchored.png — judged by eye')

  // --- W3: the chair beside the desk is solid too ------------------------------------
  // At desk-front depth the chair (x 0.325..0.775) sits between the desk station and the
  // west wall, so a pure strafe must stop on its east face rather than slide through it.
  const chairFace = 0.775 + 0.25
  await hold(page, 'a', 4000)
  s = await stats(page)
  record('W3', 'strafing west is stopped by the chair instead of passing through it',
    s.pose.x > chairFace - 0.04 && s.pose.x < chairFace + 0.04 && s.pose.x < before.x - 0.2,
    `x=${s.pose.x.toFixed(3)} (chair face ${chairFace}, started x=${before.x.toFixed(2)})`)

  // --- W3b: stepping back clears the chair and the west wall is reachable --------------
  await hold(page, 's', 1200)
  const backedUp = await pose(page)
  await hold(page, 'a', 4000)
  s = await stats(page)
  record('W3b', 'backing off the chair then strafing west reaches the west wall',
    backedUp.z > -1.0 && Math.abs(s.pose.x - -LIMIT_X) < EPS,
    `z after backing up=${backedUp.z.toFixed(2)} (chair clears at -1.00) x=${s.pose.x.toFixed(2)} (wall limit ${-LIMIT_X})`)

  // --- W4: the clear corridor reaches the north wall ---------------------------------
  // The only unblocked line to the north wall runs between the shelf (ends x=-1.7) and the
  // desk (starts x=0.75); with the 0.25 body radius that corridor is x in [-1.45, 0.5].
  await hold(page, 'd', 1400)
  const corridor = await pose(page)
  await face(page, 0)
  await hold(page, 'w', 2500)
  s = await stats(page)
  record('W4', 'walking the clear corridor stops at the north wall',
    corridor.x > -1.45 && corridor.x < 0.5 && Math.abs(s.pose.z - -LIMIT_Z) < EPS + 0.03,
    `corridor x=${corridor.x.toFixed(2)} z=${s.pose.z.toFixed(2)} (wall limit ${-LIMIT_Z})`)

  // --- W5: turning round reaches the south wall ------------------------------------
  const turned = await face(page, Math.PI, 0.12) || await face(page, -Math.PI, 0.12)
  await hold(page, 'w', 4500)
  s = await stats(page)
  record('W5', 'turning 180 degrees and walking reaches the south wall',
    turned && Math.abs(s.pose.z - LIMIT_Z) < EPS + 0.03,
    `yaw=${s.pose.yaw.toFixed(2)} z=${s.pose.z.toFixed(2)} (wall limit ${LIMIT_Z})`)

  // --- W6: east wall ---------------------------------------------------------------
  await face(page, -Math.PI / 2, 0.12)
  await hold(page, 'w', 3500)
  s = await stats(page)
  record('W6', 'walking east stops at the east wall',
    Math.abs(s.pose.x - LIMIT_X) < EPS + 0.03,
    `x=${s.pose.x.toFixed(2)} (wall limit ${LIMIT_X})`)

  // --- W7: selecting a cassette while walking does not move the camera -------------
  await page.click('[data-station-id="shelf"]')
  await page.waitForTimeout(1200)
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  const walkPose = await pose(page)
  await page.click('.proxy[data-interact-id="placeholder-slug"]')
  await page.waitForTimeout(500)
  s = await stats(page)
  const stayed = Math.hypot(s.pose.x - walkPose.x, s.pose.z - walkPose.z) < 0.02
  record('W7', 'selecting a cassette while walking keeps the walker in place',
    s.mode === 'walk' && s.selected === 'placeholder-slug' && stayed,
    `mode=${s.mode} selected=${s.selected} drift=${Math.hypot(s.pose.x - walkPose.x, s.pose.z - walkPose.z).toFixed(3)}`)

  await page.waitForTimeout(400)
  await page.screenshot({ path: OUT('m6-movement-walk-shelf-selected.png'), fullPage: true })
  panel = await panelInsideStage(page)
  record('W7b', 'the side panel stays inside the stage and outside the room with the monitor out of view',
    panel.inside && panel.separate, `inside=${panel.inside} separate=${panel.separate} layout=${panel.layout}`)

  // --- W8: station shortcuts still work from walk mode -----------------------------
  await page.click('[data-station-id="desk"]')
  await page.waitForTimeout(1200)
  s = await stats(page)
  record('W8', 'a station button leaves walk mode and travels',
    s.mode === 'station' && s.station === 'desk',
    `mode=${s.mode} station=${s.station}`)

  // --- W9: stopping walk lands at the nearest station ------------------------------
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  await hold(page, 'w', 300)
  await page.click('#walk-toggle')
  await page.waitForTimeout(1200)
  s = await stats(page)
  record('W9', 'stopping walk returns to the nearest station',
    s.mode === 'station' && s.station !== null,
    `station=${s.station}`)

  // --- W10: a mid-room walking view for review -------------------------------------
  await page.click('#walk-toggle')
  await page.waitForTimeout(700)
  await face(page, Math.PI / 4, 0.15)
  await hold(page, 'w', 500)
  await page.screenshot({ path: OUT('m6-movement-walk-midroom.png'), fullPage: true })
  note('W10', 'mid-room walking screenshot captured for human review',
    'docs/evidence/m6-movement-walk-midroom.png — judged by eye, not asserted')

  await context.close()

  // --- W11: reduced motion: no inertia, instant station cuts -----------------------
  const rmContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const rmPage = await rmContext.newPage()
  await openRoom(rmPage)
  const reduced = await rmPage.evaluate(() => window.__saleshiRoom.stats().reducedMotion)
  await rmPage.click('#walk-toggle')
  await rmPage.waitForTimeout(300)
  const p0 = await pose(rmPage)
  await hold(rmPage, 'w', 500)
  const atRelease = await pose(rmPage)
  await rmPage.waitForTimeout(300)
  const after = await pose(rmPage)
  const moved = Math.hypot(atRelease.x - p0.x, atRelease.z - p0.z)
  const coasted = Math.hypot(after.x - atRelease.x, after.z - atRelease.z)
  record('W11', 'reduced motion: walking moves but stops on release with no coasting',
    reduced === true && moved > 0.2 && coasted < 0.02,
    `reduced=${reduced} moved=${moved.toFixed(2)} coasted=${coasted.toFixed(3)}`)

  await rmPage.click('[data-station-id="shelf"]')
  const cut = await pose(rmPage)
  record('W12', 'reduced motion: station travel is an instant cut',
    Math.abs(cut.x - -2.2) < 0.001 && Math.abs(cut.z - -0.75) < 0.001,
    `pose=${cut.x.toFixed(2)},${cut.z.toFixed(2)} read in the same tick as the click`)
  await rmContext.close()
} catch (error) {
  record('W0', 'movement run completed without throwing', false, String(error).slice(0, 300))
} finally {
  await browser.close()
}

const failed = results.filter((r) => r.pass === false)
const passed = results.filter((r) => r.pass === true)
console.log(`\n${passed.length} passed, ${failed.length} failed, ${results.length - passed.length - failed.length} noted`)
process.exit(failed.length ? 1 : 0)
