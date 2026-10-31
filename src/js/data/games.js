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
 * hand-typed numbers. Fields the studio has still not supplied stay marked PLACEHOLDER.
 */

import { gameBuilds } from './builds.js'

export const PLACEHOLDER = '[PLACEHOLDER — replace]'

export const studio = {
  name: PLACEHOLDER,
  nameIsSettled: false,
  tagline: PLACEHOLDER,
}

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
    genre: 'Deduction',
    summary: 'A small experimental deduction game about contradictions, evidence, and the limits of certainty.',
    description: [
      'You are auditing one questionable transfer of a sealed evidence box. The official explanation is simple — the box was moved temporarily for preservation — while other records raise a different question. Your job is to work out what the surviving records actually establish, and to keep documented facts, reasonable inferences and unsupported accusations apart.',
      'The game is a user interface rather than a world: an archive terminal where you read records, compare claims, place items on an evidence board and finally write the finding. There is no combat, no explorable 3D space and no procedurally generated content, and the puzzle rules are meant to stay inferable from the evidence in front of you.',
      'The build on this site is the EV-044 case: five stages, eight records and a guided investigation that names the next task, points at the control that performs it and can be switched off at any time. A shorter first case, "The Unopened Door", exists in the same project, but the exported demo starts on EV-044.',
      'It is a demo, not a finished release. The developer notes that created this build record that no unassisted first-time player has tested it end to end yet, so length and clarity are still unverified.',
    ],
    features: [
      'Five-stage audit: the assignment, the sealed box, the money trail, authorisation and the finding, then the empty shift.',
      'Eight records to read, compare and cross-reference; sealed ones have to be retrieved before they can be examined.',
      'A guided investigation of 22 steps with three hints each and a first-run tour of the workstation, all switchable.',
      'An evidence board that separates facts, inferences, open questions and connections, plus a timeline and a journal.',
      'Adjustable text size, background music with an on/off toggle, and a stored choice for both.',
      'Playable in a browser through WebAssembly, or downloadable as a Windows 64-bit build.',
    ],
    cover: {
      url: '/game/screenshots/the-last-witness-evidence-register.png',
      alt: 'The Last Witness evidence register: a dark green-on-black terminal listing case records beside a guided task card and case notes panel.',
    },
    screenshots: [
      {
        url: '/game/screenshots/the-last-witness-briefing.png',
        alt: 'The EV-044 assignment briefing text on an archive terminal, above a bounded question.',
        caption: 'The opening briefing states the official explanation and the question you have to answer.',
      },
      {
        url: '/game/screenshots/the-last-witness-case-stage-1.png',
        alt: 'The EV-044 workstation: case file, current objective, case notes and a first-run orientation card.',
        caption: 'Stage 1 with the first-run tour open; case notes repeat the current task so the screens cannot disagree.',
      },
      {
        url: '/game/screenshots/the-last-witness-evidence-register.png',
        alt: 'The evidence register listing records, some sealed, next to the guided task card and case notes.',
        caption: 'The evidence register: records are read here and opened in the centre workspace.',
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
  },
]

export const gameById = (id) => games.find((game) => game.id === id) ?? null

export const availabilityLabels = (game) => ({
  playable: game.availability.browserDemo.available,
  downloadable: game.availability.download.available,
  upcoming: game.status === 'in-development' || game.status === 'upcoming',
})
