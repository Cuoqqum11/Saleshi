# ADR-014 — The provisional-cover label lives in the DOM, not on the printed case

**Status:** accepted (Milestone 8)

## Context

M8 §5.3 allows a stand-in cover image but requires it to be labelled as provisional. The only artwork
the studio has supplied is a frame captured from the demo build itself, so `games.js` carries
`cover.provisional: true` and a `cover.provenance` sentence, and that sentence is rendered by the game
page, the catalogue card and the room's computer panel.

The physical cassette is a fourth surface. `coverCardCanvas()` composites the same frame with the
record's title and status onto the J-card, and `cassette.js` puts that canvas on the case front. The
question is whether the word "provisional" has to appear there too.

Two earlier constraints pull against stamping it. M8 §3.3 and ADR-007 keep readable words out of
textures, because text baked into a canvas cannot be read by a screen reader, cannot be translated,
cannot be resized with the visitor's font settings and cannot be selected — the reason the room's
letters and monitor are DOM dialogs over geometry. And the card is 0.129 × 0.184 m in world space:
from the shelf station the title occupies a few tens of pixels of height, which is already the smallest
type that stays legible. A provenance sentence at that scale is either illegible or it dominates the
artwork it is meant to qualify.

## Decision

- The label is **not** printed on the case. The J-card shows the captured frame, the status line and
  the title, and nothing else. All three are genuine values from the game record.
- The label is stated in DOM wherever the same image is presented as information: the game page figure,
  the catalogue card and the monitor panel `figcaption` (`src/js/ui/monitorPanel.vue`), each driven by
  `cover.provisional` / `cover.provenance` rather than by hand-written copy.
- The screenshot gallery gets its own set-level statement, `games.js` `mediaProvenance`, because a
  caption that only describes what a frame shows lets a reader assume the frame was made to be shown.
  It is rendered by the same build-time template as everything else, so it is in the DOM of a
  no-JS visitor too.
- Nothing about the case changes when the artwork is replaced. Supplying real cover art means setting
  `cover.provisional: false`, rewriting `cover.provenance` and pointing `cover.url` at the new file;
  the marker disappears from all three DOM surfaces at once and the card redraws from the same record.

## Consequences

- A visitor who only ever stands in the room and looks at the shelf sees packaging that is
  indistinguishable from real cover art. That is the accepted cost, and it is bounded: the same visitor
  reaches the label the moment they select the case, because selection opens the panel that carries the
  `figcaption`, and the shelf chip itself names the game rather than the tape.
- The claim is testable rather than argued. `tests/e2e/routes.mjs` compares the rendered label on each
  surface against `games.js` itself rather than against a copy of the sentence: R1c reads the computer
  panel's `figcaption`, R14a the catalogue card and R14b the game page (which must also carry the
  gallery statement). A template edit that drops the label from any of them fails that check instead of
  quietly becoming an unlabelled stand-in. `tests/e2e/game-builds.mjs` B3b separately proves the served
  frames decode to the same pixels as the captured files.
- §5.3 is satisfied by the surface that carries information, not by every surface that carries pixels.
  If the assessment reads that narrowly, adding the word to `coverCardCanvas()` is a one-line change to
  the card layout and no change to the room — which is why this is recorded as a decision and not as a
  limitation.
