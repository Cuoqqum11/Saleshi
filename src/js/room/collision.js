/**
 * Walking constraints: the room's outer walls plus the furniture a body cannot pass through.
 *
 * Colliders are axis-aligned boxes in floor space, read off the same coordinates the grey-box
 * geometry is built from in `src/js/objects/`. They are deliberately generous (the desk box
 * swallows its legs, lamp and tower) because at this milestone the goal is "you cannot walk
 * through the furniture", not a faithful physical simulation.
 *
 * Resolution is axis-separated: the X move is tested on its own, then the Z move against the
 * already-accepted X. That is what lets a walker slide along a desk edge instead of sticking to
 * it, and it costs two point-in-box tests per frame.
 */

export const ROOM_BOUNDS = { minX: -3.5, maxX: 3.5, minZ: -3, maxZ: 3 }

export const WALK = {
  eye: 1.5,
  speed: 1.7,
  radius: 0.25,
  // How quickly velocity approaches the input. Ignored entirely under reduced motion.
  response: 12,
  turnSpeed: 1.8,
  pitchLimit: 0.6,
}

export const BLOCKERS = [
  { id: 'desk', minX: 0.75, maxX: 2.45, minZ: -2.9, maxZ: -2.1 },
  { id: 'chair', minX: 0.325, maxX: 0.775, minZ: -1.725, maxZ: -1.25 },
  { id: 'shelf', minX: -3.2, maxX: -1.7, minZ: -2.9, maxZ: -2.6 },
]

function hitsBlocker(x, z, radius) {
  return BLOCKERS.some(
    (box) => x > box.minX - radius && x < box.maxX + radius && z > box.minZ - radius && z < box.maxZ + radius,
  )
}

/** Accepts as much of the requested step as the walls and furniture allow. */
export function resolveStep(from, to, radius = WALK.radius) {
  const out = { x: from.x, z: from.z }
  if (!hitsBlocker(to.x, from.z, radius)) out.x = to.x
  if (!hitsBlocker(out.x, to.z, radius)) out.z = to.z
  out.x = Math.max(ROOM_BOUNDS.minX + radius, Math.min(ROOM_BOUNDS.maxX - radius, out.x))
  out.z = Math.max(ROOM_BOUNDS.minZ + radius, Math.min(ROOM_BOUNDS.maxZ - radius, out.z))
  return out
}
