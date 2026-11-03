/**
 * The room's colour and light tokens — M7 art direction, Stage A.
 *
 * This is the single place a room surface value is written down. `src/styles/tokens.css` holds the
 * values the HTML interface is built from; the two files deliberately share only the pairs that must
 * agree because they are meant to read as one object — the monitor's screen, the amber of the lamp
 * and the focus colour — and those are named at the bottom of this file.
 *
 * Values are surface colours (albedo) in sRGB, chosen for a room lit by warm practicals at
 * ACES tone mapping, so they are darker and less saturated than they look on a swatch: the
 * renderer multiplies them by light, and the previous grey-box pass had them far too bright.
 */

export const palette = {
  /* Architecture */
  ceiling: '#7d6f5c',
  wall: '#6b5a45',
  wallDarker: '#5a4b39',
  skirting: '#2b241c',
  doorFrame: '#33291f',
  windowFrame: '#3a2e23',
  dusk: '#232c38',

  /* Wood — one species, three weights, so grain direction and wear can differ per surface */
  wood: '#45301f',
  woodDark: '#2f2115',
  woodWorn: '#54412c',
  floor: '#4a3524',

  /* Plastic — warm-tinted, never metallic */
  casePlastic: '#241f1c',
  casePlasticEmpty: '#3a332c',
  monitorPlastic: '#8a7f6b',
  monitorPlasticDark: '#6d6353',
  keyboardPlastic: '#9a9080',
  tape: '#c9b48a',

  /* Paper */
  paper: '#efe3cb',
  paperAged: '#ddceb2',

  /* Metal and glass */
  metal: '#6f6a61',
  metalDark: '#3d3934',

  /* Upholstery, cables, storage — the secondary accents, used sparingly */
  // Dark enough that a lit chair back does not become the second-brightest thing in the room after
  // the screen; at the previous value the upholstery read as lime under the key light.
  olive: '#575c40',
  rust: '#a4523c',

  /* Light — colour temperatures, not surfaces */
  lampGlow: '#ffb066',
  keyWarm: '#ffd9a8',
  fillCool: '#8fa3b8',
  shelfWash: '#ffd7a5',
}

/**
 * The room values that have a deliberate counterpart in `src/styles/tokens.css`, because the physical
 * object and the HTML standing on it are meant to read as one device — the glass and `#monitor-screen`
 * are one screen, so they share its base colour and its ink. `screenGlow` is the odd one out: it has no
 * CSS twin, it is the emissive tint of the glass itself, picked against the panel's base in the captured
 * frames. `tests/e2e/gate.mjs` asserts the pair actually agrees in the built page.
 */
export const sharedWithCss = {
  screenBase: '#10130f', // var(--screen-base)
  screenText: '#cfe6b8', // var(--screen-text): the panel's ink, reversed for its chips
  screenGlow: '#3f5c33', // room only — the glass's emissive tint
}

/**
 * Light intensities, in the units Three.js uses with physically-correct lighting in force:
 * directional and hemisphere lights are irradiance, spots and points are candela against
 * distance-squared falloff. The practicals are therefore *smaller* numbers than the room lights even
 * where they look brighter — the lamp's spot is 0.35 m from the desk, which multiplies its intensity
 * by about eight before it reaches a surface.
 *
 * The key is the strongest single value here on purpose. The room's albedos are dark walnut and aged
 * plaster (0.04–0.10 in linear terms) and ACES pulls mid-tones down again, so a "realistic" 1.0 key
 * rendered the portfolio wall almost black — see the first `m7-after` pass in `docs/art-direction.md`.
 * These numbers were set by reading captured frames against the `m7-before` baselines, not from a
 * preset.
 */
export const lightRig = {
  // The hemisphere is the room's bounce, not the sky: `ground` is light coming off the floor and
  // `sky` is light coming down from the ceiling, so a downward-facing surface (the ceiling itself,
  // the underside of the shelf) is lit by `ground`. Its first value was the floor's own dark walnut,
  // which left the ceiling black — visually the same hole in the room as V1, just with a plane in it.
  hemisphere: { sky: '#a89880', ground: '#a08463', intensity: 2.0 },
  // Ambient exists only so the corners are not pure black. The hemisphere already carries the
  // sky-to-floor gradient, so anything stronger here flattens the room.
  ambient: { colour: '#3a2d20', intensity: 0.8 },
  key: { colour: palette.keyWarm, intensity: 4.6 },
  window: { colour: palette.fillCool, intensity: 1.6 },
  lamp: { colour: palette.lampGlow, intensity: 1.7 },
  screenSpill: { colour: sharedWithCss.screenGlow, intensity: 0.12 },
  shelf: { colour: palette.shelfWash, intensity: 4.2 },
  exposure: 1.12,
}

export const screenTone = {
  emissiveIntensityIdle: 0.5,
  emissiveIntensityOn: 0.78,
}
