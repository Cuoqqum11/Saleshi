import * as THREE from 'three'

/**
 * Four lights, no shadow maps.
 *
 * Shadow casting is switched off on purpose at this milestone: it doubles the draw cost for
 * an effect the grey box cannot benefit from. The lighting pass belongs to the art phase, and
 * the measured frame cost recorded in docs/evidence decides whether shadows are affordable.
 */
export function createLights() {
  const group = new THREE.Group()
  group.name = 'lights'

  const hemi = new THREE.HemisphereLight(0xa8b4cc, 0x6b543a, 0.9)
  hemi.position.set(0, 2.6, 0)
  group.add(hemi)

  const key = new THREE.DirectionalLight(0xffe2b4, 1.2)
  key.position.set(2.2, 3.4, 2.6)
  key.castShadow = false
  group.add(key)

  const lamp = new THREE.PointLight(0xffb066, 4.5, 3.6, 2)
  lamp.position.set(2.45, 1.12, -2.5)
  group.add(lamp)

  // Cool spill from the screen so the computer reads as switched on.
  const glow = new THREE.PointLight(0x9fd08a, 1.2, 1.8, 2)
  glow.position.set(1.6, 1.06, -2.4)
  group.add(glow)

  // The shelf sits on the far side of the room from the desk lamp, so the catalogue that
  // visitors are meant to read went unresolvable at the shelf station. Deliberately short
  // ranged so it cannot wash out the desk.
  const shelfWash = new THREE.PointLight(0xffd7a5, 3.2, 2.4, 2)
  shelfWash.position.set(-2.05, 1.62, -2.05)
  group.add(shelfWash)

  return group
}
