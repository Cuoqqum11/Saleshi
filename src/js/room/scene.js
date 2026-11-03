/**
 * The WebGL scene — M7 Stage D.
 *
 * This file owns renderer-level decisions only: what the room is exposed at, how shadows are
 * rendered, and what gets freed on teardown. Colours live in `src/js/room/palette.js`, the rig in
 * `lights.js`, geometry in `src/js/objects/`.
 *
 * Two of these are cost decisions and are written down so they can be defended:
 *
 * - **ACES tone mapping.** The room has four practicals at different colour temperatures and the
 *   old rig blew the lamp and the screen to flat white (V5, V6). A filmic rolloff is what turns a
 *   blown highlight back into a surface with a shape, and it costs one line — no post-processing
 *   pass, no bloom, no decorative effects.
 * - **Static shadow maps.** The camera moves and the lights do not, so `autoUpdate` is off and the
 *   three maps are rendered once, on the frame after the room is built. Every frame thereafter pays
 *   for drawing the scene, not for drawing it four times.
 *
 * Fog was removed: the room is now a closed 7×6×2.8 m box, so a fog whose near plane sat at 8 m
 * could not reach anything inside it. Distance cueing comes from light falloff instead, which the
 * physically-decaying spot and point lights already provide.
 */

import * as THREE from 'three'
import { TEST_HOOKS } from '../testHooks.js'
import { buildRoomShell } from '../objects/roomShell.js'
import { disposeCaches } from '../objects/build.js'
import { createShelf } from '../objects/shelf.js'
import { createComputer } from '../objects/computer.js'
import { createWallNotes } from '../objects/notes.js'
import { createLightFittings, createLights } from './lights.js'
import { lightRig } from './palette.js'

const MAX_PIXEL_RATIO = 2

export function createScene({ stage, games, shelfCapacity }) {
  const scene = new THREE.Scene()
  // Only visible if the canvas is larger than the room's own projection, which the ceiling now
  // prevents. It stays as the clear colour so a first frame is never a flash of white.
  scene.background = new THREE.Color(0x1b1611)

  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 30)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    // Keeps the drawing buffer readable so test evidence can be captured as a PNG without needing a
    // visible browser surface. Costs a little memory, so it is off in the deployed bundle.
    preserveDrawingBuffer: TEST_HOOKS,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = lightRig.exposure
  renderer.shadowMap.enabled = true
  // Not `PCFSoftShadowMap`: Three r186 removed it, and asking for it prints a console warning and
  // silently falls back to this exact value. Setting the constant the renderer ends up using is the
  // honest version of the same request.
  renderer.shadowMap.type = THREE.PCFShadowMap
  // Rendered once, then frozen — see the header. The render loop never touches these again.
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true

  stage.insertBefore(renderer.domElement, stage.firstChild)

  const shell = buildRoomShell()
  const shelf = createShelf({ games, capacity: shelfCapacity })
  const computer = createComputer()
  const notes = createWallNotes()
  const lights = createLights()

  scene.add(lights, createLightFittings(), shell, shelf.group, computer.group, notes.group)

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

    /**
     * Geometry is cached by dimension and shared between meshes, so it is freed once here rather
     * than per mesh — and materials deliberately are *not*, because they are module singletons whose
     * canvas textures are the expensive part of a re-entry.
     */
    dispose() {
      // Lights are per-scene, so their shadow targets go with them; the room's geometry cache is
      // shared, and materials are module singletons that stay resident to make a re-entry instant.
      lights.traverse((object) => {
        if (object.isLight) object.shadow?.map?.dispose()
      })
      renderer.dispose()
      disposeCaches()
      renderer.domElement.remove()
    },
  }
}
