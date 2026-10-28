import * as THREE from 'three'
import { materials } from './materials.js'

export const ROOM = { width: 7, depth: 6, height: 2.8 }

/**
 * The static furniture: floor, walls, desk, chair, lamp, door frame.
 * Everything here is primitive geometry on purpose — Milestone 1 tests navigation and
 * interaction, not modelling.
 */
export function buildRoomShell() {
  const group = new THREE.Group()
  group.name = 'room-shell'

  const add = (geometry, material, x, y, z, name) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    if (name) mesh.name = name
    group.add(mesh)
    return mesh
  }

  add(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), materials.floor, 0, 0, 0, 'floor')
    .rotateX(-Math.PI / 2)

  const wall = (w, x, z, ry) => {
    const mesh = add(new THREE.PlaneGeometry(w, ROOM.height), materials.wall, x, ROOM.height / 2, z)
    mesh.rotation.y = ry
    return mesh
  }
  wall(ROOM.width, 0, -ROOM.depth / 2, 0)
  wall(ROOM.width, 0, ROOM.depth / 2, Math.PI)
  wall(ROOM.depth, -ROOM.width / 2, 0, Math.PI / 2)
  wall(ROOM.depth, ROOM.width / 2, 0, -Math.PI / 2)

  // Desk: top plus four legs.
  add(new THREE.BoxGeometry(1.7, 0.06, 0.8), materials.wood, 1.6, 0.75, -2.5, 'desk-top')
  for (const [dx, dz] of [[-0.78, -0.34], [0.78, -0.34], [-0.78, 0.34], [0.78, 0.34]]) {
    add(new THREE.BoxGeometry(0.07, 0.75, 0.07), materials.woodDark, 1.6 + dx, 0.375, -2.5 + dz)
  }

  // Chair, pushed to the left of the desk so it never blocks the monitor view.
  add(new THREE.BoxGeometry(0.45, 0.06, 0.45), materials.plastic, 0.55, 0.46, -1.5, 'chair-seat')
  add(new THREE.BoxGeometry(0.45, 0.5, 0.06), materials.plastic, 0.55, 0.72, -1.28)
  add(new THREE.BoxGeometry(0.06, 0.46, 0.06), materials.metal, 0.55, 0.23, -1.5)

  // Desk lamp: pole and shade. The light itself lives in room/lights.js.
  add(new THREE.BoxGeometry(0.05, 0.4, 0.05), materials.metal, 2.45, 0.95, -2.75, 'lamp-pole')
  add(new THREE.ConeGeometry(0.13, 0.18, 12), materials.lampShade, 2.45, 1.16, -2.72, 'lamp-shade')

  // Door frame, purely to make the room read as a room.
  add(new THREE.BoxGeometry(0.9, 2.05, 0.05), materials.woodDark, -0.4, 1.02, 2.97, 'door')

  return group
}
