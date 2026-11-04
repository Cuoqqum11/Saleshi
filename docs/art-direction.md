# M7 art direction — the room as a working studio

Stages A–G of the visual milestone. §1–§7 were written **before** the changes they authorise, so the
before/after comparison is a decision being checked rather than a result being explained; §8–§12 are
what the measurement, the regressions and the final diff actually showed, added at the end of the pass.

Baselines: `evidence/m7-before-01-entry.png` … `m7-before-10-shelf-wall-joint.png`, counters in
`evidence/m7-before-room-stats.json`. Result: the same ten viewpoints as
`evidence/m7-after-*.png` with `evidence/m7-after-room-stats.json`, plus
`m7-after-11-production-bundle-smoke.png` (the shipped `dist/` bundle, which has no test hooks). Both
runs came from `tests/e2e/visual.mjs` against the QA bundle at `http://127.0.0.1:5314` (headless
Chromium + SwiftShader, 1280×800, drawing buffer 912×608). The full regression matrix is
`evidence/m7-regression.txt`.

## 1. What the room has to communicate

1. A creative workspace, not a lobby.
2. This studio makes and shows games — the shelf is the portfolio.
3. A visitor can pick things up and read them.

Reference used for the *relationship* between environment and interface only: Felix Rieseberg's
portfolio shows that a room can carry a portfolio without cards. Its exact room, assets, materials,
layout, colours, typography and code are not reproduced, and nothing was copied from it.

Target: **stylised realism** — believable objects, deliberate simplification, no photorealism and no
visible primitives.

## 2. Baseline defects found by looking

Each of these is visible in a named baseline image, not inferred.

| # | Defect | Where |
| --- | --- | --- |
| V1 | There is **no ceiling**. Above the wall planes the scene background shows as a black band, so the room reads as an open box photographed from a building site. | `m7-before-09-desk-corner.png`, `m7-before-04-door.png` |
| V2 | Walls, floor and ceiling are single untextured planes with zero thickness. Corners are where two flat colours meet; there is no skirting, no architrave, no junction detail. | every wide view |
| V3 | **Nothing casts a shadow.** `shadowMaps: false`, so every object is pasted onto the surface it stands on. The desk, chair, tower and cases all float. | `m7-before-09-desk-corner.png` |
| V4 | Contact points are wrong, not just unshaded: the monitor's stand is entirely inside the desk top and the monitor shell overlaps the board; the tower intersects a desk leg; the chair is a slab on one post with its back panel detached. | `m7-before-09-desk-corner.png` |
| V5 | The desk lamp's point light is 0.22 m in **front of** the shade, so the bright pool on the wall does not come from the lamp, and the shade itself blows out to white. | `m7-before-07-monitor-close-up.png` |
| V6 | The screen's spill light sits in front of the screen and lights the screen, producing a blown radial hotspot that looks like a burnt bulb rather than a display. | `m7-before-07-monitor-close-up.png` |
| V7 | Two unconnected hotspots (shelf wash, desk lamp) with a dead zone between them, and a strong orange cast on the east wall that the rest of the room does not share. Competing colour casts, no graded falloff. | `m7-before-04-door.png` |
| V8 | The shelf is a plank with a large dark rectangle behind it and two grey tabs under it. It reads as a broken fitting, not furniture, and it is the object that holds the portfolio. | `m7-before-02-shelf.png`, `m7-before-10-shelf-wall-joint.png` |
| V9 | A game "case" is a flat grey slab with a beige sticker and two black circles: no thickness, no seam, no spine, no packaging surface, and **no artwork at all** even though the studio supplied real frames. | `m7-before-06-case-close-up.png` |
| V10 | Empty shelf positions are tilted dark boards. They read as damaged stock rather than as blank space waiting for a future game. | `m7-before-06-case-close-up.png` |
| V11 | The pinned papers are flat cream rectangles with a near-black square of `materials.plastic` on top, which looks like a hole rather than tape. No fibre, no edge variation, no shadow, so they do not look attached to anything. | `m7-before-08-letter-close-up.png` |
| V12 | There is a keyboard and no **mouse**, and no small objects anywhere: the desk is a bare board, which is the main reason the room reads as unused. | `m7-before-09-desk-corner.png` |
| V13 | Every edge in the room is a mathematically sharp 90° corner, which is the single strongest "primitive" tell and also why nothing catches a highlight. | all close-ups |
| V14 | `materials.js` says its colours mirror `src/styles/tokens.css`; they do not — the room ran lighter and more orange (`#7a6647` wall vs `#4a3d2f` token), and four CSS room tokens (`--floor`, `--wall`, `--wood`, `--plastic`) were used by no CSS rule at all. | `src/js/objects/materials.js`, `src/styles/tokens.css` |

