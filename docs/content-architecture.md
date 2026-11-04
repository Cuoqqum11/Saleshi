# M8 content architecture: one record, every surface

Where every published word comes from, how the same sentence reaches a walkable room and a plain HTML
page without being written twice, and what the site deliberately says it does not know. Written for
M8 WP2/WP3/WP7; the module names, line numbers and measured check ids are the current ones.

## 1. The rule

A fact is stored once, in a plain ESM record, and every surface renders from it. Three consequences:

- **Nothing is baked into a texture.** M8 §3.3 forbids words drawn into a PNG, and M8 §11.5 forbids
  the room being the only carrier of meaning — so the room renders its panel from DOM text and clones
  the page's own copy of a paper (`src/js/ui/paperView.js`), rather than printing text onto geometry.
- **A page can be read without the room.** Eight HTML routes carry the same content as static text,
  substituted at build time (`scripts/static-content.mjs`), so the words exist in the served HTML
  before any script runs.
- **An omission is stated, not hidden.** Each record keeps a `notSupplied` list and the game page
  prints it as its own section, so a reader can tell a deliberate blank from an oversight.

## 2. The record modules

| Module | Lines | Holds | Consumed by |
| --- | --- | --- | --- |
| `src/js/data/studio.js` | 92 | name + `nameIsFinal`, `kind`, `summary`, `mark: null`, `contact`, `web.canonicalBaseUrl`, `notSupplied` | `metadata.js`, `games.js`, `scripts/static-content.mjs`, the letter |
| `src/js/data/games.js` | 194 | the game record: `slot`, `statusLabel`, `statusDetail`, `genre`, `platforms`, `releaseDate: null`, `prose{}`, `features[]`, `cover{}`, `mediaProvenance`, `screenshots[]`, `availability{}`, `notSupplied[]` | catalogue, game page, play page, store, cart, room panel, shelf geometry, MySQL seed, JSON-LD |
| `src/js/data/offerings.js` | 44 | what you can pay (voluntarily) for, kept separate from the creative work | store, cart, checkout, `/api` |
| `src/js/data/builds.js` | 117 | staged binary facts: sizes, hashes, entry counts, served paths | game page, play page, download route, `game:check`, the record's derived fields |
| `src/js/data/content.js` | 142 | the studio's own words: `studioLetter`, `howToNote`, `roomHints` | the two wall papers, the readable HTML twin, the room's hints and live region |
| `src/js/data/metadata.js` | 152 | derives title/description/OG/JSON-LD per route from the above, withholding what is unconfirmed | all eight routes |

Games describe the work; offerings describe acquisition. Keeping them apart is what lets one game be
free to play and separately supportable without becoming two competing products.

## 3. Route map

`vite.config.js:18-27` declares exactly these inputs; `docs/evidence/m8-build.txt` records the built
output and R12 proves every local link and fragment on them resolves.

| Route | What it presents | Content source |
| --- | --- | --- |
| `/` | the room, or the text view if WebGL/device says no; shelf, desk, papers | `games.js`, `content.js`, `studio.js` |
| `/games/` | the catalogue: one card per record plus the unfilled shelf positions | `games.js`, `shelf.capacity` |
| `/games/the-last-witness/` | full record: prose, features, availability, status, unknowns, media | `games.js` |
| `/games/the-last-witness/play/` | the browser demo, with the measured download size and no automatic fetch | `builds.js` via `games.availability` |
| `/store/` | creator support: the offerings, plainly marked simulated | `offerings.js` |
| `/cart/`, `/checkout/`, `/order/` | voluntary contribution, simulated checkout, confirmation | `offerings.js` + the server's records |
| `/api/*` | server-side validation; the browser never sets a price or a total | `server/` |

## 4. The game page's section order (§8)

M8 §8 asked for a fixed order rather than one undifferentiated description block, so `prose` is split
by what each paragraph is *about*: `overview`, `gameplay`, `experience`, then the record's own fields.
Rendered order, measured by R16a on the built page:

**Overview → Gameplay → Experience → Features → Availability → Status → Not supplied yet → Store and
creator support**

`status` has no prose key because `statusDetail` *is* that paragraph; a second copy would be two
sentences to keep in step rather than two facts. R16b asserts every sentence in `prose` reaches the
page exactly once (`3 sentences; absent=0; duplicated=0; status stated 1×`), so splitting the text
cannot silently drop or repeat a claim.

## 5. The room as a second rendering of the same data

| Room object | Derives from | Check |
| --- | --- | --- |
| Cassette positions | `games[].slot` against `shelf.capacity`; a position with no record stays visibly empty | R14a, C1 (catalogue cards = records, empty slots = capacity − records) |
| Case J-card | `title` + `statusLabel` only | ADR-014: the provisional-cover label lives in the DOM, not on the physical case |
| Computer panel | the same `games` record the page renders, as DOM text in the Vue island | R1c, R17 (identical title/status/summary/size figures on four pages plus the room) |
| Pinned papers | `content.js` paragraphs, cloned from the page's own HTML | P-series |
| Shelf geometry | not hard-coded to any game — no featured-game special case | M8 §6.4 |

## 6. Provenance and placeholder register

Every piece of published content is one of three things, and the site says which:

| Kind | Content | Label shown |
| --- | --- | --- |
| Studio-supplied | the game's design and handoff documents, both Godot exports, the 22 guide steps, the record's own prose | none needed |
| Measured by this project | the three frames, binary sizes, hashes, entry counts | "captured from the EV-044 demo build itself…", one sentence for the whole set (`mediaProvenance`) |
| Not supplied | name finalisation, biography, logo, email, location, accounts, release date, itch.io URL, rating, playtime, save behaviour, music credit | `gap` markers in the letter, the game page's *Not supplied yet* list, `studio.nameMarker` |

Provisional artwork is labelled wherever it appears — the catalogue card, the game page, the monitor
panel — because a caption that only describes what a frame shows lets a reader assume it was made to
be shown (M8 §5.3, §19).

## 7. Persistence

The same records project into MySQL through `server/seed.js`; the seed is idempotent, prunes a
superseded game row, retires an offering that leaves the records rather than deleting it, and never
touches order history. That is `tests/database-seed.test.mjs` S1–S4 and `docs/commerce.md`; the content
modules above are the only input, so a published page and a queried row cannot tell different stories.

## 8. What enforces this

| Check | Asserts |
| --- | --- |
| `npm run test:metadata` (12) | every derived title/description/OG/JSON-LD matches the records; withheld properties stay withheld; image sizes equal the PNG headers |
| `npm run test:assets` (8) | the pipeline's palette pass never changes a pixel's meaning; published sizes equal measured sizes |
| `npm run game:check` | staged binaries, archive contents and hashes equal the committed record |
| R11 (8×) | each route has its own title, description, `lang` and `h1` |
| R25 | the name reaches all eight pages with exactly one record-derived provisional marker, the letter's labelled blanks render, and no route carries unedited placeholder copy |
| R14a/R14b | provisional cover labelled, captured frames labelled, no unfilled slot presented as a product |
| R16a/R16b | section order and every prose sentence exactly once |
| R17 | title, status, summary and both measured sizes identical across four pages plus the room panel |
| R18/R19 | JSON-LD parses and equals the modules; no origin, no unconfirmed property |
| R20/R21/R22 | WCAG 2.2 AA contrast, 24 px targets and no horizontal overflow on 9 surfaces × 2 widths |
| P-series (8) | the papers open readable, and the room's copy equals the page's copy |
| C1 | catalogue cards = records; empty slots = capacity − records |
