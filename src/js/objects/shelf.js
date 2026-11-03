/**
 * The shelf carcass — M7 Stage B/E.
 *
 * V8 was blunt: "a plank with a large dark rectangle behind it and two grey tabs under it. It reads as
 * a broken fitting, not furniture, and it is the object that holds the portfolio." So the plank gains
 * side panels, a back board, a top board and a lower board, and the dark rectangle becomes the inside
 * face of a carcass.
 *
 * The footprint is unchanged on purpose. `BLOCKERS` in `src/js/room/collision.js` gives the shelf
 * x −3.2..−1.7 and z −2.9..−2.6, and `tests/e2e/movement.mjs` measures the walk against exactly those
 * numbers (test W3b's corridor, test W4's line to the north wall). Every board here is built inside
 * that box, so navigation and its assertions are untouched — which is what the brief asks for when it
 * says geometry changes must be reflected in the collision data: the honest answer for this piece of
 * geometry is that they are not changes.
 */

import * as THREE from 'three'
import { box, part, tiledBox } from './build.js'
import { CASE_SIZE, createCassette, createEmptySlot, createFlatEmptyCase } from './cassette.js'
import { WOOD_TILE, materials } from './materials.js'

export const SHELF_PLANK = { x: -2.45, y: 1.0, z: -2.75, width: 1.5, depth: 0.3 }
const SLOT_SPACING = 0.25
const FIRST_SLOT_X = -3.0
const PLANK_TOP = SHELF_PLANK.y + 0.02
const CASES_Z = SHELF_PLANK.z + 0.03
const CASSETTE_Y = PLANK_TOP + CASE_SIZE.height / 2

const INSIDE_WIDTH = SHELF_PLANK.width - 0.05
const TOP_Y = 1.615
const LOWER_Y = 0.63

/**
 * A wall-mounted carcass holding one case per game, then visibly empty positions.
 *
 * Cases are generated from the game data, so adding a project means adding a record and (optionally)
 * its cover artwork — not editing the room.
 */
export function createShelf({ games, capacity }) {
  const group = new THREE.Group()
  group.name = 'cassette-shelf'

  // Carcass: back, two sides, top, the showing board and a lower board.
  part(group, tiledBox(INSIDE_WIDTH, 1.1, 0.025, 'front', WOOD_TILE), materials.woodDark,
    [SHELF_PLANK.x, 1.05, SHELF_PLANK.z - SHELF_PLANK.depth / 2 + 0.0125], { name: 'shelf-back' })
  for (const side of [-1, 1]) {
    part(group, tiledBox(0.025, 1.1, SHELF_PLANK.depth, 'side', WOOD_TILE), materials.wood,
      [SHELF_PLANK.x + side * (SHELF_PLANK.width / 2 - 0.0125), 1.05, SHELF_PLANK.z], {
        name: `shelf-side-${side}`,
        cast: true,
      })
  }
  part(group, tiledBox(SHELF_PLANK.width, 0.03, SHELF_PLANK.depth, 'top', WOOD_TILE, 0.005), materials.wood,
    [SHELF_PLANK.x, TOP_Y, SHELF_PLANK.z], { name: 'shelf-top', cast: true })
  part(group, tiledBox(INSIDE_WIDTH, 0.04, SHELF_PLANK.depth, 'top', WOOD_TILE, 0.006), materials.woodShelf,
    [SHELF_PLANK.x, SHELF_PLANK.y, SHELF_PLANK.z], { name: 'shelf-plank', cast: true })
  part(group, tiledBox(INSIDE_WIDTH, 0.025, 0.28, 'top', WOOD_TILE, 0.004), materials.woodShelf,
    [SHELF_PLANK.x, LOWER_Y, SHELF_PLANK.z], { cast: true })

  // Above the visitor's head, the storage the shelf is actually attached to: one plain box and a
  // couple of blank cases. Unlabelled, so they read as packaging rather than as hidden products.
  part(group, box(0.26, 0.2, 0.3, 0.008), materials.cardboard,
    [SHELF_PLANK.x - 0.4, TOP_Y + 0.115, SHELF_PLANK.z], { name: 'storage-box', cast: true })
  for (const [index, dz] of [[0, 0.028], [1, -0.004]]) {
    group.add(createFlatEmptyCase({
      position: new THREE.Vector3(SHELF_PLANK.x + 0.42, TOP_Y + 0.028 + index * 0.027, SHELF_PLANK.z + dz),
      rotationY: index === 0 ? 0.06 : -0.04,
    }))
  }
  group.add(createFlatEmptyCase({
    position: new THREE.Vector3(SHELF_PLANK.x + 0.3, LOWER_Y + 0.0255, SHELF_PLANK.z - 0.01),
    rotationY: 0.09,
  }))

  const interactables = []

  for (let slot = 0; slot < capacity; slot += 1) {
    const position = new THREE.Vector3(FIRST_SLOT_X + slot * SLOT_SPACING, CASSETTE_Y, CASES_Z)
    const game = games.find((entry) => entry.slot === slot)
    if (game) {
      const cassette = createCassette({ game, position })
      group.add(cassette)
      interactables.push(cassette)
    } else {
      group.add(createEmptySlot({ position }))
    }
  }

  return { group, interactables }
}

/** Where a proxy button and the later proximity check anchor for a case. */
export function cassetteAnchor(cassette) {
  return new THREE.Vector3(
    cassette.position.x,
    cassette.position.y + CASE_SIZE.height / 2 + 0.05,
    cassette.position.z + 0.05,
  )
}
