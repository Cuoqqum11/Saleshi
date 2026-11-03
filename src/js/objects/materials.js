/**
 * The room's material library — M7 Stage C.
 *
 * One entry per material *family*, built from the colour tokens in `src/js/room/palette.js`, so a
 * surface cannot quietly invent a colour and the whole room shares one response to light. Wood,
 * plastic, paper, metal and glass are deliberately different: roughness and metalness are the
 * cheapest way to make an object read as the thing it is, which matters when the polygon budget is
 * small.
 *
 * Textured materials are all created at texture `repeat [1, 1]`. Grain scale comes from the geometry
 * instead (see `scaleUv` in `build.js`), because a repeat is a UV-space quantity: a 7 m floor and a
 * 0.3 m shelf board sharing one repeated texture would show grain 23 times apart in world scale,
 * which is the "printed wallpaper" tell. Each textured material therefore publishes the size of the
 * world-space tile it expects (`*_TILE` below) and surfaces ask for it.
 *
 * Materials are created once and reused. Geometry that repeats (keys, brackets, pins) shares both
 * the material and the geometry instance, because draw calls, not triangles, are what a web page
 * pays for.
 */

import * as THREE from 'three'
import { palette, screenTone, sharedWithCss } from '../room/palette.js'
import { paperMaps, plasterMaps, printedPageCanvas, textureFrom, woodMaps } from './textures.js'

/** One texture tile covers this many metres of floor (5 boards → 150 mm planks). */
export const FLOOR_TILE = 0.75
/** One tile across furniture timber (2 boards → 150 mm, matching the floor's board width). */
export const WOOD_TILE = 0.3
/**
 * One tile of wall plaster. Larger than the wood tile on purpose: plaster has no readable repeat to
 * give away, so the only cost of a small tile is seeing the same grain seven times up one wall.
 */
export const PLASTER_TILE = 1.4
/**
 * One tile of paper fibre. A sheet is the smallest textured surface in the room, and the same grain
 * scale has to hold on it as on a wall — at the plaster tile an A4 sheet shows a third of one fibre
 * canvas, which magnifies the grain into blotches.
 */
export const PAPER_TILE = 0.1

const standard = (options) => new THREE.MeshStandardMaterial(options)

/**
 * A timber surface. `planks` is how many boards share one tile, and because a tile is a fixed size in
 * metres the board width comes out the same on the floor and on a shelf edge — wood cut for one room
 * is cut from one species.
 */
function wood({ colour, dark, seed, size = 256, planks = 2, roughness = 0.72, metalness = 0.03 }) {
  const maps = woodMaps({ size, planks, base: colour, dark, light: palette.woodWorn, seed })
  return standard({
    map: textureFrom(maps.map),
    roughnessMap: textureFrom(maps.roughnessMap, { srgb: false }),
    color: 0xffffff,
    roughness,
    metalness,
  })
}

function plaster({ colour, seed, roughness = 0.94 }) {
  const maps = plasterMaps({ size: 256, base: colour, seed })
  return standard({ map: textureFrom(maps.map), color: 0xffffff, roughness, metalness: 0 })
}

