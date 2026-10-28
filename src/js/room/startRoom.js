/**
 * Room bootstrap: scene + camera controller + picking + proxies + screen island.
 *
 * This module is the only place Three.js and Vue are reachable from, and it is loaded with a
 * dynamic import. A visitor who never enters the room — because they have no WebGL, no
 * JavaScript, or chose the list — downloads neither.
 */

import { createApp, h, shallowRef } from 'vue'
import { createScene } from './scene.js'
import { createCameraController } from './cameraController.js'
import { createPicking } from './picking.js'
import { createFocusProxy } from './focusProxy.js'
import { cassetteAnchor } from '../objects/shelf.js'
import { games, shelf } from '../data/games.js'
import { getSelectedGame, restoreFromUrl, selectGame, subscribe } from '../ui/selection.js'
import { createPaperView } from '../ui/paperView.js'
import MonitorPanel from '../ui/monitorPanel.vue'

export function startRoom({ els, reducedMotion, canWalk = true, onLeave }) {
  const view = createScene({ stage: els.viewport, games, shelfCapacity: shelf.capacity })
  const { scene, camera, renderer, interactables, cassetteMeshes, screenMesh, noteMeshes } = view
  const controller = createCameraController(camera, { reducedMotion })

  let size = { width: 1, height: 1 }
  let running = true
  let rafId = 0
  let picking = null
  let fpsWindowStart = performance.now()
  let framesInWindow = 0
  let lastFps = 0
  let hoveredId = null

  // --- The screen island -------------------------------------------------------------
  const selected = shallowRef(getSelectedGame())
  const panelApp = createApp({ render: () => h(MonitorPanel, { game: selected.value }) })
  panelApp.mount(els.screenEl)
  els.screenEl.hidden = false

  // --- Selection, shared by every input method --------------------------------------
  function announce(message) {
    els.selectionStatus.textContent = message
  }

  // --- The readable paper view --------------------------------------------------------
  // Text is cloned from the page's own HTML — the studio letter section and a template —
  // so there is one source of truth and nothing is baked into a texture.
  const paperView = createPaperView({
    dialog: els.paperDialog,
    titleEl: els.paperTitle,
    bodyEl: els.paperBody,
    sources: {
      'studio-intro': {
        title: 'A note from the studio',
        content: () => document.querySelector('#studio-letter .paper').cloneNode(true),
      },
      'how-to': {
        title: 'How to explore this room',
        content: () => document.getElementById('note-how-to').content.cloneNode(true),
      },
    },
    onOpen: () => {
      // A walker must not keep moving while reading; the modal owns the screen.
      releaseMoveKeys()
      picking.setEnabled(false)
    },
    onClose: () => {
      picking.setEnabled(true)
      announce('The note is closed. You are back in the room, exactly where you were.')
    },
  })

  function openPaper(id) {
    if (paperView.open(id)) {
      announce('Opened a readable note. Press Escape or use the close button to return to the room.')
    }
  }

  function handleSelect(id, meta = {}) {
    if (id === 'studio-intro' || id === 'how-to') {
      openPaper(id)
      return
    }
    if (id === 'computer') {
      controller.travelTo('desk')
      const current = getSelectedGame()
      announce(
        current
          ? `The screen shows ${current.title}.`
          : 'The screen is on standby. Nothing is selected on the shelf yet.',
      )
      return
    }
    const game = selectGame(id, meta)
    if (!game) return
    // While walking, selecting must not yank the camera: the walker chose where to stand.
    if (controller.getMode() !== 'walk' && controller.currentStationId() !== 'desk') {
      controller.travelTo('desk')
    }
    announce(`Selected ${game.title}. The computer screen shows what it is and what you can do with it.`)
  }

  // --- DOM proxies -------------------------------------------------------------------
  const proxyEntries = cassetteMeshes.map((cassette) => {
    const game = games.find((entry) => entry.id === cassette.userData.gameId)
    return {
      id: game.id,
      object: cassette,
      anchor: cassetteAnchor(cassette),
      shortLabel: `Tape ${game.slot + 1}`,
      label: `Cassette: ${game.title}`,
      hint: 'Select to show this game on the computer screen.',
    }
  })
  proxyEntries.push({
    id: 'computer',
    object: screenMesh,
    shortLabel: 'Computer',
    label: 'The studio computer',
    hint: 'Move to the desk and read the screen.',
  })
  proxyEntries.push({
    id: 'studio-intro',
    object: noteMeshes.intro,
    shortLabel: 'Letter',
    label: 'The studio letter pinned to the wall',
    hint: 'Opens the studio introduction at readable size.',
  })
  proxyEntries.push({
    id: 'how-to',
    object: noteMeshes.howto,
    shortLabel: 'Note',
    label: 'The instruction note pinned to the wall',
    hint: 'Opens a short note on how to explore the room.',
  })

  const focusProxy = createFocusProxy({
    camera,
    layer: els.proxyLayer,
    entries: proxyEntries,
    onSelect: handleSelect,
    onHoverFromDom: (id) => picking?.setHoverFromDom(id),
  })

  // --- Pointer -----------------------------------------------------------------------
  picking = createPicking({
    element: els.viewport,
    camera,
    targets: interactables,
    controller,
    onSelect: handleSelect,
    onHoverChange: (id) => {
      hoveredId = id
      els.viewport.style.cursor = id ? 'pointer' : 'grab'
    },
  })

  // --- Station controls: the stable keyboard path ------------------------------------
  for (const station of controller.stations) {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'station-button'
    button.dataset.stationId = station.id
    button.textContent = station.label
    button.addEventListener('click', () => {
      controller.travelTo(station.id)
      announce(`Moved to ${station.label.toLowerCase()}.`)
    })
    li.append(button)
    els.stationList.append(li)
  }

  // Walking is keyboard-driven, so coarse-pointer devices get the room without a control
  // that cannot work until on-screen movement exists. main.js decides, this only renders.
  let walkButton = null
  if (canWalk) {
    walkButton = document.createElement('button')
    walkButton.type = 'button'
    walkButton.className = 'station-button'
    walkButton.id = 'walk-toggle'
    walkButton.setAttribute('aria-pressed', 'false')
    walkButton.textContent = 'Walk freely'
    walkButton.addEventListener('click', () => {
      if (controller.getMode() === 'walk') {
        const station = controller.nearestStationId()
        controller.exitWalk()
        announce(`Stopped walking. Back at ${controller.stations.find((s) => s.id === station).label.toLowerCase()}.`)
      } else {
        controller.enterWalk()
        announce('Walking freely. W, A, S and D or the arrow keys move you, and dragging looks around. Stop walking to return to a station.')
      }
    })
    els.controlsEl.append(walkButton)
  }

  const leaveButton = document.createElement('button')
  leaveButton.type = 'button'
  leaveButton.className = 'station-button'
  leaveButton.textContent = 'Leave the 3D room'
  leaveButton.addEventListener('click', () => onLeave())
  els.controlsEl.append(leaveButton)

  function markStation(id) {
    for (const button of els.stationList.querySelectorAll('button')) {
      if (button.dataset.stationId === id) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    }
    const walking = controller.getMode() === 'walk'
    if (walkButton) {
      walkButton.setAttribute('aria-pressed', String(walking))
      walkButton.textContent = walking ? 'Stop walking' : 'Walk freely'
    }
  }
  controller.subscribe(markStation)
  markStation(controller.currentStationId())

  // --- Keyboard ----------------------------------------------------------------------
  const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
  const heldKeys = new Set()

  function pushMoveInput() {
    const forward = (heldKeys.has('KeyW') || heldKeys.has('ArrowUp') ? 1 : 0)
      - (heldKeys.has('KeyS') || heldKeys.has('ArrowDown') ? 1 : 0)
    const strafe = (heldKeys.has('KeyD') ? 1 : 0) - (heldKeys.has('KeyA') ? 1 : 0)
    const turn = (heldKeys.has('ArrowRight') ? 1 : 0) - (heldKeys.has('ArrowLeft') ? 1 : 0)
    controller.setMoveInput(forward, strafe, turn)
  }

  function releaseMoveKeys() {
    heldKeys.clear()
    controller.setMoveInput(0, 0, 0)
  }

  function onKeyDown(event) {
    // The paper dialog owns the keyboard while it is open: Escape closes it natively, and
    // movement keys must not reach the camera behind the modal.
    if (els.paperDialog.open) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (controller.getMode() === 'walk') {
      if (event.key === 'Escape') {
        onLeave()
        return
      }
      if (MOVE_CODES.has(event.code)) {
        heldKeys.add(event.code)
        pushMoveInput()
        event.preventDefault()
      }
      return
    }

    const focus = document.activeElement
    const insideRoom = els.stage.contains(focus) || els.controlsEl.contains(focus)
    if (!insideRoom) return
    if (event.key === 'ArrowLeft') {
      controller.stepStation(-1)
      event.preventDefault()
    } else if (event.key === 'ArrowRight') {
      controller.stepStation(1)
      event.preventDefault()
    } else if (event.key === 'Escape') {
      onLeave()
    }
  }

  function onKeyUp(event) {
    if (!heldKeys.delete(event.code)) return
    pushMoveInput()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseMoveKeys)

  // --- Sizing, and pausing when the room is not on screen ----------------------------
  function measure() {
    const rect = els.viewport.getBoundingClientRect()
    size = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) }
    view.resize(size.width, size.height)
  }
  const resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(els.viewport)
  measure()

  let onScreen = true
  const visibilityObserver = new IntersectionObserver(
    (records) => {
      onScreen = records.some((record) => record.isIntersecting)
    },
    { threshold: 0.05 },
  )
  visibilityObserver.observe(els.viewport)

  // --- Animation loop ----------------------------------------------------------------
  let lastTime = performance.now()

  function animateCassettes() {
    for (const cassette of cassetteMeshes) {
      const isSelected = getSelectedGame()?.id === cassette.userData.gameId
      const isHovered = hoveredId === cassette.userData.gameId
      const target = isSelected ? 1 : isHovered ? 0.6 : 0
      // Reduced motion still changes state, it just does not animate between states.
      cassette.userData.hoverProgress = reducedMotion
        ? target
        : cassette.userData.hoverProgress + (target - cassette.userData.hoverProgress) * 0.18
      const progress = cassette.userData.hoverProgress
      cassette.position.z = cassette.userData.home.z + progress * 0.055
      cassette.rotation.y = progress * 0.22
    }
    screenMesh.material.emissiveIntensity = getSelectedGame() ? 1.15 : 0.7
  }

  function step(dt, now) {
    controller.update(dt)
    renderer.render(scene, camera)
    animateCassettes()
    picking.refreshHover()
    focusProxy.update(size.width, size.height)
    framesInWindow += 1
    if (now - fpsWindowStart >= 1000) {
      lastFps = Math.round((framesInWindow * 1000) / (now - fpsWindowStart))
      framesInWindow = 0
      fpsWindowStart = now
    }
  }

  function tick(now) {
    if (!running) return
    const dt = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now

    if (onScreen && document.visibilityState !== 'hidden') step(dt, now)
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  // --- Initial state -----------------------------------------------------------------
  subscribe((game) => {
    selected.value = game
    focusProxy.setSelected(game ? game.id : null)
  })
  // The room is the entry experience, so it introduces itself once; a restored selection
  // below replaces this with the more specific message.
  announce(
    'Drag to look around, or choose Walk freely to move through the room. Select a cassette to see it on the computer, or a pinned note to read it.',
  )
  const restored = restoreFromUrl()
  if (restored) {
    selected.value = restored
    focusProxy.setSelected(restored.id)
    controller.travelTo('desk')
    announce(`Restored ${restored.title} from the address.`)
  }
  if (reducedMotion) els.stage.dataset.reducedMotion = 'true'

  return {
    dispose() {
      running = false
      cancelAnimationFrame(rafId)
      if (els.paperDialog.open) els.paperDialog.close()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseMoveKeys)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      picking.dispose()
      focusProxy.dispose()
      panelApp.unmount()
      els.screenEl.hidden = true
      view.dispose()
    },

    /**
     * Renders a single frame regardless of tab visibility. Used to capture test evidence
     * deterministically, and later for generating a still preview of the room.
     */
    renderFrame() {
      measure()
      step(1 / 60, performance.now())
    },

    /** PNG data URL of the current room frame, used to capture test evidence. */
    snapshot() {
      return renderer.domElement.toDataURL('image/png')
    },

    previewPanelGame(game) {
      selected.value = game
    },

    /** A viewport point on an actual mesh, so tests can exercise raycasting rather than chips. */
    projectInteractable(id, offset = { x: 0, y: 0, z: 0 }) {
      const entry = proxyEntries.find((candidate) => candidate.id === id)
      if (!entry) return null
      const point = entry.object.position.clone().set(offset.x, offset.y, offset.z)
      entry.object.localToWorld(point)
      point.project(camera)
      const rect = els.viewport.getBoundingClientRect()
      return {
        x: rect.left + (point.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-point.y * 0.5 + 0.5) * rect.height,
        behind: point.z > 1,
      }
    },

    getStats() {
      return {
        mode: controller.getMode(),
        station: controller.currentStationId(),
        selectedGameId: getSelectedGame()?.id ?? null,
        pose: controller.getPose(),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? null,
        fps: lastFps,
        pixelRatio: renderer.getPixelRatio(),
        proxyMetrics: focusProxy.getMetrics(),
        proxies: els.proxyLayer.querySelectorAll('.proxy').length,
        clampedProxies: els.proxyLayer.querySelectorAll('.proxy.is-clamped').length,
        panelLayout: window.matchMedia('(max-width: 700px)').matches ? 'drawer' : 'side',
        reducedMotion,
      }
    },
  }
}
