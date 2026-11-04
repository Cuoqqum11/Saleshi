/**
 * M7 art-review capture: the same fixed viewpoints photographed before and after the visual work,
 * with the renderer's own counters beside them.
 *
 * This is a camera, not a test. It asserts nothing except that a PNG came back, because its job is
 * to make two images comparable: every pose is either a real station button or an absolute pose
 * through `__saleshiRoom.aim()`, so a viewpoint does not drift between runs the way "walk over to
 * the shelf and look" would.
 *
 * Run against an `npm run build:qa` origin:
 *   BASE_URL=http://127.0.0.1:5314 PREFIX=m7-before node tests/e2e/visual.mjs
 *   BASE_URL=http://127.0.0.1:5314 PREFIX=m7-after  node tests/e2e/visual.mjs
 *
 * `PREFIX` defaults to `${EVIDENCE_PREFIX}-visual`, and an existing file is refused unless
 * `OVERWRITE=1` is set. Both guards exist because this suite writes straight into the evidence
 * folder: an unqualified run once replaced the committed M7 "before" baseline with the current
 * build, which is the one thing a before/after camera must never do.
 *
 * The counters are SwiftShader numbers from a headless tab. They compare like with like, and they
 * are not a real GPU's frame rate.
 */
import { chromium } from 'playwright'
import { goto } from './netRetry.mjs'
import { writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const PREFIX = process.env.PREFIX ?? `${process.env.EVIDENCE_PREFIX ?? 'm6'}-visual`
const EVIDENCE = (name) => fileURLToPath(new URL(`../../docs/evidence/${name}`, import.meta.url))

async function target(file) {
  const path = EVIDENCE(file)
  if (process.env.OVERWRITE !== '1') {
    try {
      await access(path)
      throw new Error(`visual: ${file} already exists; pass OVERWRITE=1 to replace a capture`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return path
}

// `station` uses the control bar the visitor uses. `aim` parks the eye at an absolute pose, which
// is the only way to get the same close-up twice. Room space: floor y=0, x -3.5..3.5, z -3..3.
const VIEWS = [
  {
    id: '01-entry',
    note: 'the pose the room opens on, with no input at all',
  },
  {
    id: '02-shelf',
    note: 'cassette shelf station',
    station: 'shelf',
  },
  {
    id: '03-desk',
    note: 'desk station with a game selected',
    station: 'desk',
    select: 'the-last-witness',
  },
  {
    id: '04-door',
    note: 'from the door, the whole composition at once',
    aim: { position: { x: -0.35, y: 1.55, z: 2.5 }, target: { x: 0.2, y: 1.0, z: -2.9 } },
  },
  {
    id: '05-walk-central',
    note: 'standing in the middle of the floor, eye height, facing the shelf',
    aim: { position: { x: -0.9, y: 1.5, z: -0.6 }, target: { x: -2.45, y: 1.06, z: -2.72 } },
  },
  {
    id: '06-case-close-up',
    note: 'the real game case on the shelf, at arm length',
    aim: { position: { x: -3.0, y: 1.12, z: -2.3 }, target: { x: -3.0, y: 1.08, z: -2.72 } },
  },
  {
    id: '07-monitor-close-up',
    note: 'the monitor from the chair position',
    aim: { position: { x: 1.6, y: 1.1, z: -1.9 }, target: { x: 1.6, y: 1.06, z: -2.56 } },
  },
  {
    id: '08-letter-close-up',
    note: 'the studio letter pinned to the west wall',
    aim: { position: { x: -3.05, y: 1.32, z: -1.5 }, target: { x: -3.47, y: 1.3, z: -1.5 } },
  },
  {
    id: '09-desk-corner',
    note: 'low raking angle across the desk, to judge contact points',
    aim: { position: { x: 2.7, y: 1.15, z: 0.4 }, target: { x: 1.6, y: 0.75, z: -2.5 } },
  },
  {
    id: '10-shelf-wall-joint',
    note: 'raking view of the shelf, back board and wall junction',
    aim: { position: { x: -1.2, y: 1.35, z: -0.9 }, target: { x: -3.2, y: 1.1, z: -2.9 } },
  },
]

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const stats = {}
let bootHandle = null

try {
  await goto(page, `${BASE}/?view=room`)
  bootHandle = await page.waitForFunction(
    () => (window.__saleshiRoom?.isRunning() ? performance.now() : false),
    null,
    { timeout: 20000 },
  )
  const bootMs = await bootHandle.jsonValue()
  await bootHandle.dispose()

  const headroom = await page.evaluate(async () => {
    let frames = 0
    const stopAt = performance.now() + 2000
    await new Promise((resolve) => {
      const count = () => {
        frames += 1
        if (performance.now() < stopAt) requestAnimationFrame(count)
        else resolve()
      }
      requestAnimationFrame(count)
    })
    const canvas = document.querySelector('#room-viewport canvas')
    return { framesInTwoSeconds: frames, buffer: canvas ? [canvas.width, canvas.height] : null }
  })

  stats.environment = {
    base: BASE,
    bundle: 'dist-qa (room test hooks on, preserveDrawingBuffer on)',
    browser: 'headless Chromium + SwiftShader',
    viewport: '1280x800',
    bootToFirstRenderedFrameMs: Math.round(bootMs),
    framesInTwoSeconds: headroom.framesInTwoSeconds,
    drawingBuffer: headroom.buffer,
  }

  for (const view of VIEWS) {
    if (view.select) {
      await page.locator(`.proxy[data-interact-id="${view.select}"]`).click()
      await page.waitForTimeout(300)
    }
    if (view.station) {
      await page.click(`[data-station-id="${view.station}"]`)
      await page.waitForTimeout(1400)
    } else if (view.aim) {
      await page.evaluate((spec) => window.__saleshiRoom.aim(spec), view.aim)
      await page.waitForTimeout(120)
    }

    const dataUrl = await page.evaluate(() => window.__saleshiRoom.snapshot())
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) throw new Error(`${view.id} produced no PNG`)
    const file = `${PREFIX}-${view.id}.png`
    await writeFile(await target(file), Buffer.from(dataUrl.split(',')[1], 'base64'))

    const shot = await page.evaluate(() => {
      const {
        drawCalls, triangles, geometries, textures, programs, nodes, meshes, lights,
        shadowMaps, shadowCasters, shadowMapPixels, shadowStatic, toneMapping, pixelRatio,
        proxyMetrics, pose,
      } = window.__saleshiRoom.stats()
      return {
        drawCalls, triangles, geometries, textures, programs, nodes, meshes, lights,
        shadowMaps, shadowCasters, shadowMapPixels, shadowStatic, toneMapping, pixelRatio,
        proxyMetrics, pose,
      }
    })
    stats[view.id] = { note: view.note, file, ...shot }
    console.log(`${view.id} ${file} — calls=${shot.drawCalls} tris=${shot.triangles} meshes=${shot.meshes} tex=${shot.textures} programs=${shot.programs}`)

    if (view.station) {
      await page.screenshot({ path: EVIDENCE(`${PREFIX}-${view.id}-page.png`), fullPage: true })
    }
  }

  // Two seconds of held-forward, measured in wall-clock time. This sits in the environment block
  // because the point is that the number must not depend on `framesInTwoSeconds`: the simulation runs
  // on a fixed 1/60 s step, so walking speed is a property of the room and not of the GPU. The clamp
  // it replaced discarded real time below 20 fps, which is what made W4 and W6 fail under SwiftShader.
  // `aim()` parks the eye in station mode — it is the same call the close-up viewpoints use — so it
  // has to come before the walk toggle, not after it: toggling first would be undone by the aim.
  await page.evaluate(() => window.__saleshiRoom.aim({
    position: { x: -0.9, y: 1.5, z: -0.6 },
    target: { x: -0.9, y: 1.5, z: 2.4 },
  }))
  await page.waitForTimeout(300)
  await page.click('#walk-toggle')
  await page.waitForTimeout(500)
  const walkBefore = await page.evaluate(() => window.__saleshiRoom.stats().pose)
  await page.keyboard.down('w')
  await page.waitForTimeout(2000)
  await page.keyboard.up('w')
  await page.waitForTimeout(1500)
  const walkRun = await page.evaluate(() => {
    const s = window.__saleshiRoom.stats()
    return { pose: s.pose, fps: s.fps, mode: s.mode }
  })
  stats.environment.walkMetresInTwoSeconds = Number(
    Math.hypot(walkRun.pose.x - walkBefore.x, walkRun.pose.z - walkBefore.z).toFixed(3),
  )
  stats.environment.reportedFpsDuringWalk = walkRun.fps
  stats.environment.walkModeConfirmed = walkRun.mode === 'walk'
} finally {
  await browser.close()
}

await writeFile(await target(`${PREFIX}-room-stats.json`), `${JSON.stringify(stats, null, 2)}\n`)
console.log(`\n${VIEWS.length} viewpoints captured → docs/evidence/${PREFIX}-*.png and ${PREFIX}-room-stats.json`)
