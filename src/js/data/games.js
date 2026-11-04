/**
 * Single source of truth for every game the studio presents.
 *
 * Games describe the creative work only. Prices and acquisition options live in offerings.js,
 * because one game can be free in one place and supported through another without becoming two
 * competing products. This module is plain data so Vite, browser code and the Node server can all
 * import exactly the same records.
 *
 * The Last Witness record is written from the material the studio supplied: its Godot project
 * settings, its own design/handoff documents and the two exported builds staged by
 * npm run game:stage. File sizes and hashes come from the generated builds record, never from
 * hand-typed numbers.
 *
 * Metadata structure (M8 §4.4). Confirmed fields are the only ones any page may render as a value.
 * `notSupplied` inside each record names what the studio has not provided; those fields are absent
 * rather than guessed, and the game page states them as unknown. The studio's own identity lives in
 * `studio.js`, not here, so a game record cannot carry brand facts.
 */

import { gameBuilds } from './builds.js'

export const shelf = {
  // Only games.length positions are occupied; empty positions are not announced products.
  capacity: 4,
}

const mib = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`

export const games = [
  {
    id: 'the-last-witness',
    slug: 'the-last-witness',
    slot: 0,
    title: 'The Last Witness',
    status: 'demo',
    statusLabel: 'Playable demo',
    /**
     * What the status actually means to a visitor, in the developer's own terms. `statusLabel` is the
     * badge; this is the sentence a reader needs to judge the badge, and it is the reason the panel
     * and the game page can state "demo" without implying a finished product.
     */
    statusDetail: 'A demonstrable build of one case, not a released game. The developer states that no '
      + 'unassisted first-time player has tested it end to end, so its length and clarity are unverified.',
    genre: 'Deduction',
    /** Derived from the staged exports rather than typed: a browser build and a Windows build exist. */
    platforms: ['Browser (WebAssembly)', gameBuilds.desktop.platform],
    /** No release date has been supplied, so none is rendered anywhere. */
    releaseDate: null,
    summary: 'A small experimental deduction game about contradictions, evidence, and the limits of certainty.',
    /**
     * The prose, split by what each paragraph is *about* rather than stored as one block, because
     * M8 §8 asks the game page for a fixed section order (overview, gameplay, experience, features,
     * availability, status) and a single `description` array cannot answer that question. These are
     * the same sentences derived from the studio's design and handoff documents in M7: splitting them
     * moves text, it does not add a claim. `tests/e2e/routes.mjs` R16a and R16b check the heading
     * order and that every one of these sentences reaches the page exactly once. There is no `status`
     * key because `statusDetail` already is that paragraph, and a second copy of it on the same page
     * would be two sentences to keep in step rather than two facts.
     */
    prose: {
      overview: [
        'You are auditing one questionable transfer of a sealed evidence box. The official explanation is simple — the box was moved temporarily for preservation — while other records raise a different question. Your job is to work out what the surviving records actually establish, and to keep documented facts, reasonable inferences and unsupported accusations apart.',
      ],
      gameplay: [
        'The build on this site is the EV-044 case: five stages, eight records and a guided investigation that names the next task, points at the control that performs it and can be switched off at any time. A shorter first case, "The Unopened Door", exists in the same project, but the exported demo starts on EV-044.',
      ],
      experience: [
        'The game is a user interface rather than a world: an archive terminal where you read records, compare claims, place items on an evidence board and finally write the finding. There is no combat, no explorable 3D space and no procedurally generated content, and the puzzle rules are meant to stay inferable from the evidence in front of you.',
      ],
    },
    features: [
      // Five named items, matching the five step groups verified in tests/test-plan.md row D26
      // (GUIDE_STEPS: 4 + 5 + 5 + 4 + 4). The clause that used to end this bullet named a sixth
      // stage the count does not support, so it is gone rather than renumbered.
      'Five-stage audit: the assignment, the sealed box, the money trail, authorisation and the finding.',
      'Eight records to read, compare and cross-reference; sealed ones have to be retrieved before they can be examined.',
      'A guided investigation of 22 steps with three hints each and a first-run tour of the workstation, all switchable.',
      'An evidence board that separates facts, inferences, open questions and connections, plus a timeline and a journal.',
      'Adjustable text size, background music with an on/off toggle, and a stored choice for both.',
      'Playable in a browser through WebAssembly, or downloadable as a Windows 64-bit build.',
    ],
    /**
     * There is no dedicated cover artwork. This is a real frame from the real build — not invented
     * art — but it was chosen as a stand-in, so it is labelled provisional and its provenance is
     * stated wherever it is shown (M8 §5.3). The `provenance` string, not a caption, is what the game
     * page, the catalogue card and the computer panel render, so those three cannot disagree about
     * what the image is. The physical case in the room prints the title and status only; ADR-014
     * records why the label is not stamped on it.
     *
     * `width` and `height` are read from the PNG itself and are what the `<img>` attributes are built
     * from, so the page cannot claim a size the file does not have. `shareApproved` is the studio's
     * decision on whether this frame may be the picture a shared link shows; it is `false` because
     * that approval has not been given, and `metadata.js` withholds `og:image` until it is (M8 §11.3).
     */
    cover: {
      url: '/game/screenshots/the-last-witness-evidence-register.png',
      alt: 'The Last Witness evidence register: a dark green-on-black terminal listing case records beside a guided task card and case notes panel.',
      width: 1280,
      height: 800,
      provisional: true,
      shareApproved: false,
      provenance: 'Provisional cover: a frame captured from the EV-044 demo build itself. Dedicated cover artwork has not been supplied.',
    },
    /**
     * The cover's own `provenance` labels one image. This labels the whole set, because a caption
     * that only describes what a frame shows lets a reader assume it was made to be shown. These
     * frames were captured off the running build during integration, which is a different thing from
     * supplied press artwork and has to be said out loud (M8 §19, M8 §5.3).
     */
    mediaProvenance: 'Every frame in this section was captured from the browser build of the demo while it was '
      + 'integrated into this site. They show the game as it currently runs; none of them is supplied '
      + 'promotional artwork.',
    /**
     * The dimensions are the PNG's own, not the layout's: `tests/metadata.test.mjs` reads each file's
     * header and fails if a record disagrees, because an `<img>` whose stated size is wrong reserves
     * the wrong space before the picture arrives.
     */
    screenshots: [
      {
        url: '/game/screenshots/the-last-witness-briefing.png',
        alt: 'The EV-044 assignment briefing text on an archive terminal, above a bounded question.',
        caption: 'The opening briefing states the official explanation and the question you have to answer.',
        width: 1280,
        height: 800,
      },
      {
        url: '/game/screenshots/the-last-witness-case-stage-1.png',
        alt: 'The EV-044 workstation: case file, current objective, case notes and a first-run orientation card.',
        caption: 'Stage 1 with the first-run tour open; case notes repeat the current task so the screens cannot disagree.',
        width: 1280,
        height: 800,
      },
      {
        url: '/game/screenshots/the-last-witness-evidence-register.png',
        alt: 'The evidence register listing records, some sealed, next to the guided task card and case notes.',
        caption: 'The evidence register: records are read here and opened in the centre workspace.',
        width: 1280,
        height: 800,
      },
    ],
    page: '/games/the-last-witness/',
    playPage: gameBuilds.web.playPage,
    builds: gameBuilds,
    availability: {
      details: { available: true },
      browserDemo: {
        available: true,
        url: gameBuilds.web.playPage,
        reason: null,
        bytes: gameBuilds.web.bytes,
        sizeLabel: mib(gameBuilds.web.bytes),
        note: `The browser build downloads ${mib(gameBuilds.web.bytes)} of WebAssembly and game data before the first frame, and needs WebGL 2.`,
      },
      download: {
        available: true,
        url: gameBuilds.desktop.servedAt,
        reason: null,
        bytes: gameBuilds.desktop.archiveBytes,
        sizeLabel: mib(gameBuilds.desktop.archiveBytes),
        platform: gameBuilds.desktop.platform,
        note: `Windows 64-bit build, ${mib(gameBuilds.desktop.archiveBytes)} compressed. Nothing is installed and no payment is required.`,
      },
      itch: {
        available: false,
        url: null,
        reason: 'The itch.io page address has not been supplied yet.',
      },
    },
    /**
     * M8 §4.2 and §4.3: the questions a visitor would reasonably ask that have no answer yet. The
     * game page prints this list under its own heading, because a reader who cannot tell a deliberate
     * omission from an oversight has no way to judge how much of the page to trust. Nothing here is
     * rendered as a value anywhere else, and the list is what §16's content check compares against.
     */
    notSupplied: [
      'a release date, or whether one is planned',
      'how long the demo takes to finish',
      'an age rating or content advisory',
      'languages other than the one the demo is written in',
      'how progress is saved, beyond the text-size and music choices the settings remember',
      'a named credit for the music and sound',
      'a dedicated cover image',
      'an itch.io page address',
    ],
  },
]

export const gameById = (id) => games.find((game) => game.id === id) ?? null

export const availabilityLabels = (game) => ({
  playable: game.availability.browserDemo.available,
  downloadable: game.availability.download.available,
  upcoming: game.status === 'in-development' || game.status === 'upcoming',
})
