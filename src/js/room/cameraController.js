/**
 * Camera controller.
 *
 * One interface, two modes:
 *
 *   travelTo(id)        move the viewer to a place in the room (mode becomes 'station')
 *   enterWalk()         hand the viewer their own velocity (mode becomes 'walk')
 *   setMoveInput(f,s,t) forward / strafe / turn, each -1..1, from keyboard or a future stick
 *   setLookDelta(dx,dy) drag-to-look; clamped at a station, free yaw while walking
 *   update(dtSeconds)   called once per animation frame
 *   getPose()           where the eye is and which way it faces
 *   getMode()           'station' or 'walk'
 *
 * Free movement landed here as a second mode rather than as a separate `freeWalk.js` module:
 * picking, the DOM focus proxies and the control bar all read one pose through `getPose()` and
 * `subscribe()`, and two controllers would have meant two sources of truth for where the eye is.
 * The station list survives as shortcuts and as the reduced-motion alternative.
 *
 * Under reduced motion, station travel is an instant cut and walking has no inertia: velocity
 * equals the input exactly, so releasing the key stops the camera on the same frame.
 */

import { STATIONS, stationById } from './stations.js'
import { WALK, resolveStep } from './collision.js'

const LOOK_YAW_LIMIT = 0.45 // ~26°, enough to feel like looking around, not enough to spin
const LOOK_PITCH_LIMIT = 0.2 // ~11°
const LOOK_SENSITIVITY = 0.0042
const TRAVEL_SECONDS = 0.9

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** Keeps a rotation delta on the short way round, so travel never spins the long way. */
function shortestAngle(from, to) {
  let delta = to - from
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return from + delta
}

function poseFor(station) {
  const dx = station.target.x - station.position.x
  const dy = station.target.y - station.position.y
  const dz = station.target.z - station.position.z
  const length = Math.hypot(dx, dy, dz) || 1
  return {
    x: station.position.x,
    y: station.position.y,
    z: station.position.z,
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.asin(Math.max(-1, Math.min(1, dy / length))),
  }
}

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))

