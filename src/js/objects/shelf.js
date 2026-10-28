import * as THREE from 'three'
import { materials } from './materials.js'
import { createCassette, createEmptySlot } from './cassette.js'

export const SHELF_PLANK = { x: -2.45, y: 1.0, z: -2.75, width: 1.5, depth: 0.3 }
const SLOT_SPACING = 0.25
const FIRST_SLOT_X = -3.0
const CASSETTE_Y = SHELF_PLANK.y + 0.02 + 0.055
const CASSETTE_Z = SHELF_PLANK.z + 0.03

/**
 * A wall-mounted plank holding one cassette per game, then visibly empty positions.
 *
 * Cassettes are generated from the game data, so adding a project means adding a record and
 * (optionally) its label art — not editing the room.
 */
export function createShelf({ games, capacity }) {
  const group = new THREE.Group()
  group.name = 'cassette-shelf'

  const plank = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_PLANK.width, 0.04, SHELF_PLANK.depth),
    materials.wood,
  )
  plank.position.set(SHELF_PLANK.x, SHELF_PLANK.y, SHELF_PLANK.z)
  plank.name = 'shelf-plank'
  group.add(plank)

  // Back board so the tapes do not read as floating against the wall.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_PLANK.width, 0.5, 0.03),
    materials.woodDark,
  )
  board.position.set(SHELF_PLANK.x, SHELF_PLANK.y + 0.26, SHELF_PLANK.z - SHELF_PLANK.depth / 2)
  group.add(board)

  for (const side of [-1, 1]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.1), materials.metal)
    bracket.position.set(SHELF_PLANK.x + side * (SHELF_PLANK.width / 2 - 0.02), SHELF_PLANK.y - 0.09, SHELF_PLANK.z + 0.06)
    group.add(bracket)
  }

  const interactables = []

  for (let slot = 0; slot < capacity; slot += 1) {
    const position = new THREE.Vector3(FIRST_SLOT_X + slot * SLOT_SPACING, CASSETTE_Y, CASSETTE_Z)
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

/** Where a proxy button and the later proximity check anchor for a cassette. */
export function cassetteAnchor(cassette) {
  return new THREE.Vector3(cassette.position.x, cassette.position.y + 0.1, cassette.position.z + 0.05)
}