export const materials = {
  /* --- Architecture ------------------------------------------------------------- */
  ceiling: plaster({ colour: palette.ceiling, seed: 21, roughness: 0.96 }),
  wall: plaster({ colour: palette.wall, seed: 11 }),
  wallDarker: plaster({ colour: palette.wallDarker, seed: 12 }),
  skirting: standard({ color: palette.skirting, roughness: 0.55, metalness: 0.02 }),
  doorFrame: wood({ colour: palette.doorFrame, dark: palette.woodDark, seed: 33, planks: 1, roughness: 0.6 }),
  windowFrame: wood({ colour: palette.windowFrame, dark: palette.woodDark, seed: 34, planks: 1, roughness: 0.6 }),
  // The outside is not a lit surface; it is a flat dusk so the opening reads as depth, not a hole.
  dusk: standard({
    color: palette.dusk,
    roughness: 1,
    metalness: 0,
    emissive: palette.dusk,
    emissiveIntensity: 0.62,
  }),

  /* --- Wood furniture ----------------------------------------------------------- */
  floor: wood({
    colour: palette.floor, dark: palette.woodDark, seed: 3, size: 512, planks: 5, roughness: 0.66,
  }),
  wood: wood({ colour: palette.wood, dark: palette.woodDark, seed: 5, planks: 2, roughness: 0.62 }),
  woodShelf: wood({ colour: palette.wood, dark: palette.woodDark, seed: 8, planks: 2, roughness: 0.58 }),
  woodDark: wood({ colour: palette.woodDark, dark: '#1d140c', seed: 9, planks: 1, roughness: 0.7 }),

  /* --- Plastic ------------------------------------------------------------------ */
  // Cases are hard, dark and slightly glossy: the seam and the edge highlight do most of the work.
  casePlastic: standard({ color: palette.casePlastic, roughness: 0.34, metalness: 0.04 }),
  caseSeam: standard({ color: '#15110f', roughness: 0.5, metalness: 0.02 }),
  emptyCasePlastic: standard({
    color: palette.casePlasticEmpty, roughness: 0.28, metalness: 0.04, transparent: true, opacity: 0.86,
  }),
  // The reel hubs inside a cassette: pale plastic, the lightest thing on the shelf.
  hub: standard({ color: '#b9b0a0', roughness: 0.5, metalness: 0.05 }),
  // An old machine: chalky, matte, warm grey-beige. Never metallic.
  monitorPlastic: standard({ color: palette.monitorPlastic, roughness: 0.78, metalness: 0.02 }),
  monitorPlasticDark: standard({ color: palette.monitorPlasticDark, roughness: 0.84, metalness: 0.02 }),
  keyboardPlastic: standard({ color: palette.keyboardPlastic, roughness: 0.88, metalness: 0.01 }),
  tape: standard({
    color: palette.tape, roughness: 0.42, metalness: 0.02, transparent: true, opacity: 0.62,
  }),

  /* --- Paper -------------------------------------------------------------------- */
  paper: (() => {
    const maps = paperMaps({ size: 256, base: palette.paper, seed: 17 })
    return standard({ map: textureFrom(maps.map), color: 0xffffff, roughness: 0.95, metalness: 0 })
  })(),
  paperBack: standard({ color: palette.paperAged, roughness: 0.95, metalness: 0 }),


  /* --- Metal -------------------------------------------------------------------- */
  metal: standard({ color: palette.metal, roughness: 0.42, metalness: 0.82 }),
  metalDark: standard({ color: palette.metalDark, roughness: 0.55, metalness: 0.7 }),

  /* --- Accents ------------------------------------------------------------------ */
  upholstery: standard({ color: palette.olive, roughness: 0.95, metalness: 0 }),
  cable: standard({ color: palette.olive, roughness: 0.7, metalness: 0.02 }),
  pin: standard({ color: palette.rust, roughness: 0.36, metalness: 0.1 }),
  cardboard: standard({ color: '#5f4b36', roughness: 0.97, metalness: 0 }),
  bookCloth: standard({ color: palette.rust, roughness: 0.92, metalness: 0 }),
  bookPaper: standard({ color: palette.paperAged, roughness: 0.96, metalness: 0 }),

  /* --- The screen --------------------------------------------------------------- */
  // The words are HTML in #monitor-screen, never a texture, so this surface only has to look like
  // glass that is switched on. Its base colour is the CSS panel's own background for that reason.
  // Roughness 0.45 is a matte CRT face: at 0.24 the spill light put a hard specular blob on the
  // glass, which is exactly the blown-hotspot defect (V6) this milestone is meant to remove.
  screen: standard({
    color: sharedWithCss.screenBase,
    roughness: 0.45,
    metalness: 0,
    emissive: sharedWithCss.screenGlow,
    emissiveIntensity: screenTone.emissiveIntensityIdle,
  }),
  // A metal shade, not a glowing one: the old version blew out to white (V5), so the brightness
  // lives in the bulb inside it and the shade stays a dark surface with a hot rim. The bulb is still
  // the brightest emissive in the room, but at 1.15 it keeps a visible filament colour instead of
  // clipping to white.
  lampShade: standard({ color: '#332d26', roughness: 0.44, metalness: 0.55, side: THREE.DoubleSide }),
  lampBulb: standard({
    color: palette.lampGlow, emissive: palette.lampGlow, emissiveIntensity: 1.15, roughness: 1, metalness: 0,
  }),
  // The shelf strip is emissive so the light aimed at the cases has a visible source; the geometry
  // sits just under the top board, where a real strip of LED tape would be stuck. 0.5 read as a burnt
  // white bar from the door — the brightest thing in the composition, which is the opposite of the
  // point: the cases are the subject and the fitting is supposed to be quiet.
  stripGlow: standard({
    color: palette.shelfWash, emissive: palette.shelfWash, emissiveIntensity: 0.28, roughness: 0.6, metalness: 0,
  }),
}

/**
 * One material per printed sheet, cached by variant. A printed page is the only paper surface whose
 * look carries meaning — a heading and rows say "document" — and there are two of them in the room,
 * so this is a factory with a two-entry cache rather than a library field.
 */
const printedPages = new Map()

export function printedPageMaterial({ variant, seed }) {
  const key = `${variant}|${seed}`
  if (!printedPages.has(key)) {
    printedPages.set(key, standard({
      map: textureFrom(printedPageCanvas({ variant, seed }), { anisotropy: 8 }),
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0,
    }))
  }
  return printedPages.get(key)
}

/**
 * These materials are module-level singletons on purpose: leaving and re-entering the room reuses
 * them rather than redrawing every canvas. `createScene().dispose()` frees the per-instance
 * geometries, and the shared textures stay resident — a few hundred kilobytes that make a restart
 * instant.
 */
