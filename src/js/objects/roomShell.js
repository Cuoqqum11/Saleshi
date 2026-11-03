/**
 * The static architecture and furniture — M7 Stage B.
 *
 * Two rules govern everything in this file.
 *
 * 1. **The inner faces stay on the old room's coordinates.** `ROOM_BOUNDS` in
 *    `src/js/room/collision.js` is x ±3.5, z −3..3 and the three `BLOCKERS` were read off the
 *    grey-box geometry that `tests/e2e/movement.mjs` measures against (desk front at z −2.1, chair
 *    face at x 0.775, shelf end at x −1.7). So walls are built *outward* from those planes: the
 *    thickness is what makes a door and window reveal read as an opening instead of a painted hole,
 *    and no visible surface moves.
 * 2. **Nothing new goes on the floor.** Every collider already swallows the furniture it covers. A
 *    crate or a bin on the floor would need a new collider and new movement assertions, and the only
 *    clear line to the north wall is the corridor test W4 walks. The one heavy object the room needs
 *    under the desk — the tower — lives inside the desk's existing box, in `computer.js`.
 */

import * as THREE from 'three'
import { FLOOR_TILE, PAPER_TILE, PLASTER_TILE, WOOD_TILE, materials } from './materials.js'
import { cone, cylinder, part, sphere, tiledBox, tiledPlane, torus, tube } from './build.js'

export const ROOM = { width: 7, depth: 6, height: 2.8 }

/** Wall thickness. The room's inner dimensions are unchanged by it. */
const T = 0.1
const HX = ROOM.width / 2
const TZ = ROOM.depth / 2
const H = ROOM.height

/** The door opening, on the south wall. */
const DOOR = { x: -0.4, width: 0.92, height: 2.06 }
/** The window opening, high on the east wall — the one architectural addition (§6 of the plan). */
const WINDOW = { z: -0.7, width: 1.0, bottom: 1.7, top: 2.3 }

/** Where the lamp's mouth is and what it points at, so `room/lights.js` can put the light there (V5). */
export const LAMP = {
  mouth: { x: 2.2, y: 1.05, z: -2.71 },
  target: { x: 1.72, y: 0.78, z: -2.42 },
}

/** The desk's working surface height, shared with `computer.js` so nothing floats (V4). */
export const DESK_TOP_Y = 0.78

