import { games, gameById, shelf } from '../src/js/data/games.js'
import { offeringsForGame } from '../src/js/data/offerings.js'
import { identityIsProvisional, studio } from '../src/js/data/studio.js'
import { howToNote, roomHints, studioLetter } from '../src/js/data/content.js'
import {
  catalogueJsonLd, gameJsonLd, organizationJsonLd, serializeJsonLd,
  socialTags, webSiteJsonLd,
} from '../src/js/data/metadata.js'

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

/**
 * The inverse, for text read back out of a document. Without it a head that says `&amp;` would be
 * copied into a new attribute as `&amp;amp;`, so the round trip is decode-then-encode rather than
 * encode-what-was-already-encoded. `&amp;` goes last for the same reason.
 */
const unesc = (value) => String(value)
  .replaceAll('&#39;', "'")
  .replaceAll('&quot;', '"')
  .replaceAll('&gt;', '>')
  .replaceAll('&lt;', '<')
  .replaceAll('&amp;', '&')

const money = (amount, currency) => `${currency} ${Number(amount).toFixed(2)}`

const bytes = (value) => (value >= 1048576
  ? `${(value / 1048576).toFixed(1)} MB`
  : `${Math.max(1, Math.round(value / 1024))} KB`)

const shortHash = (value) => `${value.slice(0, 16)}…`

/**
 * The brand link, assembled from `studio.js`. Eight pages used to hand-write the name and its
 * provisional marker; the marker is now a consequence of one boolean, so confirming the name cannot
 * leave a stale "not final" chip behind on the page someone forgot to edit.
 */
const brandHtml = () => `${esc(studio.name)}${identityIsProvisional
  ? ` <span class="placeholder-flag" data-provisional-identity>${esc(studio.nameMarker)}</span>`
  : ''}`

const tokens = {
  '{{STUDIO_NAME}}': () => esc(studio.name),
  '{{STUDIO_KIND}}': () => esc(studio.kind),
  '{{STUDIO_SUMMARY}}': () => esc(studio.summary),
  '{{STUDIO_BRAND}}': () => brandHtml(),
  '{{JSONLD_STUDIO}}': () => jsonLdTag(organizationJsonLd()),
  '{{JSONLD_WEBSITE}}': () => jsonLdTag(webSiteJsonLd()),
  '{{JSONLD_LIST}}': () => jsonLdTag(catalogueJsonLd()),
}

/**
 * One structured-data document, as it belongs in a `<head>` (M8 §11.4). The values come from
 * `metadata.js`, which only carries properties a record confirms, so nothing here can assert a
 * rating, a price, a release date or a contact address the studio has not supplied.
 */
function jsonLdTag(value) {
  return `<script type="application/ld+json">${serializeJsonLd(value)}</script>`
}

/**
 * The sharing block for the page being transformed. Its title and description are read out of the
 * document's own `<head>` rather than restated in a data module, because a social preview that
 * drifted from the page it linked to would be a claim the site does not support. `metadata.js`
 * decides which properties are emitted; this assembles the tags.
 */
function socialMetaTag(html, path, image) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]
  const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1]
  if (!title || !description) {
    throw new Error(`static-content: ${path} asks for {{SOCIAL_META}} without a title or description`)
  }
  const tags = socialTags({ path, title: unesc(title).trim(), description: unesc(description).trim(), image })
  return tags.map(([property, value]) => `<meta property="${esc(property)}" content="${esc(value)}" />`).join('\n    ')
}

/**
 * Badges are read off the availability flags instead of being typed per card, because a badge is a
 * promise: the catalogue may not advertise an action the game page then refuses to offer.
 */
function badgesFor(game) {
  const labels = [
    game.availability.browserDemo.available && 'Play in browser',
    game.availability.download.available && 'Desktop download',
    game.availability.itch.available && 'On itch.io',
  ].filter(Boolean)
  return labels.map((label) => `<span class="media-badge">${esc(label)}</span>`).join('')
}

/**
 * The two figures a reader can verify against the archive: the executable and the game data. This
 * used to name `The Last Witness.pck` in the display logic, which meant a second game would have
 * needed a code change to show its own files.
 */
function measuredMembers(game) {
  return game.builds.desktop.contents
    .filter((member) => /\.(exe|pck|dll|so|dylib|dat|data)$/i.test(member.name))
    .map((member) => `<code>${esc(member.name)}</code> SHA-256 <code>${esc(shortHash(member.sha256))}</code>`)
    .join(', ')
}

