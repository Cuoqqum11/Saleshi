import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { goto, request } from './netRetry.mjs'
import { OUT } from './evidence.mjs'

import { games } from '../../src/js/data/games.js'
import { gameBuilds } from '../../src/js/data/builds.js'

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))

// BASE_URL may point at a development or a production origin. The room checks wait on the room's
// own DOM readiness signal rather than the dev-only __saleshiRoom hooks, so the only difference
// between origins is that a production run reports the hook checks as SKIP instead of failing them.
const BASE = process.env.BASE_URL ?? 'http://localhost:5174'
const game = games.find((entry) => entry.id === 'the-last-witness')
const mib = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`
const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass })
  const label = pass === 'skip' ? 'SKIP' : pass ? 'PASS' : 'FAIL'
  console.log(`${label}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
const errors = []
const failedRequests = []
const requested = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
// A console error on its own does not say which file failed, and this machine intermittently denies
// loopback requests, so the URL is recorded next to the message to separate a transport fault from
// a real missing asset.
page.on('requestfailed', (request) => failedRequests.push(`${request.url().replace(BASE, '')} ${request.failure()?.errorText}`))
page.on('request', (request) => requested.push(request.url()))
const exportRequests = () => requested.filter((url) => url.includes('/game/web/'))

try {
  console.log(`Game build suite: ${BASE}`)

  await goto(page, `${BASE}/games/the-last-witness/`)
  const details = await page.locator('#availability').textContent()
  const downloadHref = await page.locator('#availability a[download]').getAttribute('href')
  record('B1', 'game page states the measured browser and archive sizes', details.includes(mib(gameBuilds.web.bytes))
    && details.includes(mib(gameBuilds.desktop.archiveBytes))
    && downloadHref === gameBuilds.desktop.servedAt, `${details.match(/\d+\.\d MB/g)?.join(', ')}`)
  const listed = await page.locator('.build-details li').allTextContents()
  record('B2', 'archive contents are published file by file', listed.length === gameBuilds.desktop.contents.length
    && gameBuilds.desktop.contents.every((member) => listed.some((line) => line.includes(member.name))), listed.join(' | '))
  await page.screenshot({ path: OUT('m6b-01-game-details.png'), fullPage: true })

  const media = await page.evaluate(() => [...document.querySelectorAll('img')].map((img) => ({
    src: img.currentSrc || img.src,
    decoded: img.complete && img.naturalWidth > 0,
    width: img.naturalWidth,
  })))
  record('B3', 'cover and screenshots load as real images', media.length >= 4 && media.every((entry) => entry.decoded && entry.width > 0),
    JSON.stringify(media.map((entry) => `${entry.src.split('/').pop()}=${entry.width}`)))

  // B3b asks the question the build-time palette pass actually raises: the bundle ships a different
  // encoding of each frame than public/ holds, so the check compares what Chromium decodes from the
  // origin against what it decodes from the captured file. The comparison uses the browser's own PNG
  // decoder rather than the pipeline's, so a mistake in the encoder cannot verify itself.
  const served = [...new Set(media.map((entry) => entry.src))]
  const originals = served.map((url) => path.join(ROOT, 'public', decodeURI(new URL(url).pathname).replace(/^\//, '').split('/').join(path.sep)))
  const digest = (urls) => page.evaluate(async (list) => {
    const hashes = []
    for (const url of list) {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let hash = 0x811c9dc5
      for (let i = 0; i < pixels.length; i++) hash = Math.imul(hash ^ pixels[i], 0x01935de3) >>> 0
      hashes.push(`${canvas.width}x${canvas.height}:${hash.toString(16)}`)
    }
    return hashes
  }, urls)
  const [servedDigests, originalDigests] = [
    await digest(served),
    await digest(originals.map((file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`)),
  ]
  record('B3b', 'the frames the origin serves decode to the same pixels as the captured files',
    servedDigests.length === originalDigests.length
      && servedDigests.every((value, index) => value === originalDigests[index]),
    served.map((url, index) => `${url.split('/').pop()} ${servedDigests[index] === originalDigests[index] ? '=' : '≠'} ${originalDigests[index]}`).join(' '))

  const archive = await request(page.request, `${BASE}${gameBuilds.desktop.servedAt}`, { method: 'HEAD' })
  const ranged = await request(page.request, `${BASE}${gameBuilds.desktop.servedAt}`, { headers: { Range: 'bytes=0-1023' } })
  record('B4', 'download responds to HEAD and to a byte range', archive.status() === 200
    && archive.headers()['content-type'] === 'application/zip'
    && Number(archive.headers()['content-length']) === gameBuilds.desktop.archiveBytes
    && ranged.status() === 206 && Number(ranged.headers()['content-length']) === 1024,
    `status=${archive.status()} bytes=${archive.headers()['content-length']} range=${ranged.status()}`)
  const exportEntry = await request(page.request, `${BASE}${gameBuilds.web.servedAt}index.html`)
  const wasm = await request(page.request, `${BASE}${gameBuilds.web.servedAt}${encodeURIComponent('The Last Witness.wasm')}`, { method: 'HEAD' })
  record('B5', 'the unmodified export is reachable with its engine files', exportEntry.status() === 200
    && (await exportEntry.text()).includes('The Last Witness.wasm')
    && wasm.status() === 200 && Number(wasm.headers()['content-length']) === 37902138,
    `entry=${exportEntry.status()} wasm=${wasm.status()} ${wasm.headers()['content-type']}`)

  await goto(page, `${BASE}/games/the-last-witness/play/`)
  const start = page.locator('#demo-start')
  await start.waitFor({ state: 'visible', timeout: 10000 })
  record('B6', 'play page offers an explicit load action', await start.isEnabled()
    && (await start.textContent()).includes(mib(gameBuilds.web.bytes)) && exportRequests().length === 0,
    `${exportRequests().length} export requests before the click`)

  const startedAt = Date.now()
  await start.click()
  const frameEl = page.locator('#demo-frame iframe')
  await frameEl.waitFor({ state: 'attached', timeout: 20000 })
  let engineStarted = false
  let failureNotice = ''
  try {
    await page.waitForFunction(() => {
      const frame = document.querySelector('#demo-frame iframe')
      const doc = frame?.contentDocument
      if (!doc) return false
      const notice = doc.getElementById('status-notice')
      if (notice && notice.textContent.trim()) return false
      return !doc.getElementById('status')
    }, null, { timeout: 180000 })
    engineStarted = true
  } catch {
    failureNotice = await page.evaluate(() => document.querySelector('#demo-frame iframe')?.contentDocument
      ?.getElementById('status-notice')?.textContent.trim() ?? 'no notice element')
  }
  const loadMs = Date.now() - startedAt
  const canvasSize = await page.evaluate(() => {
    const canvas = document.querySelector('#demo-frame iframe')?.contentDocument?.getElementById('canvas')
    return canvas ? { width: canvas.width, height: canvas.height } : null
  })
  // The export resizes its canvas to the frame, so the assertion is that it filled the frame the
  // site gave it rather than a fixed 1280x800.
  const frameSize = await page.locator('#demo-frame iframe').boundingBox()
  record('B7', 'the Godot build starts inside the site frame', engineStarted
    && canvasSize?.width > 900 && canvasSize?.height > 550
    && Math.abs(canvasSize.width - Math.round(frameSize.width)) <= 2
    && Math.abs(canvasSize.height - Math.round(frameSize.height)) <= 2,
    `${loadMs} ms, canvas ${JSON.stringify(canvasSize)}, frame ${Math.round(frameSize.width)}x${Math.round(frameSize.height)}${failureNotice ? `, notice: ${failureNotice}` : ''}`)
  const engineFiles = exportRequests().filter((url) => /\.(wasm|pck|js)$/.test(url))
  record('B8', 'loading the frame fetched the engine and data files', engineFiles.length >= 3, engineFiles.map((url) => decodeURIComponent(url.split('/').pop())).join(', '))
  await page.screenshot({ path: OUT('m6b-02-play-demo.png') })

  const stop = page.locator('#demo-stop')
  const stopVisible = await stop.isVisible()
  await stop.click()
  record('B9', 'stopping releases the frame and allows a reload', stopVisible
    && await page.locator('#demo-frame').isHidden() && await start.isVisible()
    && (await page.locator('#demo-status').textContent()).includes('cache'),
    await page.locator('#demo-status').textContent())

  record('B10', 'the demo journey produced no uncaught browser errors', errors.length === 0,
    [errors.slice(0, 3).join('; '), failedRequests.slice(0, 3).join('; ')].filter(Boolean).join(' | '))

  await goto(page, `${BASE}/games/`)
  const card = await page.evaluate(() => {
    const element = document.querySelector('.game-card')
    return {
      title: element.querySelector('h3')?.textContent.trim(),
      summary: element.querySelector('p:nth-of-type(2)')?.textContent.trim(),
      badges: [...element.querySelectorAll('.media-badge')].map((badge) => badge.textContent.trim()),
      cover: element.querySelector('img')?.getAttribute('src'),
    }
  })
  record('B11', 'catalogue card shows the real game and its routes', card.title === 'The Last Witness'
    && card.summary === game.summary && card.badges.length === 2 && card.cover === game.cover.url, JSON.stringify(card))
  await page.screenshot({ path: OUT('m6b-03-catalogue.png'), fullPage: true })

  await goto(page, `${BASE}/?view=room&game=the-last-witness`)
  // The room announces its own state in the DOM, which is the signal a visitor actually gets, so
  // this wait works on a production bundle too. The dev-only hooks are read afterwards.
  await page.waitForFunction(
    () => document.getElementById('room-status')?.dataset.state === 'ready', null, { timeout: 60000 },
  )
  await page.waitForFunction(
    () => document.querySelector('#monitor-screen h2')?.textContent.trim() === 'The Last Witness',
    null, { timeout: 15000 },
  )
  const panel = await page.evaluate(() => {
    const screen = document.getElementById('monitor-screen')
    return {
      title: screen.querySelector('h2')?.textContent.trim(),
      actions: [...screen.querySelectorAll('a.screen-link')].map((link) => ({ text: link.textContent.trim(), href: link.getAttribute('href') })),
      media: screen.querySelectorAll('.screen-media img').length,
      gallery: screen.querySelectorAll('.screen-screenshots img').length,
    }
  })
  const demoAction = panel.actions.find((action) => action.href === game.availability.browserDemo.url)
  const downloadAction = panel.actions.find((action) => action.href === game.availability.download.url)
  record('B12', 'room computer offers the real demo and download actions', panel.title === 'The Last Witness'
    && Boolean(demoAction) && Boolean(downloadAction) && panel.media === 1 && panel.gallery === 0, JSON.stringify(panel))
  const stats = await page.evaluate(() => window.__saleshiRoom?.stats() ?? null)
  record('B12h', 'the room scene reports the URL-selected cassette and is drawing',
    stats ? stats.selectedGameId === game.id && stats.drawCalls > 0 : 'skip',
    stats ? `selected=${stats.selectedGameId}, drawCalls=${stats.drawCalls}` : 'dev-only hooks are not shipped')
  const downloadTarget = await request(page.request, `${BASE}${game.availability.download.url}`, { method: 'HEAD' })
  record('B13', 'the panel download action points at a serving file', downloadTarget.status() === 200
    && downloadTarget.headers()['content-type'] === 'application/zip', `HTTP ${downloadTarget.status()}`)
  await page.screenshot({ path: OUT('m6b-04-room-computer.png'), fullPage: true })

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } })
  const staticPage = await noJs.newPage()
  await goto(staticPage, `${BASE}/games/the-last-witness/play/`)
  const staticMain = await staticPage.locator('main').textContent()
  record('B14', 'no-JS play page keeps requirements and working alternatives', staticMain.includes('WebGL 2')
    && staticMain.includes('desktop build') && await staticPage.locator('#demo-start').isHidden()
    && await staticPage.locator('a[href="/game/web/index.html"]').isVisible()
    && !staticMain.includes('{{'), staticMain.slice(0, 60))
  await goto(staticPage, `${BASE}/games/the-last-witness/`)
  const staticDetails = await staticPage.locator('#availability').textContent()
  record('B15', 'no-JS game page still lists play, download and build facts', staticDetails.includes('Play the browser demo')
    && staticDetails.includes('Windows') && staticDetails.includes('Godot'), staticDetails.slice(0, 60))
  await noJs.close()

  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await goto(page, `${BASE}/games/the-last-witness/`)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const image = await page.evaluate(() => {
      const cover = document.querySelector('.game-cover')
      return { drawn: Math.round(cover.getBoundingClientRect().width), natural: cover.naturalWidth }
    })
    record(`B16-${width}`, `game page stays inside ${width}px and scales its media`, overflow <= 1
      && image.drawn > 0 && image.drawn <= image.natural, `overflow=${overflow}px drawn=${image.drawn}`)
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await goto(page, `${BASE}/games/the-last-witness/`)
  await page.locator('.build-details summary').click()
  const hashShown = await page.locator('.build-details p').filter({ hasText: 'SHA-256' }).textContent()
  record('B17', 'the published hashes are the measured ones', hashShown.includes(gameBuilds.desktop.contents
    .find((member) => member.name.endsWith('.exe')).sha256.slice(0, 16)))
} catch (error) {
  record('B0', 'game build suite completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
const skipped = results.filter((result) => result.pass === 'skip')
console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`)
if (failed.length) process.exitCode = 1