Measured baseline, same environment for the after run: **37 meshes / 54 nodes / 14 geometries /
2 textures / 2 shader programs / 5 lights / 132–356 triangles per frame / no shadow maps /
no tone mapping**; boot to first rendered frame 1,793 ms; 25 frames in 2 s under SwiftShader
(a relative number only — this is not a GPU measurement and is not presented as one).

## 3. Palette

Delivered as code tokens in `src/js/room/palette.js`, grouped by material family rather than by
object, so a surface cannot quietly invent a colour. Dark walnut furniture, aged cream paper, warm
amber practicals, desaturated olive and rust as the only secondary accents, and one cool source
(daylight through a small window) to keep the warm lights from filling the room with a single cast.

| Family | Values | Role |
| --- | --- | --- |
| Architecture | `wall #6b5a45`, `wallDarker #5a4b39`, `ceiling #7d6f5c`, `skirting #2b241c` | large quiet surfaces; the ceiling is lighter in albedo because it receives so little light |
| Wood | `wood #45301f`, `woodDark #2f2115`, `woodWorn #54412c`, `floor #4a3524` | one species in three weights: boards, carcass, worn edges |
| Plastic | `casePlastic #241f1c`, `casePlasticEmpty #3a332c`, `monitorPlastic #8a7f6b`, `monitorPlasticDark #6d6353`, `keyboardPlastic #9a9080` | packaging is near-black warm; the workstation is aged beige-grey so it has presence without outshining the shelf |
| Paper | `paper #efe3cb`, `paperAged #ddceb2`, `tape #c9b48a` | notes and printed inserts |
| Metal/glass | `metal #6f6a61`, `metalDark #3d3934` | small fittings only |
| Accents | `olive #575c40`, `rust #a4523c` | chair, cables, storage, pin heads — never a large surface. The olive is a correction made after reading the captured frames: at the Stage A value (`#6d7350`) a lit chair back was the second-brightest thing in the room. |
| Light | `lampGlow #ffb066`, `keyWarm #ffd9a8`, `fillCool #8fa3b8`, `shelfWash #ffd7a5`, `dusk #232c38` | two temperatures, warm dominant |

The monitor's `screenBase #10130f` / `screenText #cfe6b8` are the values `#monitor-screen` uses, now
expressed as `--screen-base` and `--screen-text` in `tokens.css` and read from there by `room.css`, so
the physical glass and the HTML panel on it are the same two numbers rather than four literals. That
pair is the only intentional duplication between the two files, and `tests/e2e/gate.mjs` E1b compares
the *rendered* CSS colour with `sharedWithCss` instead of trusting the comment — V14 was a claim going
stale with nothing enforcing it. The four unused CSS room tokens are deleted, and the room's surface
colours live in exactly one place. `screenGlow #3f5c33` stays room-only: it is the emissive tint of the
glass, has no CSS counterpart, and was picked against the panel's base in the captured frames.

## 4. Material families

`src/js/objects/materials.js` stops being a list of colours and becomes a small library with one
entry per family, each with a defined response to light. Every surface reads its colour from
`palette.js`; nothing in the object modules writes a hex literal.

- **Wood** — procedural grain drawn once to a canvas, reused at three weights with the grain rotated
  to follow each surface's long axis (floor planks along x, desk boards along z, shelf boards along x).
  Tiling is in **world metres**, not UVs: `WOOD_TILE 0.3`, `FLOOR_TILE 0.75`, `PLASTER_TILE 1.4` and
  `PAPER_TILE 0.1` say how many metres one repeat covers, so one shared material keeps a constant
  physical grain size whatever the object's dimensions. Without it the same texture looked like fine
  oak on a drawer front and like wallpaper on a wall.
- **Plastic** — no texture; distinguished by roughness alone. Cases are hard and slightly glossy with
  a visible seam; the monitor shell is older, chalkier plastic at higher roughness; the keyboard is the
  flattest of the three. Nothing metallic.
- **Paper** — fine fibre noise at low contrast, high roughness, and a physically plausible edge: notes
  are 3 mm boxes, not zero-area planes.
- **Wall paint** — `plasterMaps()`, five very low-alpha radial passes at 0.018 plus 1 px speckle at
  0.05, i.e. far quieter than paper. The first pass used the paper noise at plaster scale and the
  walls came back with visible 6–22 cm swirls, which is exactly the "printed wallpaper" tell this
  family is supposed to avoid.
- **Metal/glass** — brushed metal for brackets, legs and the lamp; the screen gets its own material,
  `roughness 0.45`, i.e. a matte CRT face rather than a mirror. That value plus moving the spill light
  off the glass's normal is what finally removed V6's hotspot.
