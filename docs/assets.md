# M8 asset inventory, provenance and the image pipeline

Everything this site publishes as an image, where each one came from, what it weighs, and the one
automated transformation the build applies to it. Written for M8 WP4; the numbers were measured by
`npm run assets:report` and by reading the built bundle, not estimated.

## 1. The rule this section is built around

Three of these images are the only photographic content in the whole site, and none of them was
supplied by the studio as artwork. They are frames captured off the running demo while it was being
integrated (see `docs/open-requirements.md`, "Promotional artwork"). That distinction has to survive
to the reader, because a screenshot can look exactly like a press still and a caption that only
describes what a frame shows invites that assumption. So the game record carries provenance as data:

- `cover.provisional` plus `cover.provenance` — what the game page and the room's computer panel
  render under the cover image.
- `mediaProvenance` — one sentence covering the whole set, printed under the gallery.

Both are rendered from `src/js/data/games.js`, so the catalogue card, the game page, the monitor
panel and the shelf's printed J-card cannot tell four different stories about the same pixels.

## 2. Inventory: images the site serves

Paths are given as `repo → bundle`; the bundle column is what a visitor of a deployed site fetches.
Sizes are binary KiB.

| File | Repo (captured) | Bundle (served) | Size in the picture | What it is used for |
| --- | --- | --- | --- | --- |
| `public/game/screenshots/the-last-witness-briefing.png` | 26.0 KiB | 17.4 KiB | 1280×800, 190 colours | gallery frame on the game page |
| `public/game/screenshots/the-last-witness-case-stage-1.png` | 45.0 KiB | 30.9 KiB | 1280×800, 104 colours | gallery frame on the game page |
| `public/game/screenshots/the-last-witness-evidence-register.png` | 50.7 KiB | 33.4 KiB | 1280×800, 87 colours | cover everywhere *and* the third gallery frame; the J-card face on the shelf |
| `public/game/web/The Last Witness.png` | 20.9 KiB | unchanged | 800×600, 320 colours | Godot's boot splash, drawn inside the demo frame |
| `public/game/web/The Last Witness.icon.png` | 11.7 KiB | unchanged | 180×180 | the export's own favicon, referenced by its own HTML |
| `public/game/web/The Last Witness.apple-touch-icon.png` | 11.7 KiB | unchanged | 180×180 | the export's own home-screen icon |

The first three are committed to Git as captured. The last three belong to the engine export and are
covered by `src/js/data/builds.js` (sizes and SHA-256 of every file), re-verified by
`npm run game:check`, `npm run test:builds` and `npm run test:assets`.

Those six are the whole set the site serves. There is no SVG icon set, no sprite sheet and no
background photography; the room's materials are procedural canvases drawn in code
(`docs/art-direction.md` §4), and the only bitmap it samples is the cover frame above. The other PNG
files in the repository are under `docs/evidence/` — test captures quoted by the milestone reports,
never served by the site, and therefore outside the pipeline.

## 3. What the build does to them

`scripts/asset-pipeline.mjs` runs as a Vite build plugin (`closeBundle`) and rewrites only the PNGs
under `game/screenshots/` inside the bundle. `public/` keeps the captured files.

The reason it is worth doing at all is measurable: all three frames are flat-shaded terminal
screens using 87, 104 and 190 distinct colours, yet they are stored as 24-bit truecolor — three bytes
per pixel to describe something that fits in a palette index. Re-encoding as an indexed PNG removes
bytes a lossless codec was paying for and changes nothing a viewer can see.

| Option | Measured result | Taken? |
| --- | --- | --- |
| Re-deflate the existing IDAT streams at level 9, keeping their own filters | 121.6 → 116.8 KiB (−4.0%) | no — the encoder that made them had already compressed well |
| Re-filter truecolor with the same entropy-chosen per-scanline filter, without the palette | 115.0 KiB (−5.4%)¹ | no — the filter pass alone barely moves; it is the palette that pays |
| **Indexed (palette) re-encode + re-filter, level 9** | **121.6 → 81.7 KiB (−32.8%)** | **yes** — provably lossless, no new dependency |
| WebP / AVIF | not measured | no — no encoder is available without adding a dependency, which M8 §15 rules out. Recorded as a candidate if that rule is ever revisited; no saving is claimed for it here. |
| Resized derivatives / `srcset` | measured below, not implemented | no — at 2× and 3× device pixel ratios the full 1280 px frame is close to what the layout actually asks for, so a smaller file would be wrong there, and a second copy of every frame would have to be stored and kept in step. |

¹ The first two rows were measured while deciding, with a scratch script that is not in the
repository. Only the shipped row is reproducible from the project (`npm run assets:report`); the
other two are recorded so the choice can be argued, not so it can be re-run.

The over-delivery that motivated the last row, measured in the built page:

| Viewport | Cover box | Device px needed | px shipped | ratio |
| --- | --- | --- | --- | --- |
| 1280 @1× | 512 css px | 512 | 1280 | 2.50× |
| 1280 @2× | 512 css px | 1024 | 1280 | 1.25× |
| 1024 @1× | 512 css px | 512 | 1280 | 2.50× |
| 390 @3× (phone) | 358 css px | 1074 | 1280 | 1.19× |

A resize would pay for itself only in the top and third rows, and cost sharpness in the others.