export function buildRoomShell() {
  const group = new THREE.Group()
  group.name = 'room-shell'

  // --- Floor and ceiling ---------------------------------------------------------------
  // V1: there was no ceiling at all, so the sky colour showed as a black band above the walls.
  part(group, tiledPlane(ROOM.width, ROOM.depth, FLOOR_TILE), materials.floor, [0, 0, 0], {
    rotation: [-Math.PI / 2, 0, 0],
    name: 'floor',
  })
  part(group, tiledPlane(ROOM.width, ROOM.depth, PLASTER_TILE), materials.ceiling, [0, H, 0], {
    rotation: [Math.PI / 2, 0, 0],
    name: 'ceiling',
  })

  // --- Walls ---------------------------------------------------------------------------
  // North carries the shelf and the computer, so it is the accent wall: same paint family, darker
  // albedo, which is what gives the catalogue something to sit against. The other three use `wall`.
  // Every wall is a box rather than a plane, so corners have a material edge (V2).
  part(group, tiledBox(ROOM.width + 2 * T, H, T, 'front', PLASTER_TILE), materials.wallDarker,
    [0, H / 2, -TZ - T / 2], { name: 'wall-north' })
  part(group, tiledBox(T, H, ROOM.depth, 'side', PLASTER_TILE), materials.wall,
    [-HX - T / 2, H / 2, 0], { name: 'wall-west' })
  part(group, tiledBox(T, H, ROOM.depth, 'side', PLASTER_TILE), materials.wall,
    [HX + T / 2, H / 2, 0], { name: 'wall-east' })

  // South wall: four pieces around the door opening, which is what gives the opening a reveal.
  const doorLeft = DOOR.x - DOOR.width / 2
  const doorRight = DOOR.x + DOOR.width / 2
  const southLeft = doorLeft - (-HX - T)
  const southRight = HX + T - doorRight
  part(group, tiledBox(southLeft, H, T, 'front', PLASTER_TILE), materials.wall,
    [-HX - T + southLeft / 2, H / 2, TZ + T / 2])
  part(group, tiledBox(southRight, H, T, 'front', PLASTER_TILE), materials.wall,
    [HX + T - southRight / 2, H / 2, TZ + T / 2])
  part(group, tiledBox(DOOR.width, H - DOOR.height, T, 'front', PLASTER_TILE), materials.wall,
    [DOOR.x, DOOR.height + (H - DOOR.height) / 2, TZ + T / 2])

  // East wall: four pieces around the window.
  const winNorth = WINDOW.z - WINDOW.width / 2
  const winSouth = WINDOW.z + WINDOW.width / 2
  part(group, tiledBox(T, H, winNorth + TZ + T, 'side', PLASTER_TILE), materials.wall,
    [HX + T / 2, H / 2, (-TZ - T + winNorth) / 2])
  part(group, tiledBox(T, H, TZ + T - winSouth, 'side', PLASTER_TILE), materials.wall,
    [HX + T / 2, H / 2, (TZ + T + winSouth) / 2])
  part(group, tiledBox(T, WINDOW.bottom, WINDOW.width, 'side', PLASTER_TILE), materials.wall,
    [HX + T / 2, WINDOW.bottom / 2, WINDOW.z])
  part(group, tiledBox(T, H - WINDOW.top, WINDOW.width, 'side', PLASTER_TILE), materials.wall,
    [HX + T / 2, WINDOW.top + (H - WINDOW.top) / 2, WINDOW.z])

  // --- Skirting ----------------------------------------------------------------------
  // The junction detail V2 asked for. It stops at the door frame instead of running through it.
  const skirt = (width, depth, x, z, face) => part(
    group, tiledBox(width, 0.1, depth, face, WOOD_TILE, 0.004), materials.skirting, [x, 0.05, z],
  )
  skirt(ROOM.width, 0.03, 0, -TZ + 0.015, 'front')
  skirt(0.03, ROOM.depth, -HX + 0.015, 0, 'side')
  skirt(0.03, ROOM.depth, HX - 0.015, 0, 'side')
  skirt(doorLeft + HX, 0.03, (-HX + doorLeft) / 2, TZ - 0.015, 'front')
  skirt(HX - doorRight, 0.03, (doorRight + HX) / 2, TZ - 0.015, 'front')

  buildDoor(group)
  buildWindow(group)
  buildDesk(group)
  buildChair(group)
  buildLamp(group)
  buildDeskProps(group)

  return group
}

/** A closed, panelled door with an architrave — the room's entry point, and the only one. */
function buildDoor(group) {
  const leafZ = TZ - 0.02
  const frame = (width, height, x, y) => part(
    group, tiledBox(width, height, 0.04, 'front', WOOD_TILE, 0.004), materials.doorFrame, [x, y, TZ - 0.035],
  )
  frame(0.06, DOOR.height + 0.06, DOOR.x - DOOR.width / 2 - 0.03, DOOR.height / 2)
  frame(0.06, DOOR.height + 0.06, DOOR.x + DOOR.width / 2 + 0.03, DOOR.height / 2)
  frame(DOOR.width + 0.12, 0.06, DOOR.x, DOOR.height + 0.03)

  part(group, tiledBox(0.88, 2.0, 0.04, 'front', WOOD_TILE, 0.006), materials.woodDark,
    [DOOR.x, 1.0, leafZ], { name: 'door', cast: true })
  // Two raised panels: the cheapest way to make a door read as made rather than cut.
  for (const y of [0.55, 1.4]) {
    part(group, tiledBox(0.62, 0.62, 0.014, 'front', WOOD_TILE, 0.005), materials.wood,
      [DOOR.x, y, leafZ - 0.027])
  }
  // Knob on a short stem, on the hinge-free side.
  part(group, cylinder(0.014, 0.014, 0.05, 8), materials.metal, [DOOR.x - 0.34, 1.0, leafZ - 0.03], {
    rotation: [Math.PI / 2, 0, 0],
  })
  part(group, sphere(0.028, 12, 8), materials.metal, [DOOR.x - 0.34, 1.0, leafZ - 0.062])
}