- **Printed page** — `printedPageCanvas()` draws a heading block, a rule, rows of grey at varying
  widths and a signature squiggle, and is **deliberately illegible**. At the size a pinned A4 appears
  from two metres away, the suggestion of text is what makes an object read as a document; the actual
  words stay DOM, opened through the paper view, which is the rule in §7. The real image in this
  milestone is used once: the studio's own supplied frame for the featured game, drawn down to card
  resolution for the case's front cover. The original PNG stays where it is and still serves the web
  pages.

Texture budget: procedural canvases at 256² and 512², cached by content key (`printedPageMaterial`
memoises by variant+seed, `build.js` caches geometry by dimension), reused across objects. Measured
in the built page: 20–27 textures and 6–8 shader programs, against 2 textures and 2 programs before.
The only photographic input is the game's own cover frame. No new dependencies, no external asset
hosting, and no image file added to the repository for the sake of the room.

## 5. Lighting plan

Five roles, deliberately separated. As delivered, three of the seven light objects cast shadows and
four do not:

1. **Room key** — a directional light, `#ffd9a8` at intensity **4.6**, 1024² shadow map. Re-aimed
   during Stage D to stand high over the *door* corner (`5.2, 4.4, 2.6` looking at `-0.6, 0.5, -1.6`)
   rather than over the desk. A light outside a sealed box can only reach surfaces whose normals face
   it: at the first aim the north wall — the wall carrying the shelf and the computer, i.e. the subject
   of the room — was facing away from both the key and the fill and stayed black.
2. **Window fill** — cool daylight `#8fa3b8` at 1.6 through the new east-wall opening, weak, no
   shadows. Its job is still to stop the room being one orange cast (V7).
3. **Desk lamp** — a warm spot *inside* the shade at the shade's mouth, 0.72 rad cone, 512² shadow
   map, so the desk gets the pool a lamp actually makes (V5).
4. **Shelf light** — a warm spot 4 cm proud of the strip board above the plank, `#ffd7a5` at 4.2,
   1.28 rad cone, 512² shadow map, aimed at the case faces so the catalogue gains contact shadows and
   stops being the darkest thing in the room (V8). A `stripGlow` emissive mesh sits where the lamp is,
   so the light has a visible source.
5. **Screen spill** — a point light at 0.12, placed off the glass's normal (V6) so it cannot put a
   hotspot on the screen. The screen reads as lit from within, not as a lamp.

Plus the pair that turns out to be doing most of the work: **the hemisphere is the room's bounce, not
the sky.** `ground #a08463` is light coming off the floor, so it is what reaches downward-facing
surfaces — the ceiling above the shelf was lit by a `ground` colour as dark as the floor itself, which
is why the first after-pass read as a hole in the room again. `sky #a89880` comes down from the
ceiling. Vertical walls get the midpoint. Ambient (`#3a2d20` at 0.8) exists only so corners are not
pure black; stronger and the room loses the sky-to-floor gradient entirely.

Exposure and tone mapping: `ACESFilmicToneMapping` at **1.12** with `SRGBColorSpace` output. The
intensities above are roughly four times what a "realistic" rig suggests, and that is the measured
consequence of the palette: the room's albedos are dark walnut and aged plaster (0.04–0.10 in linear
terms), a Lambertian surface returns `albedo × irradiance × dotNL / π`, and ACES then pulls mid-tones
down again. A key at 1.15 rendered the portfolio wall almost black. Every value in `lightRig` was set
by reading captured `m7-after` frames against the `m7-before` baselines, not from a preset. The scene
fog was deleted: the room is now a closed 7×6×2.8 m box and the fog's near plane sat at 8 m, so it
could not reach anything inside it.

**No bloom, no post-processing, no decorative screen effects** — nothing in this milestone needs them,
and each would have to be measured before it was allowed.

Shadow settings are chosen from the measured after-counters, not from a preset:

- `PCFShadowMap`, **not** `PCFSoftShadowMap`. r186 removed PCFSoft: it logs
  `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` and silently
  falls back. The Stage A wording here ("PCF soft maps") was therefore describing an option that no
  longer exists, and the soft edges on the practicals come from their `penumbra` (0.85 on the lamp,
  0.95 on the shelf) rather than from the map type.
- Three casters only — key, lamp, shelf: 1,572,864 shadow-map pixels.
- **Static shadow maps**: `shadowMap.autoUpdate = false` with one `needsUpdate` after the shell is
  built. Nothing in the room moves except the cassettes during a hover nudge, so re-rendering three
  depth passes every frame would be pure cost. The counter is reported by
  `window.__saleshiRoom.stats()` as `shadowStatic`.