What the pipeline does **not** do: a decoded bitmap is a decoded bitmap. Each frame still occupies
3.91 MiB of RGBA in memory once drawn. The saving is transfer, not decode.

Safety, in the order it is enforced:

1. Only colour type 2 (truecolor, no alpha), bit depth 8, non-interlaced, and only files with no
   `gAMA`/`cHRM`/`iCCP`/`sRGB`/`sBIT`/`tRNS` chunk — re-serialising one of those would drop the colour
   specification and silently shift how the image renders.
2. More than 256 distinct colours is a refusal, not a quantisation.
3. The rewrite is decoded and compared pixel-for-pixel with the original before it is kept.
4. A rewrite that is not actually smaller is refused; the original ships.
5. Re-running the pipeline on its own output is a no-op (an indexed file is not colour type 2).

Rules 1–5 are tested in `tests/asset-pipeline.test.mjs` (8 tests), including a check of the chunk CRCs
against Node's own `zlib.crc32`. That check exists because the module verifying its own output with
its own reader proved nothing: the first version wrote little-endian CRCs, round-tripped perfectly in
Node, and was refused by every browser. The property that matters — *the served file and the captured
file are the same picture* — is asserted independently in `tests/e2e/game-builds.mjs` as **B3b**,
which draws both through Chromium's PNG decoder and compares the resulting pixels.

## 4. What that is worth to a visitor

Measured on the built QA bundle at 1280×800, summing the response bodies of the game page's first
load (`tests/e2e/game-builds.mjs` fetches this page; the figure is from a one-off transfer count):

| | Before the pipeline | After |
| --- | --- | --- |
| Cover frame fetched first | 50.7 KiB | 33.4 KiB |
| Whole game page first load | ~71.2 KiB over 7 requests | 53.9 KiB over 7 requests |

The gallery frames are `loading="lazy"` and were not requested at all on first load, which is why the
first-load saving is the cover's 17.3 KiB and not the full 40.9 KiB across all three distinct files.
Of that remainder, 22.7 KiB is what scrolling past the gallery saves — the third frame is the cover
again at the same URL, so it costs nothing twice. For perspective, the same page links a 35.1 MB
archive and a 38.8 MB browser build: this moved the *page*, not the *game*.

Two honest limits on the figure:

- It is one page at one viewport on one machine, on a loopback origin. It is a byte count, not a
  latency or a user-perceived load time, and no claim about either is made here.
- `npm run dev` serves `public/` and therefore the captured files. Only a built bundle carries the
  optimised copies, so a developer preview is ~40.9 KiB heavier than a deployed page. That is
  intentional: the plugin is `apply: 'build'`, and the dev server should serve exactly what the
  repository holds.

## 5. Boundary: what must never be rewritten

`PIPELINE_DIRS` in `scripts/asset-pipeline.mjs` lists `game/screenshots` and nothing else. The Godot
export under `game/web/` and the desktop archive under `downloads/` are served as the studio's
exported bytes; the site's claim that the playable demo is the real unmodified export depends on
those bytes not moving, and `npm run test:assets` fails if a bundle ever ships a `game/web` file whose
hash differs from the measured record.

## 6. Attribution

- **The three frames** — captured from the studio's own Godot browser build (EV-044 demo) during M7
  integration. They are derivative works of the game and are published on this site only because the
  game is this site's subject. The capture driver was throwaway and is not in the repository, which
  is why they are labelled where they appear rather than described as supplied assets.
- **Font licence text inside the desktop archive** — `LICENSE/upheaval.txt` and
  `LICENSE/font-licenses.md`, copied by `scripts/stage-game-build.mjs` from the game project's
  `assets/fonts/`. The archive is only bundled while that licence text travels with it; the terms
  themselves live in those files and are not restated here.
- **Third-party code** — Godot 4.7 exports (the `.wasm`, `.js`, `.pck`, `.exe`), three, Vue, Express,
  mysql2, Vite and Playwright. Dependency licences are a report-reference matter, recorded in
  `docs/roadmap.md` §"Harvard references", not an asset-pipeline matter.
- **Everything else on screen** — the room's walls, desk, shelf, cases, papers, lamp and every texture
  in it are geometry and procedural canvases written for this project. No downloaded or stock artwork
  is used anywhere in the room.

## 7. Assets the site does not have

Deliberately absent, each because it would be an invention:

- A studio logo, wordmark or monogram. The header shows a "studio name not final" marker on every
  page while `src/js/data/studio.js` has `nameIsFinal: false`, and nothing is branded in the room.
- A favicon or home-screen icon for the site itself. The only icons served are the two inside the
  Godot export, and they name the game, not the studio. A site icon needs the mark above.
- Dedicated cover artwork. The stand-in is labelled provisional in three places.
- Artwork for the three empty shelf positions. They are blank on purpose.
- A gallery beyond these three frames, and any second game to fill another shelf slot.
- Any figure — player counts, reviews, awards, sales — that `docs/roadmap.md` §9 forbids inventing.

## 8. Re-measuring any of this

```
npm run assets:report   # what the pipeline would do to each committed frame, and why not otherwise
npm run assets:check    # fails if a frame loses eligibility, so the table above cannot rot silently
npm run build           # prints the same table for the bundle it just wrote
npm run test:assets     # guards, round-trip, CRCs, and the untouched-export boundary
```