/** Same reason: the count of bundled licence files is a fact about the export, not about the page. */
function licenceNote(game) {
  const licensed = game.builds.desktop.contents.filter((member) => member.name.startsWith('LICENSE/'))
  if (!licensed.length) return ''
  return `The ${licensed.length} ${licensed.length === 1 ? 'licence file under' : 'licence files under'} <code>LICENSE/</code> ${licensed.length === 1 ? 'is' : 'are'} included because the licences require them to travel with any build that bundles the fonts.`
}

/**
 * The provisional-cover line. M8 §5.3 allows a stand-in cover but requires it to be labelled, and the
 * sentence lives on the record so the page, the computer panel and the shelf cannot each decide what
 * the image is.
 */
function coverNote(game) {
  if (!game.cover) {
    return '<p class="media-placeholder">No cover artwork has been supplied. A stand-in could be '
      + 'mistaken for real game art, so none is shown.</p>'
  }
  return game.cover.provisional
    ? `<p class="media-provenance">${esc(game.cover.provenance)}</p>`
    : ''
}

/**
 * §4.4: the questions with no answer, printed as a list. Omitting them silently would leave a reader
 * unable to tell "the studio has not said" from "there is nothing to say".
 */
function notSuppliedList(game) {
  if (!game.notSupplied?.length) return ''
  return `<section id="not-supplied" aria-labelledby="not-supplied-heading">
    <h2 id="not-supplied-heading">Not supplied yet</h2>
    <p>The studio has not provided this information, so it is not guessed anywhere on this page:</p>
    <ul>${game.notSupplied.map((item) => `<li>${esc(item)}.</li>`).join('')}</ul>
  </section>`
}

/**
 * The papers' whole markup language: `{name}` is the studio's name and `{kbd:…}` marks a key or a
 * control the reader has to press. Nothing else is interpreted, so a stray brace in prose cannot
 * damage a page, and no HTML is assembled by hand in the data module.
 */
function paperText(text) {
  return text.split(/(\{kbd:[^}]+\})/g).map((piece) => {
    const key = piece.match(/^\{kbd:([^}]+)\}$/)?.[1]
    return key ? `<kbd>${esc(key)}</kbd>` : esc(piece.replaceAll('{name}', studio.name))
  }).join('')
}

function paperParagraph(paragraph) {
  const attributes = paragraph.excludeFromPaper ? ' data-note-exclude' : ''
  if (paragraph.link) {
    return `<p${attributes}><a href="${esc(paragraph.link.to)}">${esc(paragraph.link.label)}</a></p>`
  }
  const marker = paragraph.gap
    ? ` <span class="placeholder-flag" data-paper-gap>${esc(paragraph.gap)}</span>`
    : ''
  return `<p${attributes}>${paperText(paragraph.text)}${marker}</p>`
}

function paperArticle(note, headingId) {
  return `<article class="paper">
    <h2${headingId ? ` id="${headingId}"` : ''}>${esc(note.heading)}</h2>
    ${note.paragraphs.map(paperParagraph).join('\n')}
  </article>`
}

/**
 * The room's instructional paragraphs. They exist as data because the same three sentences are read
 * by the static HTML, by `main.js` on touch devices and by the room's live announcements; keeping one
 * copy is what stops the page promising an "arrow button" that the room does not have.
 */
const hintElements = {
  launcher: { className: 'room-hint' },
  move: { className: 'room-hint', id: 'move-hint' },
}

function roomHint(key) {
  const element = hintElements[key]
  const text = roomHints[key]
  if (!element || !text) {
    return `<p class="unavailable-note">No instruction text is configured for “${esc(key)}”.</p>`
  }
  return `<p class="${element.className}"${element.id ? ` id="${esc(element.id)}"` : ''}>${esc(text)}</p>`
}

function availabilityNote(game) {
  const unavailable = []
  if (!game.availability.browserDemo.available) unavailable.push('no browser demo')
  if (!game.availability.download.available) unavailable.push('no download')
  if (!game.availability.itch.available) unavailable.push('no itch.io address')
  return unavailable.length
    ? `<p class="unavailable-note">Currently ${esc(unavailable.join(', '))}; these are not shown as working controls.</p>`
    : '<p>Play, download and distribution options are listed on the game page.</p>'
}