- Everything else explicitly not casting, and the 52 keyboard keys are one `InstancedMesh` with
  `castShadow = false`.

## 6. Composition

The layout stays: shelf on the north wall at the west end, desk on the north wall at the east end,
papers on the west and north walls, entry from the south wall. Changes are additive and small:

- A **small window high on the east wall** — the room had no opening other than a door panel, and the
  cool fill needed a reason. This is the one architectural addition. Both it and the door are real
  reveals: the south and east walls are built from four pieces each, with a frame and a sill, which is
  also what gives the corners the junction detail V2 asked for (skirting all round, architrave at the
  openings, a 100 mm-thick wall box instead of a plane).
- The **north wall is the accent wall** — same plaster family, darker albedo (`wallDarker`), because
  the shelf and the computer both sit against it and the catalogue needed something to stand out from.
- The shelf is a **carcass** — two sides, a back panel, a top and the plank, with a storage box on
  top, rather than a plank with two tabs under it and a dark hole behind it (V8). Its `SHELF_PLANK`
  origin, span and `SLOT_SPACING` are unchanged, so the shelf station's aim and the tests that measure
  slot positions still describe the same piece of furniture.
- The chair was **rebuilt in place**, not moved. Stage A proposed pushing it behind the desk line;
  what actually happened is a four-leg chair — seat, frame, and a back panel carried by posts that
  continue up from the rear legs, which is what makes a chair back stay up — occupying exactly the
  collider it already had (`x 0.325..0.775, z −1.725..−1.25`). Moving it would have changed the
  walkable floor for an art reason, and every distance assertion in `tests/e2e/movement.mjs` would then
  be measuring furniture placement instead of movement.
- A **mouse**, a lamp that reads as a lamp, a mug, a pad of paper and three cable runs, and nothing
  more. V12 is real, but a cluttered desk would compete with the shelf for attention.
- The two papers keep their walls and gain space around them; neither moves closer than 0.4 m to
  another object. The featured game's case gained a front cover using the studio's own supplied frame,
  a printed J-card whose window is cut with `alphaTest` so the tape and its two hubs show through it, a
  spine strip folded over the top edge, a seam ridge on the opening edge and 26 mm of real thickness.
  The three empty positions are blank translucent cases with no card, no label and no interaction,
  because there is nothing honest to print on them (V10, and the rule in §7).

Navigation is unchanged in footprint: `ROOM_BOUNDS` and all three `BLOCKERS` in
`src/js/room/collision.js` are byte-for-byte what Stage A measured, and the tower was placed *inside*
the desk's existing collider rather than beside it for exactly that reason. The ceiling and window are
outside the walkable volume, so they cannot change it either.

One behavioural fix fell out of the movement re-run and is worth stating because it changes what
"walking" means: the loop used to hand the controller `Math.min(0.05, deltaSeconds)` per frame, so
below 20 fps real time was silently discarded and a two-second key press travelled a distance that
depended on how fast the GPU was. W4 and W6 failed under SwiftShader for that reason. The update now
runs on a **fixed 1/60 s accumulator** (`SIM_STEP`, capped at 8 catch-up steps per frame), so distance
is a function of wall-clock time and the assertions are reproducible on slow hardware.

## 7. What must not regress

The HTML panel stays HTML — no interface text is baked into a texture or turned into geometry. That
line needs to be drawn carefully, because three things in the room now carry words:

- **Packaging** — the game's own title and supplied frame are printed on the case's front card and
  spine. This is the object, not an interface, and it uses only the real record from `games.js`.
- **A printed page** — the pinned papers get a texture that *suggests* a document. It is deliberately
  illegible: rows of grey, a heading block, a signature squiggle, no readable words.
- **The interface** — every word on the monitor is DOM text in `#monitor-screen`. The glass is an
  emissive plane and nothing else, which is what lets the panel be resized, zoomed, read by a screen
  reader and indexed.

At two metres a case title is roughly nine pixels tall, so the printed spine is texture, not access:
the accessible name of every object is still the DOM proxy chip (`Cassette: The Last Witness — select
to show this game on the computer screen.`), and the printed cover only ever repeats what the chip, the
panel and the catalogue pages already say.

Selection stays raycast-plus-DOM-proxy, keyboard activation, focus restoration and URL sync all stay.
Reduced motion, the no-WebGL list view and the room's lazy loading stay. The shelf keeps deriving its
contents from `src/js/data/games.js`: one real game, three blank positions, no invented titles.

Verified again in this milestone rather than assumed:

