/**
 * Single source of truth for every game the studio presents.
 *
 * Games describe the creative work only. Prices and acquisition options live in offerings.js,
 * because one game can be free in one place and supported through another without becoming two
 * competing products. This module is plain data so Vite, browser code and the Node server can all
 * import exactly the same records.
 *
 * Everything marked PLACEHOLDER is waiting for real information from the studio. Invented titles,
 * genres, descriptions, artwork, reviews, ratings and dates are prohibited.
 */

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

export const games = [
  {
    id: 'placeholder-slug',
    slug: 'placeholder-slug',
    slot: 0,
    title: '[PLACEHOLDER] Untitled game',
    status: 'in-development',
    statusLabel: 'In development',
    genre: null,
    summary: 'PLACEHOLDER — a one-line description of the game has not been supplied.',
    description: [
      'PLACEHOLDER — the game premise and a longer description have not been supplied. Nothing is written here that has not been decided by the studio.',
    ],
    features: [],
    cover: null,
    screenshots: [],
    page: '/games/placeholder-slug/',
    availability: {
      details: { available: true },
      browserDemo: {
        available: false,
        url: null,
        reason: 'No browser build has been supplied yet.',
      },
      download: {
        available: false,
        url: null,
        reason: 'No downloadable build has been supplied yet.',
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
