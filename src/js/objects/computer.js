import * as THREE from 'three'
import { materials } from './materials.js'

export const COMPUTER_ORIGIN = { x: 1.6, y: 1.0, z: -2.66 }
export const SCREEN_SIZE = { width: 0.62, height: 0.4 }

/**
 * The computer: cabinet, monitor shell, screen plane, keyboard.
 *
 * The screen mesh is deliberately not textured. Its `screen` surface is the anchor for the
 * HTML panel in #monitor-screen, which is where every word of game information lives —
 * text rendered as geometry could not be read by a screen reader, translated or kept
 * responsive (PROJECT DECISIONS ADDENDUM v0.2 §3).
 */
export function createComputer() {
  const group = new THREE.Group()
  group.name = 'computer'

  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.54, 0.16), materials.plastic)
  shell.position.set(COMPUTER_ORIGIN.x, COMPUTER_ORIGIN.y + 0.04, COMPUTER_ORIGIN.z)
  group.add(shell)

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.46, 0.02), materials.metal)
  bezel.position.set(COMPUTER_ORIGIN.x, COMPUTER_ORIGIN.y + 0.06, COMPUTER_ORIGIN.z + 0.085)
  group.add(bezel)

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_SIZE.width, SCREEN_SIZE.height), materials.screen)
  screen.position.set(COMPUTER_ORIGIN.x, COMPUTER_ORIGIN.y + 0.06, COMPUTER_ORIGIN.z + 0.1)
  screen.name = 'screen-surface'
  screen.userData = { interactId: 'computer', kind: 'computer', screenWidth: SCREEN_SIZE.width, screenHeight: SCREEN_SIZE.height }
  group.add(screen)

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.1), materials.plastic)
  stand.position.set(COMPUTER_ORIGIN.x, COMPUTER_ORIGIN.y - 0.28, COMPUTER_ORIGIN.z)
  group.add(stand)

  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.18), materials.plastic)
  keyboard.position.set(COMPUTER_ORIGIN.x - 0.05, 0.79, -2.28)
  keyboard.rotation.y = -0.07
  group.add(keyboard)

  // A tower under the desk so the corner reads as a working setup.
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.44), materials.plastic)
  tower.position.set(COMPUTER_ORIGIN.x + 0.72, 0.22, -2.55)
  group.add(tower)

  return { group, screen, interactables: [screen] }
}