- **D11 re-test passed** — `gate.mjs` G4: the computer chip remains clickable at the desk with the
  panel open (`hit=BUTTON.proxy`), and the panel still occupies its own column rather than the viewport.
- `papers.mjs` P8 — a trusted click on the 3D instruction sheet, projected through the real raycaster,
  opens the readable note. This *did* regress during Stage E and is recorded in §10: a printed-page
  plane parented to the note group rather than to the sheet was invisible to the raycaster, because
  `picking.js` only tests the interactable meshes and their descendants.
- `movement.mjs` W1–W12 and `papers.mjs` P1–P8 pass; `routes.mjs` 29/0. The whole matrix is in
  `evidence/m7-regression.txt`.

## 8. Measured before and after

Both columns come from `tests/e2e/visual.mjs` — the same ten fixed viewpoints, the same QA bundle, the
same headless Chromium + SwiftShader tab, 1280×800 with a 912×608 drawing buffer. Ranges are the
minimum and maximum across the ten viewpoints. Raw files:
`evidence/m7-before-room-stats.json`, `evidence/m7-after-room-stats.json`.

| Counter | Before | After |
| --- | --- | --- |
| draw calls per frame | 5–35 | 10–96 |
| triangles per frame | 20–356 | 474–12,752 |
| meshes / scene nodes | 37 / 54 | 110 / 135 |
| geometries in memory | 14–37 | 59–74 |
| textures in memory | 2 | 22–27 |
| shader programs | 2 | 8 |
| lights | 5 | 7 |
| shadow maps | off | on, 3 casters, 1,572,864 pixels, rendered once (static) |
| tone mapping | none (0) | ACES filmic at exposure 1.12 (4) |
| boot to first rendered frame | 1,793 ms (one sample) | 1,249 / 1,321 / 1,557 ms (three samples) |
| frames counted in a 2 s window | 25 | 26–27 |
| focus-proxy projection cost | 0.285–0.467 ms average, 6.5 ms worst (60 samples) | 0.072–0.125 ms average, 1.3 ms worst (32 samples) |
| room JS chunk | 626.67 kB minified / 169.34 kB gzip | 667.10 kB minified / 181.45 kB gzip |

Read honestly, these are SwiftShader numbers from a software rasteriser and they are only comparable
with each other. Three things follow from them:

1. **Triangles per frame rose from 20–356 to 474–12,752 — between 12× and 61× at the same viewpoints —
   and the scene did not become slower on this rig.** The reason is where the cost went:
   `shadowMap.autoUpdate = false` means the three depth passes run once, and the geometry is procedural
   and shared, so the per-frame work is one forward pass over 110 mostly small meshes. Draw calls
   roughly doubled-to-tripled, which is the number that actually costs a web page.
2. **The boot figure improved, but the evidence for that is weak.** The before run is a single sample
   and the after spread is ±150 ms, so the honest claim is *no measured regression*, not a speed-up.
3. **The room chunk grew 6.5% minified / 7.2% gzipped** — 12.11 kB gzip for the whole art pass, with
   no image file added to the repository and no new dependency. Lazy loading is unchanged: the chunk
   is still only fetched when the room is entered, and the playable game is still a separate route.

The new `walkMetresInTwoSeconds` counter in `evidence/m7-after-room-stats.json` is the one behavioural
measurement: 3.35 m per two seconds of held-forward, identical across runs taken at 18 and 19 fps.
Before the fixed-timestep change that number moved with the frame rate.

## 9. Where the result departed from the Stage A plan

| Plan | Delivered | Why |
| --- | --- | --- |
| "only two of them allowed to cast shadows" | three (key, lamp, shelf) | with two, the furniture still had no contact with the floor in the wide views. The third costs one 1024² pass, rendered once. |
| "PCF soft maps" | `PCFShadowMap` | r186 removed `PCFSoftShadowMap`; it warns and falls back to PCF. Writing the removed value would have been a comment describing an option that does not exist. |
| light intensities around 1.0 | key 4.6, shelf 4.2, hemisphere 2.0 | the palette's albedos are dark and ACES pulls mid-tones down; the planned values rendered the portfolio wall black. See §5. |
| chair moved behind the desk line | chair rebuilt inside its existing collider | an art change should not silently move the walkable floor; see §6. |
| — | the shelf strip's emissive was cut from 0.5 to 0.28 | at 0.5 the fitting was the brightest pixel in the wide composition and pulled the eye off the cases it is supposed to be lighting. |
| — | a printed page on each pinned paper | V11 asked for paper that reads as a document; a blank cream rectangle still did not. Deliberately illegible, see §4. |
| — | fixed-timestep simulation | not an art item at all: found because W4/W6 failed once the room got heavier. See §10. |