/**
 * The window: casing, sill, one mullion and a flat dusk plane recessed into the reveal.
 *
 * There is no glass surface. A transparent pane would have to sort correctly against the tape, the
 * empty cases and the lamp shade, and it buys nothing a visitor can see at this size, so the opening
 * is deliberately finished as an aperture with a lit-colour back plane.
 */
function buildWindow(group) {
  const mid = (WINDOW.bottom + WINDOW.top) / 2
  const casing = (width, height, depth, y, z) => part(
    group, tiledBox(width, height, depth, 'side', WOOD_TILE, 0.004), materials.windowFrame, [HX - 0.03, y, z],
  )
  const jamb = WINDOW.width / 2 - 0.025
  casing(0.06, 0.05, WINDOW.width + 0.06, WINDOW.top - 0.025, WINDOW.z)
  casing(0.06, WINDOW.top - WINDOW.bottom, 0.05, mid, WINDOW.z - jamb)
  casing(0.06, WINDOW.top - WINDOW.bottom, 0.05, mid, WINDOW.z + jamb)
  // One vertical bar, so the opening reads as a made window rather than a hole in the wall.
  casing(0.045, WINDOW.top - WINDOW.bottom, 0.035, mid, WINDOW.z)
  // Sill, proud of the wall face.
  part(group, tiledBox(0.16, 0.03, WINDOW.width + 0.14, 'front', WOOD_TILE, 0.005), materials.windowFrame,
    [HX - 0.06, WINDOW.bottom - 0.015, WINDOW.z], { cast: true })

  part(group, tiledPlane(WINDOW.width - 0.02, WINDOW.top - WINDOW.bottom - 0.02, PLASTER_TILE), materials.dusk,
    [HX + T - 0.02, mid, WINDOW.z], { rotation: [0, -Math.PI / 2, 0], name: 'window-dusk' })
}

/** A pedestal desk: one board, one pedestal with two drawers, two legs and a back rail. */
function buildDesk(group) {
  const x = 1.6
  const z = -2.5
  part(group, tiledBox(1.72, 0.05, 0.82, 'top', WOOD_TILE, 0.008), materials.wood, [x, 0.755, z], {
    name: 'desk-top',
    cast: true,
  })

  part(group, tiledBox(0.5, 0.73, 0.56, 'side', WOOD_TILE, 0.006), materials.woodDark,
    [1.05, 0.365, z], { name: 'desk-pedestal', cast: true })
  for (const y of [0.26, 0.55]) {
    part(group, tiledBox(0.46, 0.2, 0.025, 'front', WOOD_TILE, 0.004), materials.wood, [1.05, y, -2.2325])
    part(group, cylinder(0.008, 0.008, 0.12, 8), materials.metal, [1.05, y, -2.256], {
      rotation: [0, 0, Math.PI / 2],
    })
  }

  for (const dz of [-0.34, 0.34]) {
    part(group, tiledBox(0.07, 0.73, 0.07, 'front', WOOD_TILE, 0.004), materials.woodDark,
      [2.38, 0.365, z + dz], { cast: true })
  }
  part(group, tiledBox(1.08, 0.1, 0.045, 'front', WOOD_TILE), materials.woodDark, [1.84, 0.68, -2.84])
}

/**
 * The chair, rebuilt where it already stood.
 *
 * Moving it out of the walkway was the obvious tidy-up, but its collider is the one
 * `movement.mjs` test W3 measures the body radius against, so the seat and back are built inside the
 * same 0.45 m footprint and only the *form* changes: a slab on one post becomes four legs, a frame
 * and upholstery.
 */
