/**
 * Single source of truth for every game the studio presents.
 *
 * The shelf, the computer screen, the game pages, the conventional fallback list
 * and (from Phase 7) the store all read this record, so a new project is added by
 * adding data plus asset files — never by editing the room.
 *
 * Everything marked PLACEHOLDER is waiting for real information from the studio.
 * Invented titles, genres, descriptions, screenshots and dates are prohibited.
 */

export const PLACEHOLDER = '[PLACEHOLDER — replace]'

export const studio = {
  name: PLACEHOLDER,
  nameIsSettled: false,
  tagline: PLACEHOLDER,
  intro: [
    'PLACEHOLDER — this letter introduces the studio and explains what a visitor can do here.',
    'PLACEHOLDER — the studio name, biography and history have not been supplied, so nothing is invented.',
  ],
}

export const shelf = {
  // Physical positions on the shelf. Only `games.length` are occupied; the rest
  // render as visibly empty slots and must never read as announced products.
  capacity: 4,
}

export const games = [
  {
    id: 'placeholder-slug',
    slot: 0,
    title: `[PLACEHOLDER] ${'Untitled game'}`,
    status: 'in-development',
    statusLabel: 'In development',
    genre: null,
    summary: `PLACEHOLDER — a one-line description of the game has not been supplied. ${PLACEHOLDER}`,
    cover: null,
    screenshots: [],
    page: '/games/placeholder-slug/',
    availability: {
      browserDemo: { available: false, reason: 'No browser build has been supplied yet.' },
      download: { available: false, reason: 'No downloadable build has been supplied yet.' },
      details: { available: true },
    },
    // One game, several acquisition routes: a `game` never carries a single price.
    // Currency and contribution amounts are deliberately open (see tutor question Q3).
    offerings: [
      {
        id: 'itch-free',
        kind: 'external-free',
        label: 'Get the free version on itch.io',
        channel: 'itch.io',
        url: null,
        available: false,
        reason: 'The itch.io page address has not been supplied yet.',
      },
      {
        id: 'support',
        kind: 'pay-what-you-want',
        label: 'Support the studio on this website',
        currency: null,
        minimum: null,
        suggested: null,
        maximum: null,
        available: false,
        reason:
          'Pay-what-you-want amounts are undecided, and the tutor has not yet confirmed this satisfies the assignment sales requirement.',
      },
    ],
  },
]

export const gameById = (id) => games.find((game) => game.id === id) ?? null