## 10. Regressions this milestone caused, and what fixed them

Recorded because "nothing broke" is only credible if the things that did break are listed.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `papers.mjs` P8 — clicking the visible 3D note did nothing (`hit=CANVAS open=false`) | the printed-page plane was a sibling of the sheet inside the note group. `picking.js` raycasts the interactable meshes and their descendants, so the plane was never tested and the sheet behind it was hit only where the plane did not cover it. | the plane is now a child of the sheet mesh (`notes.js`), which also makes it inherit the sheet's tilt and lean. |
| `movement.mjs` W4 and W6 — a two-second key hold stopped short of the wall it used to reach | `Math.min(0.05, dt)` per frame discarded real time below 20 fps. The heavier room dropped the tab to ~10–19 fps, so walking simply went slower than wall-clock. | a fixed 1/60 s accumulator with a catch-up cap, so distance is a function of time and not of frame rate. |
| `routes.mjs` R9c — a touch drag appeared to move the camera 2.65 m | a harness race, not a room bug: the before-state was sampled on the first rendered frame, while eased station travel was still in flight. The lighter M6 room happened to settle inside the same window. | the harness now waits for two consecutive pose samples to agree before taking the before-state, and prints the field that differed instead of three of them. |
| M6 evidence screenshots silently overwritten by re-running the suites | every harness hard-coded an `m6-` file name | `tests/e2e/evidence.mjs` stamps the milestone (`EVIDENCE_PREFIX=m7`), and the clobbered files were restored from the previous commit. |

## 11. Known limitations and assets still outstanding

- The shelf interior is dim below the strip. A strip mounted on the underside of the top board grazes
  the vertical J-card faces and lights the plank, not the fronts of the cases behind the first row.
  Fixing it properly means a second, lower wash light or canted cards — both are lighting work this
  milestone has already spent its shadow-map budget on.
- The strip fitting is still the brightest pixel in the wide compositions even at 0.28. A diffuser
  profile (a translucent cover mesh) would read better than any intensity that still looks "on".
- The ceiling reads dark from the door. Its albedo is the lightest in the room and it still receives
  almost nothing, because the key and fill cannot reach a downward-facing surface and the hemisphere's
  `ground` term is the only thing trying.
- `m7-after-01-entry` and `m7-after-02-shelf` are the same pose: the room opens facing the shelf, so
  the entry viewpoint *is* the shelf station. Kept rather than faked apart, because the pair documents
  that.
- Every performance number here is software-rendered. No real GPU, no phone hardware, no Firefox and
  no Safari has been measured, so no claim about those is made anywhere in this document.
- Assets the room is still waiting for: real cover art for the three empty shelf positions (they are
  deliberately blank until the studio supplies them), a studio mark — the header still says
  "STUDIO NAME NOT FINAL", so nothing in the room is branded — and a second and third actual game to
  make the shelf a portfolio rather than one case and three gaps.

## 12. Files changed

Counts are `git diff --stat` against `3e4c20d`, the commit that ends M6b, taken while this milestone
is still uncommitted. The room work touched twelve source files and added three; no route, server,
database, store or checkout file was modified.