function buildChair(group) {
  const x = 0.55
  const z = -1.49
  part(group, tiledBox(0.44, 0.05, 0.44, 'top', WOOD_TILE, 0.016), materials.upholstery, [x, 0.45, z], {
    name: 'chair-seat',
    cast: true,
  })
  part(group, tiledBox(0.42, 0.4, 0.045, 'front', WOOD_TILE, 0.014), materials.upholstery,
    [x, 0.68, -1.275], { rotation: [0.08, 0, 0], cast: true })
  for (const [dx, dz] of [[-0.185, -0.185], [0.185, -0.185], [-0.185, 0.185], [0.185, 0.185]]) {
    part(group, cylinder(0.017, 0.02, 0.43, 8), materials.woodDark, [x + dx, 0.215, z + dz], { cast: true })
  }
  // The rear legs continue up as the back posts, which is what makes a chair back stay up.
  for (const dx of [-0.165, 0.165]) {
    part(group, cylinder(0.017, 0.017, 0.44, 8), materials.woodDark, [x + dx, 0.64, z + 0.19], {
      rotation: [0.08, 0, 0],
    })
  }
}

/**
 * A task lamp whose light actually comes from its shade (V5).
 *
 * The shade is dark metal with the bulb inside it rather than a glowing surface: the old emissive
 * cone blew out to white under the point light standing in front of it. `LAMP.mouth` and `LAMP.target`
 * are exported so `room/lights.js` puts the spot at the mouth instead of near it.
 */
function buildLamp(group) {
  const base = [2.34, -2.81]
  part(group, cylinder(0.075, 0.085, 0.02, 16), materials.metalDark, [base[0], 0.79, base[1]], { cast: true })
  part(group, cylinder(0.013, 0.013, 0.34, 10), materials.metal, [base[0], 0.97, base[1]])
  part(group, sphere(0.021, 10, 8), materials.metalDark, [base[0], 1.14, base[1]])
  // A short arm reaching out over the desk, then the shade hanging from its end.
  part(group, cylinder(0.012, 0.012, 0.22, 10), materials.metal, [2.27, 1.15, -2.77], {
    rotation: [0, 0, Math.PI / 2 - 0.4],
  })

  part(group, cone(0.1, 0.14, 18, true), materials.lampShade, [2.24, 1.12, -2.74], {
    rotation: [0, 0, -0.5],
    name: 'lamp-shade',
    cast: true,
  })
  part(group, sphere(0.03, 12, 8), materials.lampBulb, [2.22, 1.07, -2.73])
}

/** Mug, paper and cable runs: the few objects that make a bare board read as used (V12). */
function buildDeskProps(group) {
  part(group, cylinder(0.038, 0.033, 0.095, 14), materials.monitorPlastic, [2.25, 0.828, -2.24], { cast: true })
  part(group, torus(0.021, 0.007, 12), materials.monitorPlastic, [2.294, 0.83, -2.24], {
    rotation: [0, Math.PI / 2, 0],
  })

  // A pad of paper, squared off, so the desk has one flat rectangle that is not a screen. A5 rather
  // than A4, and the aged back-sheet colour: at the previous size it was the second-brightest thing
  // on the desk and competed with the monitor.
  part(group, tiledBox(0.15, 0.014, 0.21, 'top', PAPER_TILE, 0.003), materials.paperBack,
    [2.17, 0.787, -2.62], { rotation: [0, 0.22, 0], cast: true })

  part(group, tube([
    [1.82, 0.8, -2.8], [2.2, 0.62, -2.93], [2.36, 0.2, -2.96], [2.36, 0.02, -2.9],
  ]), materials.cable, [0, 0, 0], { name: 'cable-monitor' })
  part(group, tube([
    [1.5, 0.79, -2.34], [1.42, 0.66, -2.62], [1.38, 0.3, -2.9], [1.36, 0.03, -2.86],
  ]), materials.cable, [0, 0, 0], { name: 'cable-desk' })
}