function gameCard(game) {
  return `<li class="game-card">
    <h3><a href="${esc(game.page)}">${esc(game.title)}</a></h3>
    <p><span class="status-badge">${esc(game.statusLabel)}</span>${badgesFor(game)}</p>
    <p>${esc(game.summary)}</p>
    ${game.cover ? `<img class="game-cover" src="${esc(game.cover.url)}" alt="${esc(game.cover.alt)}" width="${esc(game.cover.width)}" height="${esc(game.cover.height)}" loading="lazy" />${coverNote(game)}` : coverNote(game)}
    ${availabilityNote(game)}
    <p><a href="${esc(game.page)}">Read the full game details</a></p>
  </li>`
}

/**
 * A shelf position with no project in it. M8 §8 asks the catalogue to look deliberate rather than
 * short, and the room already shows these as empty slots; a dashed cell that says nothing is claimed
 * is the only honest way to show the same four positions here. It carries no title, no badge and no
 * link, because §19 forbids anything that could be read as an unannounced project.
 */
function emptySlotCard(slot) {
  return `<li class="game-card is-empty">
    <h3>Position ${slot + 1}</h3>
    <p>Empty. No project is announced for this position, so no title, date or artwork is shown for it.</p>
  </li>`
}

function gameList() {
  const cells = []
  for (let slot = 0; slot < shelf.capacity; slot += 1) {
    const game = games.find((entry) => entry.slot === slot)
    cells.push(game ? gameCard(game) : emptySlotCard(slot))
  }
  return `<ul class="game-list">${cells.join('')}</ul>
  <p class="empty-state">${games.length} of ${shelf.capacity} shelf positions hold a game. The rest are shown as empty on purpose: no additional titles, release dates or projects have been invented to fill them.</p>`
}

/**
 * The game page. M8 §8 fixes the order of the six information sections — overview, gameplay,
 * experience, features, availability, status — and the record's `prose` keys are what place each
 * sentence in one of them, so the page cannot quietly re-describe the game in a different section
 * than the data says it belongs to. Two sections sit outside that list because they are not game
 * information: "Not supplied yet" is the honesty apparatus (§4.4) and "Store and creator support"
 * points at offerings, which are a different record type.
 */