| File | ± | What changed here |
| --- | --- | --- |
| `src/js/room/palette.js` | **+105 (new)** | Every room colour and light intensity as one exported token set, so §3 and §5 are configuration rather than numbers scattered through builders. Exports `sharedWithCss`, the three values the panel CSS must agree with, and `lightRig` / `screenTone`. |
| `src/js/objects/textures.js` | **+416 (new)** | §4: procedural canvas textures (floor, plaster, wood, paper, cardboard, fabric) with world-space tiling helpers, each memoised, all 256² or 512². This is why "do not introduce huge texture files" is satisfiable: no image asset is downloaded for the room. |
| `src/js/objects/build.js` | **+151 (new)** | §V13: `box()`/`plane()` builders with bevelled edges and a dimension-keyed geometry cache, plus the instanced-key and cable helpers the props use. |
| `src/js/objects/roomShell.js` | +281/−… | §6: walls at the real 100 mm thickness, the north accent wall, skirting that stops at the door frame, a panelled door and window with reveals, and the rebuilt desk, chair, lamp, mug, paper and cable runs. Every collider these objects define is the M6 one. |
| `src/js/objects/materials.js` | +193 | Material families fed from `palette.js`, bevels by default, and the measured `stripGlow.emissiveIntensity` reduction to 0.28. |
| `src/js/objects/shelf.js` | +94 | Plank-and-brackets became a carcass: sides, top board and back board, in the preserved −3.2..−1.7 / −2.9..−2.6 footprint. `SHELF_PLANK` and the slot spacing did not move. |
| `src/js/objects/cassette.js` | +206 | §V7: the 26 mm case with cover, spine, seam and `alphaTest` J-card window, built from the supplied artwork. The cassette remains the interactable; its size changed, its position contract did not. |
| `src/js/objects/computer.js` | +155 | Monitor, keyboard and the tower under the desk. The screen is still a DOM panel: `COMPUTER_ORIGIN` and `SCREEN_SIZE` are untouched so the HTML overlay still registers on the bezel. |
| `src/js/objects/notes.js` | +82 | Pins, tape and the printed page — **and the P8 fix**: the page is now a child of the sheet, which is what makes the raycaster see it. |
| `src/js/room/lights.js` | +135 | §5: the seven-light rig, the three meshes given `castShadow` (key, lamp, shelf), and the physical strip fitting on the underside of the shelf's top board. |
| `src/js/room/scene.js` | +57 | ACES tone mapping and exposure, the renderer setup, `shadowMap.autoUpdate = false` with a single `needsUpdate` so static geometry casts once instead of per frame, and the fog deleted — a closed 7×6×2.8 m box has no distance for it to work on. |
| `src/js/room/startRoom.js` | +74 | Wiring the new builders into boot, and the QA hooks the suites read (`snapshot`, `previewAim`, `stats`). |
| `src/js/room/cameraController.js` | +20 | The fixed 1/60 s accumulator that replaced `Math.min(0.05, dt)`, which is what §10's W4/W6 entry is about. Movement boundaries are the same constants. |
| `src/js/main.js` | +1 | Exposes `aim()` through the QA-only hook object, so a capture can park the eye at an absolute pose. |
| `src/styles/tokens.css` | +12/−… | V14 closed: the four dead surface tokens deleted, `--screen-base` and `--screen-text` added, with the file naming `palette.js` as the only source for room surfaces. |
| `src/styles/room.css` | +8 | `#monitor-screen` and `.screen-link` read those tokens instead of repeating hex values. |
| `tests/e2e/evidence.mjs` | **+19 (new)** | `EVIDENCE_PREFIX` stamping, the structural fix for §10's evidence-clobbering entry. |
| `tests/e2e/visual.mjs` | **+192 (new)** | `tests/e2e/visual.mjs`: the ten fixed viewpoints, the per-viewpoint stats block and the two-second walk measure that produced §8's table. |
| `tests/e2e/gate.mjs` | +21 | New E1b shared-token assertion, plus prefix adoption. |
| `tests/e2e/routes.mjs` | +27 | R9c rewritten to wait for a settled pose (§10), plus prefix adoption. |
| `tests/e2e/{movement,papers,commerce,game-builds}.mjs` | +3…+7 | Prefix adoption only; no assertion changed. |
| `docs/evidence/README.md`, `docs/art-direction.md` | — | The M7 evidence index and this document. |

Nothing was deleted from the M6 room; each of these files was inspected and extended in place, which
is why the diff is large in five files and small in the ones that only had to stop hard-coding.

### The asset list

The milestone adds **no binary asset to the repository** and no dependency — `package.json` is not in
the diff above.

| Asset | Where it comes from | Cost |
| --- | --- | --- |
| Floor, plaster, wood, paper, cardboard and fabric surfaces | `textures.js` draws each one onto a 256² canvas at runtime | zero bytes on the network; the room's texture *count* rises (2 → 22–27) because VRAM now holds them, not because files were added |
| Printed page contents for the two pinned papers | `printedPageCanvas()`, 256×362, drawn from a layout, not from a document | same as above |
| Game case front | `coverCardCanvas()` composites the **already-committed** supplied frame (`public/game/screenshots/…`, added in M6b) with the record's title and status | reuses an existing asset; nothing new fetched |
| Case spine | `spineCanvas()`, 512×72, from the game record's title string | zero bytes |
| Shelf slots with no game | `createEmptySlot()` and `createFlatEmptyCase()` — an unlabelled plastic shell with a seam and no card, plus blank cases lying flat on the upper and lower boards | zero bytes; they read as packaging, not as hidden products |

That is the whole answer to "do not introduce huge texture files": the room's detail is procedural, so
the incremental download cost of all this work is the JS that generates it — the room chunk grew from
626.67 kB (169.34 kB gzipped) to 667.10 kB (181.45 kB gzipped), +6.5% raw and +7.2% gzipped.

## 13. M8 addendum — what the content milestone changed in the room

Added at the end of M8 rather than edited into §1–§12, because those sections are a plan written before
the M7 work and rewriting them would destroy the comparison they exist to make.

