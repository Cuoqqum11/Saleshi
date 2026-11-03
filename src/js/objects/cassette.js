/**
 * The physical game cases on the shelf — M7 Stage E.
 *
 * V9 was a flat grey slab with a beige sticker: no thickness, no seam, no spine, no packaging surface
 * and no artwork, even though the studio had supplied real frames. This is now a case with all six
 * properties the brief asks for, and one more: a printed J-card with a window cut through it, so the
 * cassette inside is what the shelf's name has always meant.
 *
 * Layering, back to front along the case's own z axis. Each part overlaps the one behind it, so no
 * surface floats:
 *
 *   plastic body → seam ridge on the opening edge → cassette shell → hubs → printed front card →
 *   folded spine strip over the top edge → printed back card.
 *
 * The front card is the only transparent surface, and only because `clearRect` cuts a real hole in
 * it. The artwork is the studio's own supplied frame; the strings are the game record. Nothing here
 * invents a title, a studio name or a screenshot.
 */

import * as THREE from 'three'
import { box, circle, part, plane } from './build.js'
import { materials } from './materials.js'
import { coverCardCanvas, spineCanvas, textureFrom } from './textures.js'

export const CASE_SIZE = { width: 0.135, height: 0.19, depth: 0.026 }

/** The printed face is inset from the moulding, the way a card wraps a case rather than replacing it. */
const FACE = { width: CASE_SIZE.width - 0.006, height: CASE_SIZE.height - 0.006 }
const TAPE = { width: 0.1, height: 0.063, depth: 0.008 }
const BODY_DEPTH = 0.018

/**
 * The tape sits so that the card's window shows its lower half and the two reels — which is what you
 * actually see through the cut-out of a real in-game cassette case. It is placed in the case's own
 * coordinates, entirely inside the face, so nothing hangs below the shelf.
 */
const TAPE_Y = -0.055
const HUB_Y = TAPE_Y - 0.0105
const HUB_X = 0.0227

/**
 * Card materials are cached per game because they are built once from a canvas and an image decode.
 * Leaving and re-entering the room therefore costs nothing, and nothing leaks — the same reasoning
 * that keeps `materials.js` a singleton module.
 */
const cardCache = new Map()

function cardMaterialFor(game) {
  if (cardCache.has(game.id)) return cardCache.get(game.id)

  const canvas = coverCardCanvas({
    image: null,
    title: game.title,
    subtitle: game.statusLabel ?? '',
  })
  const texture = textureFrom(canvas, { anisotropy: 8 })
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.52,
    metalness: 0,
    // The cut-out is a hard rectangle, so discarding near-zero alpha keeps the card in the *opaque*
    // queue: it writes depth where it is printed and nowhere in the window, which is both correct
    // and free of transparency sorting against the shelf.
    alphaTest: 0.25,
  })

  const record = { canvas, texture, material, loaded: false }
  cardCache.set(game.id, record)

  if (game.cover?.url) {
    const image = new Image()
    image.addEventListener('load', () => {
      // Redraw the same canvas rather than making a second texture.
      const redrawn = coverCardCanvas({ image, title: game.title, subtitle: game.statusLabel ?? '' })
      const ctx = record.canvas.getContext('2d')
      ctx.clearRect(0, 0, record.canvas.width, record.canvas.height)
      ctx.drawImage(redrawn, 0, 0)
      record.texture.needsUpdate = true
      record.loaded = true
    })
    image.src = game.cover.url
  }

  return material
}

function spineMaterialFor(game) {
  const key = `${game.id}-spine`
  if (cardCache.has(key)) return cardCache.get(key)
  const texture = textureFrom(spineCanvas({
    title: game.title,
    width: 384,
    height: 72,
  }), { anisotropy: 4 })
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0 })
  cardCache.set(key, material)
  return material
}

export function createCassette({ game, position }) {
  const group = new THREE.Group()
  group.name = `cassette-${game.id}`

  // The case: hard, dark, slightly glossy plastic with a bevelled edge so it catches a highlight.
  part(group, box(CASE_SIZE.width, CASE_SIZE.height, BODY_DEPTH, 0.0025), materials.casePlastic,
    [0, 0, -0.005], { name: 'case-body', cast: true })
  // The seam where the lid meets the tray, on the opening edge.
  part(group, box(0.005, CASE_SIZE.height - 0.004, BODY_DEPTH + 0.004, 0.0015), materials.caseSeam,
    [CASE_SIZE.width / 2 - 0.001, 0, -0.004])

  createCassetteShell(group)

  // Front card, folded over the top edge as a spine, and wrapping to the back.
  part(group, plane(FACE.width, FACE.height), cardMaterialFor(game), [0, 0, 0.0115], { name: 'case-front' })
  part(group, plane(FACE.width, BODY_DEPTH + 0.014), spineMaterialFor(game),
    [0, CASE_SIZE.height / 2 + 0.0005, -0.002], { rotation: [-Math.PI / 2, 0, 0] })
  part(group, plane(FACE.width, FACE.height), materials.paperBack, [0, 0, -0.0145], {
    rotation: [0, Math.PI, 0],
  })

  group.position.copy(position)
  // Cases are not machine-stacked: a couple of millimetres of lean is what makes a shelf look used.
  // Only z is allowed, because `startRoom.js` writes rotation.y for the hover slide every frame.
  group.rotation.z = game.slot % 2 === 0 ? -0.018 : 0.014

  // home is kept so hover can slide the case forward without losing its resting place.
  group.userData = {
    interactId: game.id,
    kind: 'cassette',
    gameId: game.id,
    home: position.clone(),
    hoverProgress: 0,
  }
  return group
}

/** The tape inside the case: its lower shell and two reels show through the card's window. */
function createCassetteShell(group) {
  part(group, box(TAPE.width, TAPE.height, TAPE.depth, 0.002), materials.casePlastic, [0, TAPE_Y, 0.006])
  for (const dx of [-HUB_X, HUB_X]) {
    part(group, circle(0.0105, 14), materials.hub, [dx, HUB_Y, 0.0103])
  }
}

/**
 * A visibly blank shelf position: an empty translucent case with no card, no label and no
 * interaction. It is packaging, not a product, and it is not announced to a screen reader.
 */
export function createEmptySlot({ position }) {
  const group = new THREE.Group()
  group.name = 'empty-slot'
  const shell = new THREE.Mesh(
    box(CASE_SIZE.width, CASE_SIZE.height, BODY_DEPTH, 0.0025),
    materials.emptyCasePlastic,
  )
  shell.castShadow = true
  group.add(shell)
  part(group, box(0.005, CASE_SIZE.height - 0.004, BODY_DEPTH + 0.004, 0.0015), materials.caseSeam,
    [CASE_SIZE.width / 2 - 0.001, 0, 0])
  group.position.copy(position)
  group.rotation.z = position.x < -2.8 ? 0.05 : -0.03
  group.userData = { kind: 'empty' }
  return group
}

/**
 * A blank case lying flat, used on the shelf's lower board. Deliberately unlabelled: it shows the
 * empty positions are storage, not hidden products.
 */
export function createFlatEmptyCase({ position, rotationY = 0 }) {
  const mesh = new THREE.Mesh(
    box(CASE_SIZE.width, CASE_SIZE.height, BODY_DEPTH, 0.0025),
    materials.emptyCasePlastic,
  )
  mesh.position.copy(position)
  mesh.rotation.set(-Math.PI / 2, 0, rotationY)
  mesh.name = 'flat-empty-case'
  return mesh
}