function gameDetails(game) {
  if (!game) return '<p class="unavailable-note">This game record does not exist.</p>'
  const gameOfferings = offeringsForGame(game.id)
  const paragraphs = (list) => (list ?? []).map((text) => `<p>${esc(text)}</p>`).join('')
  return `<header>
    <h1>${esc(game.title)}</h1>
    <p><span class="status-badge">${esc(game.statusLabel)}</span></p>
    <p>${esc(game.summary)}</p>
  </header>
  <section id="game-summary" aria-labelledby="overview-heading">
    <h2 id="overview-heading">Overview</h2>
    ${game.cover ? `<img class="game-cover" src="${esc(game.cover.url)}" alt="${esc(game.cover.alt)}" width="${esc(game.cover.width)}" height="${esc(game.cover.height)}" />` : ''}
    ${coverNote(game)}
    ${paragraphs(game.prose?.overview)}
    <p><strong>Genre:</strong> ${esc(game.genre ?? 'not supplied')}.</p>
    <p><strong>Platforms:</strong> ${game.platforms.map((platform) => esc(platform)).join(' and ')}.</p>
    <p><strong>Release:</strong> ${game.releaseDate
      ? esc(game.releaseDate)
      : 'a release date has not been supplied; this is a demo build, not a released game'}.</p>
  </section>
  <section id="gameplay" aria-labelledby="gameplay-heading">
    <h2 id="gameplay-heading">Gameplay</h2>
    ${paragraphs(game.prose?.gameplay)}
    ${game.screenshots.length
      ? `<div class="screenshot-grid">${game.screenshots.map((shot) => `<figure><img src="${esc(shot.url)}" alt="${esc(shot.alt)}" width="${esc(shot.width)}" height="${esc(shot.height)}" loading="lazy" /><figcaption>${esc(shot.caption ?? '')}</figcaption></figure>`).join('')}</div>`
      : '<p>No screenshots have been supplied.</p>'}
    ${game.mediaProvenance ? `<p class="media-provenance">${esc(game.mediaProvenance)}</p>` : ''}
  </section>
  <section id="experience" aria-labelledby="experience-heading">
    <h2 id="experience-heading">Experience</h2>
    ${paragraphs(game.prose?.experience)}
  </section>
  <section id="features" aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
    ${game.features.length ? `<ul>${game.features.map((feature) => `<li>${esc(feature)}</li>`).join('')}</ul>` : '<p>Feature list not supplied.</p>'}
  </section>
  <section id="availability" aria-labelledby="availability-heading">
    <h2 id="availability-heading">Availability</h2>
    ${game.availability.browserDemo.available
      ? `<h3>In the browser</h3>
      <p><a class="button" href="${esc(game.availability.browserDemo.url)}">Play the browser demo</a></p>
      <p>${esc(game.availability.browserDemo.note)}</p>`
      : `<p class="unavailable-note">Browser demo: ${esc(game.availability.browserDemo.reason)}</p>`}
    ${game.availability.download.available
      ? `<h3>Desktop build</h3>
      <p><a class="button" href="${esc(game.availability.download.url)}" download>Download for ${esc(game.availability.download.platform)} (${esc(bytes(game.availability.download.bytes))})</a></p>
      <p>${esc(game.availability.download.note)}</p>
      <details class="build-details">
        <summary>What is inside the archive and how it was checked</summary>
        <ul>
          ${game.builds.desktop.contents.map((member) => `<li><code>${esc(member.name)}</code> — ${esc(bytes(member.bytes))}</li>`).join('')}
        </ul>
        <p>${licenceNote(game)}</p>
        <p>Measured from the exported files: ${measuredMembers(game)}.</p>
        <p class="unavailable-note">The archive is rebuilt on this machine from the studio's export folder, so its own hash changes between runs; the files inside it are the ones measured above.</p>
      </details>`
      : `<p class="unavailable-note">Download: ${esc(game.availability.download.reason)}</p>`}
    ${game.availability.itch.available
      ? `<p><a href="${esc(game.availability.itch.url)}">Get the free version on itch.io</a></p>`
      : `<p class="unavailable-note">Free itch.io route: ${esc(game.availability.itch.reason)}</p>`}
    <h3>Build details</h3>
    <dl class="build-facts">
      <dt>Engine</dt><dd>${esc(game.builds.engine.name)} ${esc(game.builds.engine.version)}, ${esc(game.builds.engine.renderer)} renderer</dd>
      <dt>Browser payload</dt><dd>${esc(bytes(game.builds.web.bytes))} across ${esc(game.builds.web.files.filter((file) => !file.note).length)} files</dd>
      <dt>Browser requirements</dt><dd>${esc(game.builds.web.requires.join(', '))}</dd>
      <dt>Desktop archive</dt><dd>${esc(bytes(game.builds.desktop.archiveBytes))} (${esc(game.builds.desktop.compressedWith)}), staged ${esc(game.builds.desktop.archiveStagedOn)}</dd>
      <dt>Window</dt><dd>${esc(game.builds.engine.windowSize)}, resizable</dd>
    </dl>
  </section>
  <section id="status" aria-labelledby="status-heading">
    <h2 id="status-heading">Status</h2>
    ${game.statusDetail ? `<p>${esc(game.statusDetail)}</p>` : '<p>The studio has not described this build&apos;s status.</p>'}
    <p>What the studio has not said about it is listed under <a href="#not-supplied">Not supplied yet</a>.</p>
  </section>
  ${notSuppliedList(game)}
  <section id="support" aria-labelledby="support-heading">
    <h2 id="support-heading">Store and creator support</h2>
    ${gameOfferings.length
      ? gameOfferings.map((offering) => `<p><strong>${esc(offering.title)}</strong> — ${esc(offering.description)} <a href="/store/#${esc(offering.id)}">View this offering and its contribution rules</a>.</p>`).join('')
      : '<p>No store offering is configured for this game.</p>'}
  </section>`
}