**The shelf chip says the title.** `proxyEntries` used to label a cassette "Tape 1", which describes the
packaging and not the thing inside it; the chip now carries `game.title` and the accessible name keeps
the object type (`Cassette: The Last Witness`). This is the only room change the content milestone made
to input presentation. G3 asserts every chip stays inside the stage after the widening, and G1c and P1
both print the new chip set: `["The Last Witness", "Computer", "Letter", "Note"]`.

**The geometry is still data.** M8 §6.4 forbids hard-coding the featured game into the shelf, and
`shelf.js:77-87` is the check: one loop over `0 … capacity-1`, `games.find(entry => entry.slot === slot)`,
a real case if a record answers and `createEmptySlot()` if not. `capacity` is a value in `games.js`
(4), not a constant in the room, so a second title is a record and not a geometry edit. The close-up
viewpoint `m8-visual-06-case-close-up.png` shows what the case actually presents: the captured frame,
the status line "PLAYABLE DEMO" and the title, all three read from the record.

**The selection response was left alone.** A selected case slides 0.055 m forward and turns 0.22 rad,
a hovered one 60% of the way; reduced motion jumps between those states instead of easing. Only
`position.z` and `rotation.y` are written, which is what lets the per-slot `rotation.z` lean in
`cassette.js` survive. One consequence is worth stating rather than fixing: the proxy chip's anchor is
computed once, so the chip does not follow the 5.5 cm slide. At the shelf station the label sits just
behind the moved case, and because the chip is a label and not a pointer, G3's containment assertion is
the test that matters.

**The provisional cover is not stamped on the card.** M8 §5.3 requires a stand-in cover to be labelled,
and it is — in the panel, on the catalogue card and on the game page, all three from the one record
value (R1c, R14a, R14b). The printed J-card does not carry the sentence, and
[ADR-014](decisions/ADR-014-provisional-cover-label-lives-in-the-dom.md) records why: §3.3 and ADR-007
keep readable words out of textures, and type small enough to fit a provenance line on a 0.129 × 0.184 m
card is type nobody can read.

**Current cost of the room chunk** is 668.69 kB (181.97 kB gzipped), against the 667.10 kB (181.45 kB)
that §12 closed on. The difference is M8's content wiring, and the M8 milestone report carries the
before/after table rather than this document.

## 14. M8 addendum — the four accepted M7 compromises, re-examined

M8 §10 asks whether the four limitations accepted at the end of M7 are still the right call now that
the room carries real content. Each was re-read against `m8-visual-02-shelf.png` and
`m8-visual-06-case-close-up.png` rather than against the M7 notes, because the question is what a
visitor sees today.

| # | The compromise as M7 accepted it | What M8 changed | Verdict now |
| --- | --- | --- | --- |
| 1 | The shelf interior is dim below the strip: the underside-mounted light grazes the J-card faces and lights the plank rather than the case fronts behind the first row. | The one real case now carries the captured frame, the status line and the title on its card, and the close-up shows all three legible at the shelf station even though the case stands at the dim end of the pool rather than under it. The lower board holds one flat empty case (`shelf.js:70`), deliberately unlabelled so it reads as packaging, so nothing M8 added has to be read down there. | Still accepted, and cheaper to accept than it was. The dimness used to hide an empty shelf; it now hides only blank cases, which are blank until the studio supplies titles. The fix remains a second, lower wash light and it is still not spent. |
| 2 | The strip fitting is the brightest pixel in the wide compositions even at 0.28 intensity. | Nothing. M8 touched no light, no material and no exposure value. | Still accepted. A diffuser cover mesh is the only real answer and it is geometry plus a translucent material for one fitting. |
| 3 | The ceiling reads dark from the door although its albedo is the lightest surface in the room. | Nothing, and no content was added to it. | Still accepted. It is physically correct for a downward-facing surface lit by a key and fill that cannot reach it. |
| 4 | `m7-after-01-entry` and `m7-after-02-shelf` are the same pose, because the room opens facing the shelf. | The pose now shows a titled case instead of a labelled box, so the entry frame carries more information than it did. | Still kept, and the duplication is now the point: the first thing a visitor sees is the shelf, and the shelf is where the game lives. Faking the two frames apart would be a worse document, not a better room. |

One limitation is new and belongs with these four rather than hidden in a test log: the room's text is
drawn procedurally onto canvases at runtime, so the WCAG contrast and target-size measurements in
`evidence/m8-accessibility.txt` cannot reach it. The words are not lost — the paper view, the
catalogue and the game page carry all of them as HTML, which is why those routes exist — but no
contrast number is stated for a lit, shadowed 3D surface, because none could be measured honestly.


