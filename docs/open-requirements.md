# Open requirements and unresolved questions

Status: current as of Milestone 3 (room as the entry experience). Nothing below blocks the code
that exists today; each item blocks a specific later phase.

## 1. Assignment brief, Part 2

Part 2 of the Unit 13 brief had not been issued when Milestone 1 was built. The work so far is
based on Part 1 plus the confirmed project decisions (v0.2). When Part 2 arrives it needs to be
reconciled against:

| Area | What Milestone 1 already assumes | Risk if Part 2 differs |
| --- | --- | --- |
| Page set | room page + one game page | New required pages (e.g. contact, basket) mean new routes |
| Sales flow | pay-what-you-want offering modelled, not implemented | A mandated "add to basket → checkout" flow changes the data model |
| Back end | none yet, by plan | M1/M3 evidence depends on a real server + database existing |
| Hosting | not chosen, see `docs/deployment-options.md` | P2 evidence needs a live URL |

## 2. Questions for the tutor

These are the only blockers on the commercial side of the project. They are asked in this form
because the assignment specifies a *sales website* while the intended distribution model is
free-first.

1. **Product category.** Game studios are not one of the listed approved business categories. Is
   an indie game studio acceptable as the site's subject, or must the "product" be reframed (for
   example as software licences sold directly by the developer)?
2. **Is a pay-what-you-want offering a sale?** The plan is one free itch.io link plus an optional
   contribution on the studio's own site, with no premium edition and no invented benefits. Does
   that satisfy the sales-website requirement, or is a fixed price required?
3. **Simulated checkout.** If a real transaction is not expected, is a clearly labelled simulated
   checkout (server-side price recomputation, no card details collected) accepted as the
   demonstrable workflow?
4. **Back end depth.** M1 asks for two back-end frameworks. Is an Express + MySQL order/support
   flow sufficient, or is a second back-end framework expected?
5. **Live deployment.** Is a local/LAN demonstration acceptable for P2, or must the site be
   reachable on a public host at assessment?
6. **Game assets.** The featured game's build, screenshots and description have not been supplied.
   Placeholder content is marked as placeholder throughout. Is that acceptable for assessment, or
   must real content exist before submission?

## 3. Content the studio owner still has to supply

Deliberately not invented anywhere in the codebase:

- Studio name (the header currently reads "Saleshi — studio name not final").
- Studio biography and the body of the paper letter.
- Game title, description, genre, cover artwork, screenshots.
- itch.io page URL for the featured game.
- Currency, minimum / suggested / maximum amounts for the pay-what-you-want offering.
- Release date and status once known.

Each of these lives in `src/js/data/games.js` with `null` or a `PLACEHOLDER` string, and the
interface hides or explains anything marked unavailable.

## 4. Technical decisions still open

- **Free movement.** Resolved in Milestone 2: walk mode with axis-separated AABB collision lives
  in `cameraController.js` + `collision.js` behind the same controller interface, with stations
  retained as shortcuts and the reduced-motion alternative. See ADR-002 and `tests/test-plan.md`.
- **Room as entry.** Resolved in Milestone 3 as a layout change only; see ADR-006. Re-decided in
  Milestone 4: *which visitors* meet the room is now settled by WebGL capability, the browser's
  reduced-data request and an absolute usability floor instead of by viewport width, and walking is
  offered only where the keyboard exists. See ADR-008.
- **Shadows.** Switched off. Revisit only when the measured frame budget in a visible tab is
  known (see `tests/test-plan.md`, item B2).
- **Three.js bundle size.** 620 kB raw / 167 kB gzipped for the lazy room chunk (Milestone 4 build).
  Acceptable for a lazy-loaded centrepiece; the alternative (per-module imports or a smaller
  renderer) should be weighed against M2's performance argument before being done for its own sake.

## 5. Roadmap from the 2026-10-26 direction

The owner's updated design direction keeps the room as the main interface and defers visual polish.
Planned order, each milestone tested before the next:

1. ~~**Physical notes and papers (M4).**~~ **Delivered 2026-10-28.** Two papers are pinned to the
   walls — the studio introduction on the west wall, a short instruction note on the north wall —
   each with a focus-proxy chip, each opening the same readable `<dialog>` view in real HTML cloned
   from `index.html`. Geometry stayed grey-box: the sheets are blank rectangles, because words as
   texture would not be readable by a screen reader. See ADR-007 and the Milestone 4 section of
   `tests/test-plan.md`.
2. **Panel richness (M5).** Screenshots and per-game status on the computer panel, driven only by
   data in `src/js/data/games.js`; actions appear only when genuinely available. Also carries D11:
   at the desk station the anchored panel covers the computer chip, so that control is keyboard-only
   until the panel and the chips stop colliding.
3. **Catalogue, cart and checkout in-room (M6).** The assignment's sales flow, presented in a way
   that fits the room (computer as the till) with list-page parity, server-side price validation
   and **no real payment processing** until separately approved. Simulated checkout only.
4. **Visual pass (M7).** Modelling, lighting and textures — explicitly postponed until interaction
   and navigation are proven. On-screen movement for coarse-pointer devices belongs here, since
   that is the point at which walking stops being keyboard-only (ADR-008).
