/**
 * The pinned papers — M7 Stage E.
 *
 * V11: a flat cream rectangle with a near-black square of hard plastic on top, which looked like a
 * hole in the sheet rather than tape, and did not touch the wall. Each paper is now a sheet with a
 * fraction of a millimetre of thickness, held by tape that is translucent or by a pin that is metal,
 * and its back face sits one millimetre off the wall it belongs to — close enough to cast onto it,
 * not so close that it disappears into the plaster.
 *
 * The sheet carries `interactId` so picking and the DOM focus proxy can find it, but no text is baked
 * into a texture: selecting a paper opens the readable HTML view (`src/js/ui/paperView.js`), which
 * clones the text that already exists in `index.html`. That is the whole design — the object is
 * physical, the words are DOM.
 */

import * as THREE from 'three'
import { box, part, plane, sphere, tiledBox } from './build.js'
import { PAPER_TILE, materials, printedPageMaterial } from './materials.js'

/** A sheet of printer paper is about 0.1 mm; three millimetres reads as a small stack, which is honest. */
const SHEET_T = 0.003

/** How far the sheet's back face floats off the plaster, and where its printed front lands. */
const SHEET_Z = 0.0025
const FACE_Z = SHEET_Z + SHEET_T / 2

function pinnedPaper({ id, width, height, position, rotationY = 0, tilt = 0, lean = 0, attach, print }) {
  const group = new THREE.Group()
  group.name = `wall-note-${id}`
  group.position.set(position.x, position.y, position.z)
  group.rotation.y = rotationY

  const sheet = part(group, tiledBox(width, height, SHEET_T, 'front', PAPER_TILE), materials.paper,
    [0, 0, SHEET_Z], { rotation: [tilt, 0, lean], name: `wall-note-sheet-${id}`, cast: true })
  sheet.userData = { interactId: id, kind: 'paper' }

  if (print) {
    // The printed face is a separate plane rather than a sixth material on the box: a material array
    // turns one mesh into six draw calls, and this way the fibre of the blank sheet still shows
    // through the page's own margins.
    //
    // It is a CHILD of the sheet, not a sibling in the group. `picking.js` raycasts only the
    // interactable meshes and their descendants, so a sibling floating 0.4 mm in front of the sheet
    // is invisible to the raycaster: it hid the paper and swallowed the click, which is how P8 failed.
    // Parenting it also means it inherits the sheet's tilt and lean, so it cannot come unglued.
    part(sheet, plane(width, height), printedPageMaterial({ variant: print, seed: id.length + 39 }),
      [0, 0, SHEET_T / 2 + 0.0004], { name: `wall-note-print-${id}` })
  }

  if (attach === 'tape') {
    // Two pieces at the top corners, each pulled slightly off square, because nobody tapes a note
    // straight on the first try.
    for (const [dx, skew] of [[-width / 2 + 0.03, 0.22], [width / 2 - 0.03, -0.16]]) {
      part(group, box(0.072, 0.026, 0.004, 0.001), materials.tape,
        [dx, height / 2 - 0.012, FACE_Z + 0.001], { rotation: [0, 0, skew] })
    }
  } else {
    part(group, sphere(0.009, 10, 8), materials.pin, [0, height / 2 - 0.014, FACE_Z + 0.006])
  }

  return { group, sheet }
}

export function createWallNotes() {
  // The studio letter, on the west wall where the shelf visitor sees it. A4 portrait at reading
  // height, leaning a degree off plumb so it catches the shelf light along one edge.
  const intro = pinnedPaper({
    id: 'studio-intro',
    width: 0.297,
    height: 0.42,
    position: { x: -3.5, y: 1.3, z: -1.5 },
    rotationY: Math.PI / 2,
    tilt: 0.012,
    lean: -0.01,
    attach: 'tape',
    print: 'letter',
  })

  // The short instruction note beside the computer, on the north wall. Its x position leaves it inside
  // the desk station's narrower side-panel viewport instead of just off the left edge, and it is a
  // whole 0.48 m from the monitor's nearest edge.
  const howto = pinnedPaper({
    id: 'how-to',
    width: 0.21,
    height: 0.297,
    position: { x: 0.75, y: 1.45, z: -3 },
    tilt: 0.02,
    lean: 0.02,
    attach: 'pin',
    print: 'note',
  })

  const group = new THREE.Group()
  group.name = 'wall-notes'
  group.add(intro.group, howto.group)

  return { group, sheets: { intro: intro.sheet, howto: howto.sheet } }
}
