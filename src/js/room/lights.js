/**
 * The lighting rig — M7 Stage D.
 *
 * Five roles, deliberately separated (the plan is `docs/art-direction.md` §5). Each one exists to fix
 * a defect you can see in a named before-image, and each one is allowed to be weak:
 *
 *   hemisphere + ambient  keeps the corners readable at all
 *   room key              from the window side, the only light that makes floor contact
 *   window fill           cool, so the warm practicals are not the only colour in the room (V7)
 *   desk lamp             a spot *at the shade's mouth*, aimed where the shade points (V5)
 *   shelf light           from a strip under the carcass's top board, onto the portfolio (V8)
 *   screen spill          offset off the glass's normal so it cannot put a hotspot on it (V6)
 *
 * Physically-correct units are in force, so point and spot intensities are in candela and fall off
 * against distance squared — the numbers come from `lightRig` in `src/js/room/palette.js`, not from
 * a preset. Three of the seven cast shadow maps and all three are static: the camera moves, the lights
 * do not, so `scene.js` switches `shadowMap.autoUpdate` off and the maps are rendered once.
 */

import * as THREE from 'three'
import { lightRig } from './palette.js'
import { LAMP, ROOM } from '../objects/roomShell.js'
import { box, part } from '../objects/build.js'
import { materials } from '../objects/materials.js'

// The strip is clipped under the carcass's front lip, four centimetres proud of the board, and the
// beam is aimed down *and* back so it grazes the case faces. A strip flush against the wall lights
// the back board and leaves the catalogue in the dark, which is what the first pass did.
const SHELF_STRIP = { x: -2.45, y: 1.56, z: -2.56 }
const SHELF_AIM = { x: -2.45, y: 0.95, z: -2.72 }
/** Off the screen's axis, for the reason given in V6. */
const COMPUTER_SPILL = { x: 1.3, y: 1.24, z: -2.34 }

export function createLights() {
  const group = new THREE.Group()
  group.name = 'lights'

  const hemi = new THREE.HemisphereLight(
    lightRig.hemisphere.sky, lightRig.hemisphere.ground, lightRig.hemisphere.intensity,
  )
  // A hemisphere light's direction is what it is (sky down, ground up); the position only puts its
  // helper, if one is ever added, where a viewer would notice the gradient is wrong.
  hemi.position.set(0, ROOM.height, 0)
  group.add(hemi)

  group.add(new THREE.AmbientLight(lightRig.ambient.colour, lightRig.ambient.intensity))

  // Room key: high at the door corner, so it rakes the north wall. That wall carries the shelf and
  // the computer, and a key coming from the window side alone left it the darkest surface in the room
  // — the portfolio disappeared. The window keeps its own, cooler, directional fill below.
  const key = new THREE.DirectionalLight(lightRig.key.colour, lightRig.key.intensity)
  key.position.set(5.2, 4.4, 2.6)
  key.target.position.set(-0.6, 0.5, -1.6)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 14
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  group.add(key, key.target)

  // Window fill: parallel cool daylight out of the east-wall opening. No shadows — its whole job is
  // colour temperature, and a second shadow map for a 0.55-intensity wash is not affordable.
  const fill = new THREE.DirectionalLight(lightRig.window.colour, lightRig.window.intensity)
  fill.position.set(4.6, 2.15, -0.7)
  fill.target.position.set(-1.5, 1.2, -0.4)
  group.add(fill, fill.target)

  // Desk lamp: the light is at the shade's mouth, exported by the geometry that draws the shade.
  // The wide penumbra is the point — a real shade's edge is a gradient, and the hard-edged pool in
  // the first after-pass looked like a torch beam rather than a lamp.
  const lamp = new THREE.SpotLight(lightRig.lamp.colour, lightRig.lamp.intensity, 3.4, 0.72, 0.85, 2)
  lamp.position.set(LAMP.mouth.x, LAMP.mouth.y, LAMP.mouth.z)
  lamp.target.position.set(LAMP.target.x, LAMP.target.y, LAMP.target.z)
  lamp.castShadow = true
  lamp.shadow.mapSize.set(512, 512)
  lamp.shadow.camera.near = 0.2
  lamp.shadow.camera.far = 3.4
  lamp.shadow.bias = -0.0008
  lamp.shadow.normalBias = 0.01
  group.add(lamp, lamp.target)

  // Shelf light: the cases are the catalogue, so they get the only light aimed straight at them. The
  // cone is wide enough to cover the whole 1.5 m plank rather than pooling in its middle — the real
  // game sits in the first slot, at the far end, and a narrow beam left it the darkest case on the
  // shelf.
  const shelf = new THREE.SpotLight(
    lightRig.shelf.colour, lightRig.shelf.intensity, 2.6, 1.28, 0.95, 2,
  )
  shelf.position.set(SHELF_STRIP.x, SHELF_STRIP.y, SHELF_STRIP.z)
  shelf.target.position.set(SHELF_AIM.x, SHELF_AIM.y, SHELF_AIM.z)
  shelf.castShadow = true
  shelf.shadow.mapSize.set(512, 512)
  shelf.shadow.camera.near = 0.1
  shelf.shadow.camera.far = 2.6
  shelf.shadow.bias = -0.0008
  shelf.shadow.normalBias = 0.008
  group.add(shelf, shelf.target)

  // Screen spill, offset up and left of the glass's normal so it rakes the desk instead of the screen.
  const spill = new THREE.PointLight(lightRig.screenSpill.colour, lightRig.screenSpill.intensity, 1.6, 2)
  spill.position.set(COMPUTER_SPILL.x, COMPUTER_SPILL.y, COMPUTER_SPILL.z)
  group.add(spill)

  return group
}

/** The strip under the shelf's top board that the shelf light is coming from, so the light has a source. */
export function createLightFittings() {
  const group = new THREE.Group()
  group.name = 'light-fittings'
  // 1.594 puts the strip's back face against the top board's underside (1.60) rather than floating
  // under it — the same contact rule the desk lamp follows.
  // The housing is deep enough to be bolted to the board's underside at the back and overhang in
  // front, which is what a picture light looks like. A thin strip at the same position would appear
  // to float.
  part(group, box(1.42, 0.014, 0.09), materials.stripGlow, [SHELF_STRIP.x, 1.593, -2.555], {
    name: 'shelf-strip',
  })
  return group
}
