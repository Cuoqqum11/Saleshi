/**
 * The browser demo controller.
 *
 * The exported Godot build is ~39 MB, so it is never fetched by simply visiting the page: the
 * visitor presses a button first. The export itself is served unmodified inside an iframe, which
 * keeps its own document, styles and canvas lifecycle separate from the site around it.
 */

import { gameBuilds } from '../data/builds.js'

const EXPORT_URL = `${gameBuilds.web.servedAt}index.html`
const WEBGL2_MESSAGE = 'This browser did not offer a WebGL 2 context, which the game engine needs to draw.'
const SECURE_MESSAGE = 'This page is not a secure context, so the engine refuses to start. Use https, or localhost while developing.'
const WASM_MESSAGE = 'This browser does not support WebAssembly, so the build cannot run here.'

const missingCapability = () => {
  if (typeof WebAssembly !== 'object' || WebAssembly === null) return WASM_MESSAGE
  if (!window.isSecureContext) return SECURE_MESSAGE
  try {
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2')) return WEBGL2_MESSAGE
  } catch {
    return WEBGL2_MESSAGE
  }
  return null
}

export function mountGameDemo(root = document) {
  const start = root.getElementById('demo-start')
  const stop = root.getElementById('demo-stop')
  const status = root.getElementById('demo-status')
  const frameSlot = root.getElementById('demo-frame')
  if (!start || !stop || !status || !frameSlot) return null

  const blocked = missingCapability()
  if (blocked) {
    status.textContent = `${blocked} The downloadable build does not need a browser at all.`
    return { state: 'blocked', reason: blocked }
  }
  start.hidden = false

  let frame = null
  start.addEventListener('click', () => {
    if (frame) return
    frame = document.createElement('iframe')
    frame.src = EXPORT_URL
    frame.title = 'The Last Witness browser demo'
    frame.allow = 'fullscreen; autoplay'
    frame.setAttribute('loading', 'lazy')
    frameSlot.hidden = false
    frameSlot.append(frame)
    start.hidden = true
    stop.hidden = false
    status.textContent = 'Loading the engine and game data. The first run takes the longest because nothing is cached yet.'
    frame.addEventListener('load', () => {
      status.textContent = 'The demo frame has loaded. Click inside it to give it keyboard focus.'
      frame.focus()
    })
    stop.focus?.()
  })

  stop.addEventListener('click', () => {
    frame?.remove()
    frame = null
    frameSlot.hidden = true
    stop.hidden = true
    start.hidden = false
    status.textContent = 'Stopped. The downloaded data stays in the browser cache, so loading again is faster.'
    start.focus()
  })

  return { state: 'ready', start, stop, status }
}

if (typeof document !== 'undefined' && document.querySelector('[data-game-id="the-last-witness"] #demo-start')) {
  const run = () => mountGameDemo(document)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
}
