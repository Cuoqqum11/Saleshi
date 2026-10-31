import { games, gameById } from '../src/js/data/games.js'
import { offeringsForGame } from '../src/js/data/offerings.js'

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const money = (amount, currency) => `${currency} ${Number(amount).toFixed(2)}`

const bytes = (value) => (value >= 1048576
  ? `${(value / 1048576).toFixed(1)} MB`
  : `${Math.max(1, Math.round(value / 1024))} KB`)

const shortHash = (value) => `${value.slice(0, 16)}…`

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
  const badges = [
    game.availability.browserDemo.available ? '<span class="media-badge">Play in browser</span>' : '',
    game.availability.download.available ? '<span class="media-badge">Windows download</span>' : '',
  ].join('')
  return `<li class="game-card">
    <h3><a href="${esc(game.page)}">${esc(game.title)}</a></h3>
    <p><span class="status-badge">${esc(game.statusLabel)}</span>${badges}</p>
    <p>${esc(game.summary)}</p>
    ${game.cover ? `<img class="game-cover" src="${esc(game.cover.url)}" alt="${esc(game.cover.alt)}" width="1280" height="800" loading="lazy" />` : '<p class="media-placeholder">Cover artwork not supplied.</p>'}
    ${availabilityNote(game)}
    <p><a href="${esc(game.page)}">Read the full game details</a></p>
  </li>`
}

function gameList() {
  return `<ul class="game-list">${games.map(gameCard).join('')}</ul>
  <p class="empty-state">Only ${games.length} game is listed. The other shelf positions are empty; no additional titles, release dates or projects have been invented to fill them.</p>`
}

function gameDetails(game) {
  if (!game) return '<p class="unavailable-note">This game record does not exist.</p>'
  const gameOfferings = offeringsForGame(game.id)
  return `<header>
    <h1>${esc(game.title)}</h1>
    <p><span class="status-badge">${esc(game.statusLabel)}</span></p>
    <p>${esc(game.summary)}</p>
  </header>
  <section id="game-summary" aria-labelledby="summary-heading">
    <h2 id="summary-heading">Description</h2>
    ${game.description.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}
    <p><strong>Genre:</strong> ${esc(game.genre ?? 'not supplied')}.</p>
    <p><strong>Release information:</strong> ${esc(game.statusLabel)}; no release date has been supplied.</p>
    ${game.features.length ? `<ul>${game.features.map((feature) => `<li>${esc(feature)}</li>`).join('')}</ul>` : '<p>Feature list not supplied.</p>'}
  </section>
  <section id="media" aria-labelledby="media-heading">
    <h2 id="media-heading">Cover and screenshots</h2>
    ${game.cover ? `<img class="game-cover" src="${esc(game.cover.url)}" alt="${esc(game.cover.alt)}" width="1280" height="800" />` : '<p class="unavailable-note">No cover artwork has been supplied. A placeholder image could be mistaken for real game art, so none is shown.</p>'}
    ${game.screenshots.length
      ? `<div class="screenshot-grid">${game.screenshots.map((shot) => `<figure><img src="${esc(shot.url)}" alt="${esc(shot.alt)}" width="1280" height="800" loading="lazy" /><figcaption>${esc(shot.caption ?? '')}</figcaption></figure>`).join('')}</div>`
      : '<p>No screenshots have been supplied.</p>'}
  </section>
  <section id="get-the-game" aria-labelledby="get-heading">
    <h2 id="get-heading">Play, download and distribution</h2>
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
        <p>The two font licence files are included because the licences require them to travel with any build that bundles the fonts.</p>
        <p>Measured from the exported files: <code>${esc(game.builds.desktop.contents.find((member) => member.name.endsWith('.exe'))?.name ?? 'executable')}</code> SHA-256 <code>${esc(shortHash(game.builds.desktop.contents.find((member) => member.name.endsWith('.exe'))?.sha256 ?? ''))}</code>, <code>The Last Witness.pck</code> SHA-256 <code>${esc(shortHash(game.builds.desktop.contents.find((member) => member.name.endsWith('.pck'))?.sha256 ?? ''))}</code>.</p>
        <p class="unavailable-note">The archive is rebuilt on this machine from the studio's export folder, so its own hash changes between runs; the two files inside it are the ones measured above.</p>
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
      <dt>Desktop archive</dt><dd>${esc(bytes(game.builds.desktop.archiveBytes))} (deflate), staged ${esc(game.builds.desktop.archiveStagedOn)}</dd>
      <dt>Window</dt><dd>${esc(game.builds.engine.windowSize)}, resizable</dd>
    </dl>
  </section>
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
      handler(html) {
        const pageGameId = html.match(/<body[^>]*data-game-id="([^"]+)"/)?.[1]
        const pageGame = pageGameId ? gameById(pageGameId) : null
        let output = html
        if (pageGame) {
          const { browserDemo, download } = pageGame.availability
          output = output
            .replaceAll('{{GAME_TITLE}}', esc(pageGame.title))
            .replaceAll('{{GAME_SUMMARY}}', esc(pageGame.summary))
            .replaceAll('{{DEMO_BYTES}}', esc(browserDemo.sizeLabel ?? 'the browser build'))
            .replaceAll('{{DOWNLOAD_URL}}', esc(download.url ?? '/games/'))
            .replaceAll('{{DOWNLOAD_BYTES}}', esc(download.sizeLabel ?? 'its own size'))
        }
        return output.replace(
          /<div data-static-content="([a-z-]+)"(?: data-game="([^"]+)")?><\/div>/g,
          (match, kind, gameId) => renderers[kind]?.(gameId) ?? match,
        )
      },
    },
  }
}