function storeOfferings() {
  const cards = games.flatMap((game) => offeringsForGame(game.id).map((offering) => {
    const price = offering.pricing.model === 'pay-what-you-want'
      ? `Pay what you want: ${money(offering.pricing.minimum, offering.pricing.currency)} to ${money(offering.pricing.maximum, offering.pricing.currency)}.`
      : `Fixed price: ${money(offering.pricing.amount, offering.pricing.currency)}.`
    return `<article class="offering-card" id="${esc(offering.id)}" data-offering-id="${esc(offering.id)}">
      <p class="screen-cue">${esc(offering.kind.replaceAll('-', ' '))}</p>
      <h2>${esc(offering.title)}</h2>
      <p>Associated game: <a href="${esc(game.page)}">${esc(game.title)}</a> · ${esc(game.statusLabel)}</p>
      <p><strong>${esc(price)}</strong></p>
      <p>${esc(offering.description)}</p>
      <p>${esc(offering.includes)}</p>
      <p class="unavailable-note">${esc(offering.terms)}</p>
      <form class="offering-form" data-offering-form="${esc(offering.id)}" hidden>
        <label for="amount-${esc(offering.id)}">Contribution amount (${esc(offering.pricing.currency)})</label>
        <div class="form-row">
          <input id="amount-${esc(offering.id)}" name="amount" type="number" min="${offering.pricing.minimum}" max="${offering.pricing.maximum}" step="0.01" value="${offering.pricing.defaultAmount}" required />
          <button class="button" type="submit">Add to cart</button>
        </div>
      </form>
      <p class="form-feedback" data-offering-feedback role="status"></p>
    </article>`
  }))
  return cards.length
    ? cards.join('')
    : '<p class="empty-state">No offerings are currently configured. No price or product has been invented.</p>'
}

const renderers = {
  'home-games': gameList,
  catalogue: gameList,
  'game-details': (gameId) => gameDetails(gameById(gameId)),
  'store-offerings': storeOfferings,
  'studio-letter': () => paperArticle(studioLetter, 'letter-heading'),
  'how-to-note': () => howToNote.paragraphs.map(paperParagraph).join('\n'),
  'room-hint': (key) => roomHint(key),
}

/**
 * Vite HTML transform used in both dev and build. The browser receives real content in the HTML,
 * while every route still comes from the same data modules as the room and the server.
 */
export function staticContentPlugin() {
  return {
    name: 'saleshi-static-content',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const pageGameId = html.match(/<body[^>]*data-game-id="([^"]+)"/)?.[1]
        const pageGame = pageGameId ? gameById(pageGameId) : null
        // The route this document is served at, which is what `og:url` states once a host exists.
        // Vite gives an index document a directory path, and the trailing slash is part of the route.
        const pagePath = `/${String(context?.path ?? '/').replace(/^\.?\/+/, '').replace(/index\.html$/, '')}`
        let output = html
        for (const [token, render] of Object.entries(tokens)) {
          // A function replacement, so a `$` in a value stays a literal rather than becoming a
          // substitution pattern.
          output = output.replaceAll(token, () => render())
        }
        if (pageGame) {
          const { browserDemo, download } = pageGame.availability
          output = output
            .replaceAll('{{GAME_TITLE}}', esc(pageGame.title))
            .replaceAll('{{GAME_SUMMARY}}', esc(pageGame.summary))
            .replaceAll('{{DEMO_BYTES}}', esc(browserDemo.sizeLabel ?? 'the browser build'))
            .replaceAll('{{DOWNLOAD_URL}}', esc(download.url ?? '/games/'))
            .replaceAll('{{DOWNLOAD_BYTES}}', esc(download.sizeLabel ?? 'its own size'))
            .replaceAll('{{JSONLD_GAME}}', () => jsonLdTag(gameJsonLd(pageGame)))
        }
        output = output.replaceAll('{{SOCIAL_META}}', () => socialMetaTag(output, pagePath, pageGame?.cover ?? null))
        const filled = output.replace(
          /<div data-static-content="([a-z-]+)"(?: data-(?:game|key)="([^"]+)")?><\/div>/g,
          (match, kind, arg) => renderers[kind]?.(arg) ?? match,
        )
        // A token or a slot that survived means the page asks for content no renderer provides.
        // Failing the build is the honest option: the alternative is a route that shows a visitor a
        // literal `{{TOKEN}}` and a test suite that only checks it is not empty.
        const unresolved = [...filled.matchAll(/\{\{[A-Z_]+\}\}|data-static-content="[a-z-]+"/g)]
          .map((match) => match[0])
        if (unresolved.length) {
          throw new Error(`static-content: ${context?.path ?? 'a page'} left ${[...new Set(unresolved)].join(', ')} unfilled`)
        }
        return filled
      },
    },
  }
}
