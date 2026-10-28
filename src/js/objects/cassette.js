import * as THREE from 'three'
import { materials } from './materials.js'

/**
 * A cassette standing on the shelf.
 *
 * The label is a CanvasTexture drawn from the game record, so a placeholder reads as a
 * placeholder from inside the 3D view too. It is never an invented cover image.
 */

const LABEL_WIDTH = 256
const LABEL_HEIGHT = 48
export const CASSETTE_SIZE = { width: 0.18, height: 0.11, depth: 0.025 }

function createLabelTexture(text) {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH
  canvas.height = LABEL_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e0d2b6'
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
  ctx.fillStyle = '#17130f'
  ctx.font = '600 22px ui-monospace, monospace'
  ctx.textBaseline = 'middle'

  // Wrap to two lines and ellipsis the rest, so long placeholder strings stay legible.
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`.trim()).width > LABEL_WIDTH - 16 && line) {
      lines.push(line)
      line = word
    } else {
      line = `${line} ${word}`.trim()
    }
  }
  if (line) lines.push(line)

  const shown = lines.slice(0, 2)
  const startY = LABEL_HEIGHT / 2 - ((shown.length - 1) * 24) / 2
  shown.forEach((entry, index) => {
    const text2 = index === 1 && lines.length > 2 ? `${entry.slice(0, 15)}…` : entry
    ctx.fillText(text2, 8, startY + index * 24)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 2
  return texture
}

export function createCassette({ game, position }) {
  const group = new THREE.Group()
  group.name = `cassette-${game.id}`

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CASSETTE_SIZE.width, CASSETTE_SIZE.height, CASSETTE_SIZE.depth),
    materials.cassette,
  )
  group.add(body)

  const sleeve = new THREE.Mesh(
    new THREE.PlaneGeometry(CASSETTE_SIZE.width - 0.016, 0.032),
    new THREE.MeshStandardMaterial({ map: createLabelTexture(game.title), roughness: 0.95 }),
  )
  sleeve.position.set(0, CASSETTE_SIZE.height / 2 - 0.026, CASSETTE_SIZE.depth / 2 + 0.001)
  group.add(sleeve)

  for (const dx of [-0.036, 0.036]) {
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.016, 14), materials.cassetteHole)
    hub.position.set(dx, -0.018, CASSETTE_SIZE.depth / 2 + 0.001)
    group.add(hub)
  }

  group.position.copy(position)
  // home is kept so hover can slide the tape forward without losing its resting place.
  group.userData = {
    interactId: game.id,
    kind: 'cassette',
    gameId: game.id,
    home: position.clone(),
    hoverProgress: 0,
  }
  return group
}

/** A visibly blank shelf position: no label, no interaction, not presented as a product. */
export function createEmptySlot({ position }) {
  const group = new THREE.Group()
  group.name = 'empty-slot'
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CASSETTE_SIZE.width - 0.03, CASSETTE_SIZE.height - 0.01, 0.014),
    materials.emptySlot,
  )
  body.rotation.z = 0.05
  group.add(body)
  group.position.copy(position)
  group.userData = { kind: 'empty' }
  return group
}
