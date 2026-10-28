/**
 * Entry point. Deliberately free of Three.js and Vue imports: nothing heavier than this file
 * is downloaded until a visitor actually chooses to enter the room.
 */

const els = {
  html: document.documentElement,
  stage: document.getElementById('stage'),
  proxyLayer: document.getElementById('room-proxy-layer'),
  screenEl: document.getElementById('monitor-screen'),
  controlsEl: document.getElementById('room-controls'),
  stationList: document.getElementById('station-list'),
  selectionStatus: document.getElementById('selection-status'),
  moveHint: document.getElementById('move-hint'),
  status: document.getElementById('room-status'),
  launcher: document.getElementById('room-launcher'),
  launchButton: document.querySelector('[data-action="enter-room"]'),
  paperDialog: document.getElementById('paper-view'),
  paperTitle: document.getElementById('paper-view-title'),
  paperBody: document.getElementById('paper-view-body'),
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
// Walking is keyboard-driven, so a device whose only pointer is a finger gets the room
// without the walk control until on-screen movement exists. Pointer type, not viewport
// width, decides this: a tablet is coarse, a desktop with a touchscreen is not.
const canWalkByDefault = !window.matchMedia('(pointer: coarse)').matches

let room = null

/**
 * The room column is sized to "viewport minus the header", and the header wraps to two
 * lines on narrow screens, so its height is measured rather than assumed.
 */
function syncHeaderHeight() {
  const header = document.querySelector('.site-header')
  if (header) els.html.style.setProperty('--header-h', `${header.offsetHeight}px`)
}
window.addEventListener('resize', syncHeaderHeight)
syncHeaderHeight()

function hasWebGL() {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

function setStatus(state, message) {
  els.status.dataset.state = state
  els.status.textContent = message
}

function stayOut(reason) {
  els.html.dataset.room = 'off'
  setStatus('idle', reason)
}

/**
 * A control that cannot do its job must not look like one. Without WebGL the room can never
 * start here, so the launcher is withdrawn rather than left to fail on click.
 */
function withdrawLauncher(reason) {
  if (!els.launchButton) return
  els.launchButton.disabled = true
  els.launchButton.setAttribute('aria-disabled', 'true')
  els.launchButton.textContent = 'The 3D room is unavailable in this browser'
  els.launchButton.title = reason
}

async function startRoomInstance() {
  if (room) return
  setStatus('busy', 'Starting the studio room…')
  els.html.dataset.room = 'on'
  els.stage.hidden = false
  els.controlsEl.hidden = false
  if (!canWalkByDefault) {
    els.moveHint.textContent =
      'Drag inside the room to look around. Use the buttons to move to the shelf or the computer. Select a cassette to see it on the computer, or a pinned note to read it.'
  }
  try {
    const { startRoom } = await import('./room/startRoom.js')
    room = startRoom({
      els,
      reducedMotion: reducedMotionQuery.matches,
      canWalk: canWalkByDefault,
      onLeave: stopRoom,
    })
    setStatus('ready', 'The room is running. Drag inside it to look around, or use the controls beneath it.')
  } catch (error) {
    // A failed start must not leave the visitor with a blank stage and no way out.
    stopRoom()
    setStatus('failed', 'The 3D room could not start on this device. Everything it contains is written out below.')
    console.error('Room failed to start', error)
  }
}

function stopRoom() {
  room?.dispose()
  room = null
  els.html.dataset.room = 'off'
  els.stage.hidden = true
  els.controlsEl.hidden = true
  els.selectionStatus.textContent = ''
  setStatus('idle', 'The 3D room is closed. The studio letter and the game list below are the same information in text.')
  els.launchButton?.focus()
}

/**
 * Entry is decided by what the device can do, not by how wide its window is: a phone with
 * WebGL gets the room like everyone else. Two non-width signals keep the text view honest —
 * a browser asking to save data, and a viewport too small to show stage and controls
 * together. `?view=list` and `?view=room` override either way.
 */
function roomDecision() {
  if (!hasWebGL()) {
    return { enter: false, withdrawn: true, reason: 'This browser cannot show the 3D room, so everything is presented as ordinary text and links instead.' }
  }
  if (navigator.connection?.saveData) {
    return { enter: false, reason: 'Your browser has asked for reduced data use, so the 3D room is not loaded. Everything it contains is written out below, and the button still works if you want it anyway.' }
  }
  if (window.innerWidth < 320 || window.innerHeight < 480) {
    return { enter: false, reason: 'This window is too small to show the room and its controls together, so the text view comes first. You can still enter the 3D room using the button below.' }
  }
  return { enter: true }
}

function decideInitialState() {
  const requested = new URLSearchParams(window.location.search).get('view')
  if (requested === 'list') {
    stayOut('You asked for the text view, so the 3D room is not running.')
    return
  }
  const decision = roomDecision()
  // `?view=room` can override a usability choice, but never a missing GPU.
  const forced = requested === 'room' && !decision.withdrawn
  if (!decision.enter && !forced) {
    stayOut(decision.reason)
    if (decision.withdrawn) withdrawLauncher(decision.reason)
    return
  }
  startRoomInstance()
}

els.launchButton?.addEventListener('click', startRoomInstance)

// The room's motion behaviour is baked into the modules it loaded, so a mid-session change to
// the system preference restarts it rather than leaving half the effects animated.
reducedMotionQuery.addEventListener('change', () => {
  if (!room) return
  stopRoom()
  startRoomInstance()
})

decideInitialState()

if (import.meta.env.DEV) {
  window.__saleshiRoom = {
    isRunning: () => Boolean(room),
    stats: () => room?.getStats() ?? null,
    render: () => room?.renderFrame(),
    // Renders before reading, so evidence is captured from a real frame even when the tab is
    // in the background and requestAnimationFrame is throttled.
    snapshot: () => {
      if (!room) return null
      room.renderFrame()
      return room.snapshot()
    },
    start: startRoomInstance,
    stop: stopRoom,
  }
}
