# Development roadmap

Adopted 4 November 2026. One principle governs every milestone below: **a major delivery leaves the
project complete, integrated and demonstrably working** — not half-built, not behind a flag, not
"works on my machine" without evidence. Each milestone therefore ends with before/after proof, a
regression matrix re-run on the shipped build, and its own limitations written down *before* the next
milestone starts.

Working in large integrated milestones is the deliberate choice: small per-feature changes make the
result inconsistent and make the Unit 13 evidence hard to assemble at the end. Each milestone is
briefed with internal stages, executed end to end, and reviewed as one result rather than asking for
approval after every feature.

Milestone numbers are labels, not promises of scope. The work originally briefed as "M7 — real game
builds" was renumbered **M6b** so that M7 could mean the visual milestone; the evidence filenames in
[docs/evidence](evidence/README.md) follow that decision.

## M7 — Visual refinement · **delivered 31 October 2026, not yet reviewed**

Room geometry, lighting, materials, textures, game cases, the computer, papers and atmosphere.

- Scope actually taken: 100 mm walls with a door and window reveal, a north accent wall, skirting, a
  shelf carcass with back board and strip fitting, physical 26 mm game cases, a rebuilt chair, desk
  props and cables, six procedural material families, a seven-light rig with static shadows and ACES
  exposure, and papers that read as pinned documents.
- Contracts deliberately untouched: every collision box, station pose, `COMPUTER_ORIGIN`,
  `SCREEN_SIZE`, the DOM computer interface, room lazy loading, and all routes, server, database and
  checkout code.
- Evidence: [docs/art-direction.md](art-direction.md) (stages A–G, measured before/after, departures,
  regressions, limitations, files changed, asset list) and the `m7-*` set in
  [docs/evidence/README.md](evidence/README.md).
- Gate for M8: review the before/after pairs, and accept or reject the four documented compromises in
  §11 — dim shelf interior, the strip as the brightest pixel, the dark ceiling, and the entry pose
  being the shelf pose.

## M8 — Game content and studio identity · **next**

Final game artwork, screenshots, descriptions, branding, studio introduction and project information.

- **Blocked on input, not on code.** The studio owner must supply the items listed in
  [docs/open-requirements.md](open-requirements.md#content-the-studio-owner-must-supply): final studio
  name, biography and letter text, promotional artwork (the three frames now published were captured
  during integration, not supplied), the itch.io address, a release date or an explicit "none", and a
  release-mode web export if the debug export is not what should ship.
- Nothing is invented to fill a gap. Until a studio name arrives, the site keeps saying "STUDIO NAME
  NOT FINAL" and the room stays unbranded; until artwork arrives, the three shelf positions stay
  blank cases.
- In scope if the inputs arrive: brand the room (a poster, a mark on the desk, spine colourway),
  replace captured media with supplied media, publish real descriptions, and make the studio letter
  real rather than a marked placeholder.
- Out of scope: new commerce features, new games that do not exist, any claim about player reception.

## M9 — Deployment and final technical testing

Hosting, domain, HTTPS, security, database deployment, cross-browser testing, performance and
accessibility.

- **Needs a decision before money is spent.** The standing instruction is not to purchase a domain,
  rent a VPS or commit to paid infrastructure without approval, and tutor question 5 asks whether a
  local/LAN demonstration is acceptable evidence. Resolve that first, then treat hosting as a real
  milestone rather than a formality.
- Still-open technical items that belong here: Firefox and Safari, physical handsets, a real
  screen-reader session, reverse-proxy compression and immutable caching of hashed assets, managed
  database backups with off-machine retention, populated-schema migration, rate limiting, monitoring,
  and a release-mode game export measured over a throttled connection.
- Real payments stay disabled unless separately approved, and no price or total may ever be decided
  by the browser.

## M10 — Unit 13 submission preparation

Assessment evidence, test results, technical justification, report corrections, Harvard references and
final submission checks.

- Part 2 of the assignment brief has still not been supplied. It is reconciled here, not assumed
  earlier; if it changes the requirements, that change is documented as a departure rather than
  quietly absorbed.
- The report is 1,500–2,000 words, so every claim it makes must already be traceable to a file in
  [docs/evidence](evidence/README.md) or an ADR in [docs/decisions](decisions/). The evidence index is
  written to be citable; M10 mostly selects from it rather than creating new proof.
- Harvard references cover third-party assets and dependencies: the Godot exports, the font licences
  travelling with the Windows archive, Three.js, and the reference site that informed — but was not
  copied — the room.

## Future — full indie game studio

Expand beyond coursework: additional real titles, releases, creator support with actual terms, and a
larger studio presence.

- Deliberately after M10. The Unit 13 assignment is the immediate priority, and this phase is where
  the platform's design decisions get tested against real breadth rather than one game and three
  empty slots.
