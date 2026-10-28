/**
 * The pinned papers: physical objects in the room whose words live in HTML.
 *
 * Each is a plain plane on a wall with a strip of tape at the top — grey-box on purpose.
 * The sheet carries `interactId` so picking and the DOM focus proxy can find it, but no
 * text is baked into a texture: selecting a paper opens the readable HTML view
 * (`src/js/ui/paperView.js`), which clones the text that already exists in `index.html`.
 */

import * as THREE from 'three'
import { materials } from './materials.js'

function pinnedPaper({ id, width, height, position, rotationY = 0, tilt = 0 }) {
  const group = new THREE.Group()
  group.name = `wall-note-${id}`
  group.position.set(position.x, position.y, position.z)
  group.rotation.y = rotationY

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.paper)
  sheet.rotation.z = tilt
  sheet.userData = { interactId: id, kind: 'paper' }

  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.006), materials.plastic)
  tape.position.set(0, height / 2 - 0.02, 0.004)

  group.add(sheet, tape)
  return { group, sheet }
}

export function createWallNotes() {
  // The studio letter, moved off the desk and onto the west wall where the shelf
  // visitor will see it. A4 portrait at reading height.
  const intro = pinnedPaper({
    id: 'studio-intro',
    width: 0.297,
    height: 0.42,
    position: { x: -3.47, y: 1.3, z: -1.5 },
    rotationY: Math.PI / 2,
    tilt: 0.03,
  })

  // The short instruction note beside the computer, on the north wall.
  const howto = pinnedPaper({
    id: 'how-to',
    width: 0.21,
    height: 0.297,
    position: { x: 0.35, y: 1.45, z: -2.97 },
    rotationY: 0,
    tilt: -0.05,
  })

  const group = new THREE.Group()
  group.name = 'wall-notes'
  group.add(intro.group, howto.group)

  return { group, sheets: { intro: intro.sheet, howto: howto.sheet } }
}
