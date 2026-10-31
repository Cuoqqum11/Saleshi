# ADR-012 — The demo loads on an explicit click, inside an unmodified iframe

**Status:** accepted (Milestone 6b)

## Context

The studio's web export is 38.8 MB across 9 files and needs WebAssembly, WebGL 2 and a secure
context. Embedding it the obvious way — an `<iframe>` in the page — downloads and starts a game the
visitor never asked to run, on a metered connection, before they have read what it costs. The export
is also a third-party artifact: it brings its own document, styles, canvas and keyboard handling, and
the project's rule is that the studio's build is not edited.

## Decision

The play page states the cost and the requirements **before** offering anything: the payload size,
the engine and security requirements, the fact that the interface is a dense 1280×800 text terminal,
and that the build is a debug export nobody has playtested. Only then does it enable a "load" action,
which creates an `<iframe>` pointing at the unmodified export (`src/js/pages/gameDemo.js`). A
capability probe (WebAssembly, `isSecureContext`, WebGL 2) runs first and, when it fails, the button
is never shown and the reason is stated alongside the download alternative. A stop button removes the
frame; the status line says plainly that the data stays in the browser cache.

Nothing about the export is patched: `index.html` is a byte-identical copy of the engine's own entry
file so the folder has a directory index, and `npm run game:check` hashes every served file against
the studio's export folder.

## Consequences

- Zero requests under `/game/web/` occur before the click, which `B6` measures rather than assumes.
- `B7` measures the real thing: the frame reaches a rendered 1150×718 canvas 1.8–2.9 s after the
  click on loopback. That is the first frame, not a playable-through demo, and the site does not
  claim otherwise.
- The iframe boundary keeps the game's CSS and focus model out of the site's, at the cost of a
  separate focus step: the visitor must click inside the frame to give it the keyboard, which the
  status line tells them.
- Stopping frees the frame but not the HTTP cache, so "load again" is faster. The page says so
  instead of implying the 38.8 MB was reclaimed.
- The requirement for a secure context means the demo cannot be demonstrated from a plain-HTTP
  network address; only `localhost` and `https` work, which is recorded in the deployment options.
