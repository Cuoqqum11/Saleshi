/**
 * The workstation — M7 Stage E.
 *
 * V4 and V6 were both about contact: the stand was entirely inside the desk board, the tower
 * intersected a leg, and the screen's own spill light sat in front of the glass and put a burnt
 * hotspot on it. Everything here is measured off `DESK_TOP_Y` so each part rests on something.
 *
 * The screen plane keeps the exact world position and size it had before, because it is the anchor for
 * the HTML panel and the target of the desk station's aim. Its material is emissive glass and nothing
 * else: every word on it is DOM text in `#monitor-screen`, never a texture (ADDENDUM v0.2 §3), and the
 * spill light now lives in `room/lights.js`, offset from the glass's normal.
 */

import * as THREE from 'three'
import { box, cylinder, part, plane, sphere, tube } from './build.js'
import { DESK_TOP_Y } from './roomShell.js'
import { materials } from './materials.js'

export const COMPUTER_ORIGIN = { x: 1.6, y: 1.0, z: -2.66 }
export const SCREEN_SIZE = { width: 0.62, height: 0.4 }

/** The screen's own surface, kept where the station aim and the DOM panel already expect it. */
const SCREEN_POSITION = [COMPUTER_ORIGIN.x, COMPUTER_ORIGIN.y + 0.06, COMPUTER_ORIGIN.z + 0.1]
const KEY_LAYOUT = { columns: 13, rows: 4, columnGap: 0.031, rowGap: 0.032 }

export function createComputer() {
  const group = new THREE.Group()
  group.name = 'computer'

  // --- Monitor ---------------------------------------------------------------------
  // A shallow CRT body with a proud front fascia. The glass sits 10 mm in front of the fascia, the
  // way a tube sits in its bezel, so the bezel reads as a frame rather than a sticker.
  part(group, box(0.7, 0.5, 0.28, 0.012), materials.monitorPlasticDark,
    [COMPUTER_ORIGIN.x, SCREEN_POSITION[1], -2.72], { name: 'monitor-body', cast: true })
  part(group, box(0.74, 0.54, 0.04, 0.008), materials.monitorPlastic,
    [COMPUTER_ORIGIN.x, SCREEN_POSITION[1], -2.59], { cast: true })

  // The rebate the glass sits in: a dark plane 11 mm proud of the screen on every side, one
  // millimetre behind it. Without it the emissive rectangle looks pasted onto the bezel, which is
  // the same "sticker" complaint V9 makes about the cases.
  part(group, plane(SCREEN_SIZE.width + 0.022, SCREEN_SIZE.height + 0.022), materials.monitorPlasticDark,
    [SCREEN_POSITION[0], SCREEN_POSITION[1], SCREEN_POSITION[2] - 0.001], { name: 'screen-rebate' })

  const screen = part(group, plane(SCREEN_SIZE.width, SCREEN_SIZE.height), materials.screen,
    SCREEN_POSITION, { name: 'screen-surface' })
  screen.userData = {
    interactId: 'computer',
    kind: 'computer',
    screenWidth: SCREEN_SIZE.width,
    screenHeight: SCREEN_SIZE.height,
  }

  // Controls on the fascia's lower band, and one lit power dot. No brand, no invented logo.
  for (const dx of [0.26, 0.3, 0.34]) {
    part(group, box(0.022, 0.012, 0.008, 0.003), materials.monitorPlasticDark,
      [COMPUTER_ORIGIN.x + dx, SCREEN_POSITION[1] - 0.235, -2.565])
  }
  part(group, sphere(0.007, 8, 6), materials.lampBulb,
    [COMPUTER_ORIGIN.x - 0.32, SCREEN_POSITION[1] - 0.235, -2.565])

  // --- Contact with the desk (V4) ----------------------------------------------------
  part(group, box(0.34, 0.02, 0.26, 0.006), materials.monitorPlasticDark,
    [COMPUTER_ORIGIN.x, DESK_TOP_Y + 0.01, -2.72], { cast: true })
  part(group, box(0.14, 0.06, 0.12, 0.006), materials.monitorPlastic,
    [COMPUTER_ORIGIN.x, DESK_TOP_Y + 0.025, -2.72])

  // --- Keyboard, mouse, tower ----------------------------------------------------------
  group.add(createKeyboard())
  createMouse(group)
  createTower(group)

  return { group, screen, interactables: [screen] }
}

/**
 * Keys are one InstancedMesh: 52 separate boxes would be 52 draw calls to render a rectangle that is
 * barely visible, and draw calls are the cost this room actually pays.
 */
function createKeyboard() {
  const keyboard = new THREE.Group()
  keyboard.name = 'keyboard'
  keyboard.position.set(1.5, DESK_TOP_Y + 0.012, -2.29)
  keyboard.rotation.y = -0.07

  part(keyboard, box(0.46, 0.024, 0.16, 0.005), materials.keyboardPlastic, [0, 0, 0], {
    name: 'keyboard-base',
    cast: true,
  })

  const { columns, rows, columnGap, rowGap } = KEY_LAYOUT
  const count = columns * rows
  const keys = new THREE.InstancedMesh(box(0.027, 0.007, 0.026, 0.002), materials.keyboardPlastic, count)
  const matrix = new THREE.Matrix4()
  let index = 0
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      matrix.setPosition(
        (column - (columns - 1) / 2) * columnGap,
        0.0155,
        (row - (rows - 1) / 2) * rowGap,
      )
      keys.setMatrixAt(index, matrix)
      index += 1
    }
  }
  keys.instanceMatrix.needsUpdate = true
  keys.castShadow = false
  keys.name = 'keyboard-keys'
  keyboard.add(keys)

  // The hinge strip at the top of the board, which is what makes it look like an old keyboard.
  part(keyboard, box(0.44, 0.006, 0.012, 0.002), materials.monitorPlasticDark, [0, 0.014, -0.072])
  return keyboard
}

function createMouse(group) {
  part(group, box(0.056, 0.026, 0.092, 0.012), materials.monitorPlastic, [1.88, DESK_TOP_Y + 0.013, -2.24], {
    name: 'mouse',
    cast: true,
  })
  part(group, tube([
    [1.88, DESK_TOP_Y + 0.02, -2.285], [1.93, DESK_TOP_Y + 0.005, -2.44], [1.86, 0.79, -2.66],
    [1.82, 0.8, -2.8],
  ], 0.004), materials.cable, [0, 0, 0], { name: 'cable-mouse' })
}

/**
 * The tower, deliberately inside the desk's existing collider (x 0.75..2.45, z −2.9..−2.1) rather than
 * beside it: the footprint the movement tests measure stays exactly as it was.
 */
function createTower(group) {
  const x = 2.15
  part(group, box(0.2, 0.44, 0.44, 0.008), materials.monitorPlasticDark, [x, 0.22, -2.55], {
    name: 'tower',
    cast: true,
  })
  for (const y of [0.36, 0.32]) {
    part(group, box(0.13, 0.012, 0.006, 0.002), materials.caseSeam, [x, y, -2.327])
  }
  part(group, cylinder(0.012, 0.012, 0.008, 10), materials.monitorPlastic, [x + 0.05, 0.14, -2.325], {
    rotation: [Math.PI / 2, 0, 0],
  })
}