export function createCameraController(camera, { reducedMotion = false } = {}) {
  const first = poseFor(STATIONS[0])
  const listeners = new Set()

  let from = { ...first }
  let to = { ...first }
  let current = { ...first }
  let elapsed = 0
  let duration = 0
  let look = { yaw: 0, pitch: 0 }
  let lookFrom = { yaw: 0, pitch: 0 }
  let currentId = STATIONS[0].id
  let motionReduced = reducedMotion
  let mode = 'station'
  let velocity = { x: 0, z: 0 }
  let moveInput = { forward: 0, strafe: 0, turn: 0 }

  camera.rotation.order = 'YXZ'

  function apply() {
    const t = duration === 0 ? 1 : easeInOutCubic(Math.min(1, elapsed / duration))
    current = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
      yaw: from.yaw + (to.yaw - from.yaw) * t,
      pitch: from.pitch + (to.pitch - from.pitch) * t,
    }
    camera.position.set(current.x, current.y, current.z)
    camera.rotation.y = current.yaw + look.yaw
    camera.rotation.x = current.pitch + look.pitch
  }

  function announce() {
    for (const listener of listeners) listener(currentId)
  }

  return {
    getMode: () => mode,
    stations: STATIONS,
    currentStationId: () => currentId,
    isTravelling: () => elapsed < duration,

    travelTo(id) {
      const station = stationById(id)
      if (!station) return false
      if (id === currentId && elapsed >= duration && mode === 'station') return false
      mode = 'station'
      velocity = { x: 0, z: 0 }
      // Interrupting a travel starts from where the viewer actually is, not from the old goal.
      from = { ...current }
      to = poseFor(station)
      to.yaw = shortestAngle(from.yaw, to.yaw)
      lookFrom = { ...look }
      elapsed = 0
      // Reduced motion means no travel animation at all: an instant cut, not a shorter tween.
      duration = motionReduced ? 0 : TRAVEL_SECONDS
      currentId = id
      apply()
      announce()
      return true
    },

    /** Hands the viewer their own velocity. The eye rises to standing height on the way in. */
    enterWalk() {
      if (mode === 'walk') return false
      mode = 'walk'
      velocity = { x: 0, z: 0 }
      from = { ...current }
      to = { ...current, y: WALK.eye }
      // Drag-look offsets are station-scoped; walking owns the base yaw instead.
      look = { yaw: 0, pitch: 0 }
      lookFrom = { yaw: 0, pitch: 0 }
      elapsed = 0
      duration = motionReduced ? 0 : 0.45
      currentId = null
      apply()
      announce()
      return true
    },

    /** Leaves walking for the nearest station, so the toggle always lands somewhere named. */
    exitWalk() {
      if (mode !== 'walk') return false
      return this.travelTo(this.nearestStationId())
    },

    nearestStationId() {
      let best = STATIONS[0].id
      let bestDistance = Infinity
      for (const station of STATIONS) {
        const distance = Math.hypot(station.position.x - current.x, station.position.z - current.z)
        if (distance < bestDistance) {
          bestDistance = distance
          best = station.id
        }
      }
      return best
    },

    setMoveInput(forward, strafe, turn) {
      moveInput = { forward, strafe, turn }
    },

    /** Used by the arrow controls and the keyboard handler. */
    stepStation(direction) {
      const index = STATIONS.findIndex((station) => station.id === currentId)
      const next = (index + direction + STATIONS.length) % STATIONS.length
      return this.travelTo(STATIONS[next].id)
    },

    setLookDelta(dxPixels, dyPixels) {
      if (mode === 'walk') {
        // Walking needs to be able to turn all the way round, so the delta goes into the base
        // yaw with no limit. Pitch stays limited: looking at the floor or ceiling buys nothing.
        to.yaw += dxPixels * LOOK_SENSITIVITY
        to.pitch = clamp(to.pitch - dyPixels * LOOK_SENSITIVITY, WALK.pitchLimit)
        from = { ...to }
        current = { ...to }
        apply()
        return
      }
      look.yaw = clamp(look.yaw + dxPixels * LOOK_SENSITIVITY, LOOK_YAW_LIMIT)
      look.pitch = clamp(look.pitch - dyPixels * LOOK_SENSITIVITY, LOOK_PITCH_LIMIT)
    },

    setReducedMotion(value) {
      motionReduced = Boolean(value)
    },

    getPose() {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: camera.rotation.y,
        pitch: camera.rotation.x,
      }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    update(dtSeconds) {
      if (elapsed < duration) {
        elapsed = Math.min(duration, elapsed + dtSeconds)
        const t = easeInOutCubic(elapsed / duration)
        // Drag-look offsets fade out during travel so a mid-travel drag cannot fight the tween.
        look.yaw = lookFrom.yaw * (1 - t)
        look.pitch = lookFrom.pitch * (1 - t)
        apply()
        return
      }
      if (mode === 'walk') {
        const yaw = to.yaw
        const desired = {
          x: (-Math.sin(yaw) * moveInput.forward + Math.cos(yaw) * moveInput.strafe) * WALK.speed,
          z: (-Math.cos(yaw) * moveInput.forward - Math.sin(yaw) * moveInput.strafe) * WALK.speed,
        }
        if (motionReduced) {
          velocity = desired
        } else {
          const blend = 1 - Math.exp(-dtSeconds * WALK.response)
          velocity = {
            x: velocity.x + (desired.x - velocity.x) * blend,
            z: velocity.z + (desired.z - velocity.z) * blend,
          }
        }
        to.yaw += moveInput.turn * dtSeconds * WALK.turnSpeed
        const stepped = resolveStep(to, { x: to.x + velocity.x * dtSeconds, z: to.z + velocity.z * dtSeconds })
        to.x = stepped.x
        to.z = stepped.z
        from = { ...to }
        current = { ...to }
        apply()
        return
      }
      apply()
    },
  }
}
