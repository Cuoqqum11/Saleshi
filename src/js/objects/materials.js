/**
 * Grey-box materials.
 *
 * Colour values mirror the CSS tokens in src/styles/tokens.css. That duplication is
 * intentional for now and is recorded as a known limitation: a real material pass happens
 * in Phase 3 of the plan, at which point the room's palette stops being a flat box art pass
 * and these values will be chosen from textures rather than copied from CSS.
 */

import * as THREE from 'three'

const standard = (colour, options = {}) =>
  new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92, metalness: 0.02, ...options })

export const materials = {
  floor: standard(0x5a4834),
  wall: standard(0x7a6647),
  wood: standard(0x7d5f40),
  woodDark: standard(0x58432c),
  plastic: standard(0x3a3a3e, { roughness: 0.6 }),
  cassette: standard(0x4a4640, { roughness: 0.55 }),
  cassetteHole: standard(0x171717),
  metal: standard(0x8a8a92, { roughness: 0.4, metalness: 0.5 }),
  screen: new THREE.MeshStandardMaterial({
    color: 0x101a0f,
    emissive: 0x35502a,
    emissiveIntensity: 0.9,
    roughness: 0.62,
  }),
  lampShade: standard(0xd8c49a, { emissive: 0x6b4d22, emissiveIntensity: 0.35 }),
  emptySlot: standard(0x453b2e, { roughness: 0.95 }),
  paper: standard(0xf2e9d8, { roughness: 0.98 }),
}
