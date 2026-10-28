# ADR-007 — Wall papers are geometry; the words are a native dialog

**Status:** accepted (Milestone 4)

## Context

The 2026-10-28 direction asks for studio information carried by physical notes pinned to the room's
walls, where selecting a note opens "a larger, readable HTML view" and closing it returns the
visitor to the room without losing position or selection. Two constraints from earlier decisions
narrow the design: no game information may be rendered as geometry or baked into a texture, because
text has to stay readable by a screen reader, translatable and responsive (ADR-003, PROJECT
DECISIONS ADDENDUM v0.2 §3); and the studio letter already exists in `index.html` as real HTML, so
a second copy of it would be a second source of truth that can drift.

## Decision

- The paper **object** is geometry, the paper **text** is not. `src/js/objects/notes.js` builds a
  `PlaneGeometry` sheet plus a small tape box on each, carries `userData.interactId`, and nothing
  else. The sheets are grey rectangles with no words on them.
- Each sheet gets a DOM focus-proxy chip like every other interactive object, so keyboard,
  screen-reader and hover paths are the ones already built in Milestone 1 — no new input mechanism.
- The readable view is one native `<dialog id="paper-view">` opened with `showModal()`. Its content
  is a **clone** of markup that already exists in the page: the studio letter's `.paper` for the
  wall letter, and `<template id="note-how-to">` for the instruction note. Cloned nodes are
  discarded on close; the page's own copy is never moved, so the section below the fold, the
  no-JS view and the crawler-visible copy all stay intact.
- Paragraphs that only make sense on the flat page are marked `data-note-exclude` and stripped from
  the clone, so one source can serve both presentations without either showing the other's text.
- The close control is a `<form method="dialog">` submit rather than a click handler, and focus is
  returned to the chip that opened the note **explicitly** in `createPaperView`, because Chromium
  leaves focus on the close button of a closed dialog.
- While the dialog is open, movement keys are released and pointer picking is disabled. The camera
  is not stopped, paused or re-homed — it simply receives no input, which is what makes "closing
  returns you to exactly where you were" a property of the design rather than a restore routine.

## Consequences

- One mechanism serves both notes, and adding a third paper costs one entry in `notes.js`, one in
  `proxyEntries` and one key in `sources`. Nothing about the dialog changes.
- `<dialog>` supplies the focus trap, Escape-to-close and top-layer stacking for free, which removes
  the custom modal code that a hand-rolled overlay would have needed — at the cost of relying on a
  feature that is untested outside Chromium (B5).
- The room's own state is provably untouched by reading: P3 measures camera pose drift across an
  open/close cycle at 0.0000, and P5 measures movement frozen while a note is open and 0.578 m of
  travel restored after closing, with the selection intact.
- Duplicate headings are accepted: the dialog bar and the cloned sheet both say "A note from the
  studio". Removing either would mean special-casing the clone; it reads as a titled document and
  is a cosmetic item for the later visual pass.
