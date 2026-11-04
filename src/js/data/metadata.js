/**
 * Public-facing metadata, generated from the same records every page renders from (M8 §11).
 *
 * Two rules shape this module.
 *
 * 1. It emits a property only when a record confirms its value. There is no `logo`, `email`,
 *    `address`, `sameAs`, `aggregateRating`, `offers`, review count or download count, because the
 *    studio has supplied no mark, no contact address and no account, has published no figures, and
 *    its checkout is a simulation that takes no payment. A search engine reads an invented identifier
 *    as a claim about a real commercial identity, which is exactly what M8 §2.3 and §9 forbid.
 * 2. Every URL here is a *path*, never an origin, until M9 chooses a host. JSON-LD resolves a
 *    relative URL against the document that carries it, so `/games/the-last-witness/` is correct on
 *    whatever address the site eventually gets — while an absolute URL would have to be invented
 *    first, and inventing one is the thing §2.3 says not to do.
 *
 * `defined()` makes rule 1 structural rather than a comment: a property whose value is missing is
 * removed from the object, so an unconfirmed field cannot arrive as an empty string that a validator
 * then reads as an assertion. `absoluteHost()` is the counterpart for rule 2 — it is `null` while
 * `studio.web.canonicalBaseUrl` is `null`, and the two properties that genuinely require an absolute
 * URL (`og:url` and `og:image`) are not emitted at all until that one field is set. This module
 * therefore describes a hosted site without asserting one exists.
 */

import { games } from './games.js'
import { studio } from './studio.js'

function defined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) =>
    value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)))
}

/** The configured host, or `null` while the site is only ever served from an address it does not know. */
export function absoluteHost() {
  const base = studio.web.canonicalBaseUrl
  return base ? String(base).replace(/\/+$/, '') : null
}

/** A URL for a structured-data property: absolute once a host is configured, a path until then. */
export function documentUrl(path) {
  const host = absoluteHost()
  return host ? `${host}${path}` : path
}

export function organizationJsonLd() {
  return defined({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: studio.name,
    description: studio.summary,
    url: documentUrl('/'),
  })
}

export function webSiteJsonLd() {
  return defined({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: studio.name,
    description: studio.summary,
    url: documentUrl('/'),
  })
}

/** The catalogue as the list it is: one entry per game record, in shelf order. */
export function catalogueJsonLd() {
  return defined({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: games.length,
    itemListElement: games
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((game, index) => defined({
        '@type': 'ListItem',
        position: index + 1,
        name: game.title,
        url: documentUrl(game.page),
      })),
  })
}

/**
 * The game itself. `isAccessibleForFree` is true because both routes really are free to obtain — the
 * voluntary contribution buys nothing (see `offerings.js`), which is also why no `offers` is emitted:
 * an `Offer` would advertise a product the site says does not exist. No `datePublished` either,
 * because the record says a release date has not been supplied.
 */
export function gameJsonLd(game) {
  if (!game) return null
  return defined({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.summary,
    url: documentUrl(game.page),
    genre: game.genre ?? null,
    gamePlatform: game.platforms ?? [],
    isAccessibleForFree: true,
    downloadUrl: game.availability.download.available ? documentUrl(game.availability.download.url) : null,
    creator: defined({ '@type': 'Organization', name: studio.name, url: documentUrl('/') }),
  })
}

/**
 * JSON-LD as it is safe to put inside an HTML document. `<`, `>` and `&` become unicode escapes so
 * nothing in a value can close the script element it lives in, even though every value here comes
 * from a committed record rather than from a visitor.
 */
export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
}

/**
 * The sharing block for one route, as `[property, value]` pairs — the caller renders the tags, so
 * this module stays free of markup.
 *
 * `og:title` and `og:description` are deliberately *not* stored here. The build reads them out of the
 * `<head>` it is about to emit, so a social preview cannot claim a title or a description the page
 * itself does not show. Two things are omitted on purpose:
 *
 * - `og:url` and `og:image` require an absolute URL. The host is decided in M9, so `absoluteHost()`
 *   is `null` and neither tag exists yet.
 * - `twitter:card` is left out entirely. Twitter's summary cards require `twitter:image`, and a card
 *   declared without its required image is a broken preview rather than an honest absence.
 *
 * `og:image` additionally waits for the studio's approval of the captured frames as published
 * artwork (M8 §11.3 asks for *approved* images; §19 forbids a stand-in that could be mistaken for
 * supplied material). `cover.shareApproved` is that decision in data form, so both conditions are one
 * field each rather than a code change.
 */
export function socialTags({ path, title, description, image = null }) {
  const tags = [
    ['og:type', 'website'],
    ['og:site_name', studio.name],
    ['og:title', title],
    ['og:description', description],
  ]
  const host = absoluteHost()
  if (host) tags.push(['og:url', `${host}${path}`])
  if (host && image?.shareApproved) {
    tags.push(
      ['og:image', `${host}${image.url}`],
      ['og:image:alt', image.alt],
      ['og:image:width', String(image.width)],
      ['og:image:height', String(image.height)],
    )
  }
  return tags
}
