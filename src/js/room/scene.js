import * as THREE from 'three'
import { buildRoomShell } from '../objects/roomShell.js'
import { createShelf } from '../objects/shelf.js'
import { createComputer } from '../objects/computer.js'
import { createWallNotes } from '../objects/notes.js'
import { createLights } from './lights.js'

const MAX_PIXEL_RATIO = 2

export function createScene({ stage, games, shelfCapacity }) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1b1611)
  // A short fog hides the far corners instead of modelling them.
  scene.fog = new THREE.Fog(0x1b1611, 8, 22)

  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 30)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    // Dev only: keeps the drawing buffer readable so test evidence can be captured as a PNG
    // without needing a visible browser surface. Costs a little memory; off in production.
    preserveDrawingBuffer: Boolean(import.meta.env.DEV),
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
  renderer.shadowMap.enabled = false
  stage.insertBefore(renderer.domElement, stage.firstChild)

  const shell = buildRoomShell()
  const shelf = createShelf({ games, capacity: shelfCapacity })
  const computer = createComputer()
  const notes = createWallNotes()

  scene.add(createLights(), shell, shelf.group, computer.group, notes.group)

  const interactables = [...shelf.interactables, computer.screen, notes.sheets.intro, notes.sheets.howto]

  return {
    scene,
    camera,
    renderer,
    interactables,
    cassetteMeshes: shelf.interactables,
    screenMesh: computer.screen,
    noteMeshes: notes.sheets,

    resize(width, height) {
      const safeWidth = Math.max(1, width)
      const safeHeight = Math.max(1, height)
      camera.aspect = safeWidth / safeHeight
      camera.updateProjectionMatrix()
      renderer.setSize(safeWidth, safeHeight, false)
    },

    dispose() {
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
