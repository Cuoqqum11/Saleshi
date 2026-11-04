import { chromium } from 'playwright'
import { goto, request } from './netRetry.mjs'
import { OUT } from './evidence.mjs'
import { games } from '../../src/js/data/games.js'
import { identityIsProvisional, studio } from '../../src/js/data/studio.js'
import { studioLetter } from '../../src/js/data/content.js'
import {
  catalogueJsonLd, gameJsonLd, organizationJsonLd, socialTags, webSiteJsonLd,
} from '../../src/js/data/metadata.js'

const realGame = games.find((entry) => entry.id === 'the-last-witness')

/**
 * What each route is expected to assert about itself (M8 §11.3, §11.4). A page not carrying structured
 * data must carry none: the transactional routes have no entity to describe, and an `offers`-shaped
 * block would be the invention §9 forbids. `social` is which routes the site offers for sharing — the
 * cart, checkout and confirmation pages are conversation state, not something to advertise.
 */
const METADATA = {
  '/': { social: true, image: null, jsonLd: [organizationJsonLd(), webSiteJsonLd()] },
  '/games/': { social: true, image: null, jsonLd: [catalogueJsonLd()] },
  '/games/the-last-witness/': { social: true, image: realGame.cover, jsonLd: [gameJsonLd(realGame)] },
  '/games/the-last-witness/play/': { social: true, image: realGame.cover, jsonLd: [] },
  '/store/': { social: true, image: null, jsonLd: [] },
  '/cart/': { social: false, image: null, jsonLd: [] },
  '/checkout/': { social: false, image: null, jsonLd: [] },
  '/order/': { social: false, image: null, jsonLd: [] },
}

// BASE_URL must expose the room test hooks: pose and previewPanelGame come from window.__saleshiRoom.
// A dev server or `npm run build:qa` both qualify; `npm run build` compiles the hooks away.
// ROUTES_BASE_URL optionally audits the built site without Vite/HMR in the public-page checks.
const BASE = process.env.BASE_URL ?? 'http://localhost:5174'
const ROUTES_BASE = process.env.ROUTES_BASE_URL ?? BASE
const REAL_PAGES = [
  ['/', 'Saleshi — indie game studio'],
  ['/games/', 'Games catalogue — Saleshi'],
  ['/games/the-last-witness/', 'The Last Witness — Saleshi'],
  ['/games/the-last-witness/play/', 'Play The Last Witness in the browser — Saleshi'],
  ['/store/', 'Store and creator support — Saleshi'],
  ['/cart/', 'Your cart — Saleshi'],
  ['/checkout/', 'Simulated checkout — Saleshi'],
  ['/order/', 'Order confirmation — Saleshi'],
]
const results = []
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function auditRealPages(browser) {
  // A fresh context never receives previewPanelGame, so fixture links are not site links.
  const context = await browser.newContext()
  const audit = await context.newPage()
  const documents = new Map()
  try {
    for (const [index, [path, title]] of REAL_PAGES.entries()) {
      const url = new URL(path, ROUTES_BASE).href
      try {
        const response = await goto(audit, url)
        const snapshot = await audit.evaluate((html) => {
          const raw = new DOMParser().parseFromString(html, 'text/html')
          return {
            title: document.title,
            titleCount: document.querySelectorAll('title').length,
            // The unrendered source, so a build-time content slot can be checked even in a tab where
            // the section it lives in is below the fold or hidden by a drawer.
            text: raw.body.textContent,
            lang: document.documentElement.lang,
            charset: document.characterSet,
            descriptions: [...document.querySelectorAll('meta[name="description"]')].map((meta) => meta.content.trim()),
            viewport: document.querySelector('meta[name="viewport"]')?.content ?? '',
            headings: [...document.querySelectorAll('h1')].map((heading) => heading.textContent.trim()),
            targets: [...document.querySelectorAll('[id], a[name]')].map((element) => element.id || element.getAttribute('name')),
            // Structured data is parsed here rather than string-compared in the source, so a value the
            // browser cannot parse is a failure even if the bytes look right.
            jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((element) => {
              try {
                return { ok: true, value: JSON.parse(element.textContent) }
              } catch {
                return { ok: false, value: element.textContent.slice(0, 60) }
              }
            }),
            social: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')]
              .map((meta) => [meta.getAttribute('property'), meta.content])),
            canonical: document.querySelectorAll('link[rel="canonical"]').length,
            // The provisional-identity flag and the letter's labelled blanks, read out of the served
            // source rather than the live DOM: a marker that only exists after hydration would not be
            // the build-time guarantee M8 §2.3 asks for.
            identityFlags: [...raw.querySelectorAll('[data-provisional-identity]')].map((flag) => flag.textContent.trim()),
            paperGaps: [...raw.querySelectorAll('[data-paper-gap]')].map((flag) => flag.textContent.trim()),
            // Include authored noscript links as well as links rendered by JavaScript.
            links: [...new Set([...document.querySelectorAll('a[href]'), ...raw.querySelectorAll('a[href]')]
              .map((link) => link.getAttribute('href')))],
          }
        }, await response.text())
        snapshot.status = response.status()
        snapshot.html = response.headers()['content-type']?.includes('text/html') === true
        documents.set(url, snapshot)
        const problems = []
        if (snapshot.titleCount !== 1 || snapshot.title !== title) problems.push(`title=${JSON.stringify(snapshot.title)}`)
        if (snapshot.lang !== 'en') problems.push(`lang=${snapshot.lang}`)
        if (snapshot.charset !== 'UTF-8') problems.push(`charset=${snapshot.charset}`)
        if (snapshot.descriptions.length !== 1 || !snapshot.descriptions[0] || snapshot.descriptions[0].includes('{{')) problems.push('missing/unresolved description')
        if (!/width\s*=\s*device-width/.test(snapshot.viewport) || !/initial-scale\s*=\s*1(?:\s|,|$)/.test(snapshot.viewport)) problems.push('missing responsive viewport metadata')
        if (snapshot.headings.length !== 1 || !snapshot.headings[0] || snapshot.headings[0].includes('{{')) problems.push(`expected one nonempty h1, got ${JSON.stringify(snapshot.headings)}`)
        record(`R11-${index + 1}`, `${path} has page-specific title, metadata, lang and h1`, problems.length === 0,
          problems.join('; ') || `title=${snapshot.title}; h1=${snapshot.headings[0]}`)
      } catch (error) {
        documents.set(url, { status: 0, html: false, links: [], targets: [] })
        record(`R11-${index + 1}`, `${path} metadata can be inspected`, false, String(error))
      }
    }

    for (const [index, [path]] of REAL_PAGES.entries()) {
      const url = new URL(path, ROUTES_BASE).href
      const source = documents.get(url)
      const problems = []
      let localLinks = 0
      let fragments = 0
      if (source.status !== 200 || !source.html) problems.push(`page HTTP ${source.status}, HTML=${source.html}`)
      for (const href of source.links) {
        try {
          const target = new URL(href, url)
          if (!['http:', 'https:'].includes(target.protocol) || target.origin !== new URL(url).origin) continue
          localLinks += 1
          const fragment = decodeURIComponent(target.hash.slice(1))
          target.hash = ''
          if (!documents.has(target.href)) {
            // Only HTML needs a body: the anchor check needs its id list, while a link that serves
            // a file is proven by its headers. Downloading the 35 MB build on every audit would
            // make the run about the network rather than the site.
            let head = await request(context, target.href, { method: 'HEAD' })
            if (head.status() === 405 || head.status() === 501) head = await request(context, target.href)
            const isHtml = head.status() === 200 && head.headers()['content-type']?.includes('text/html')
            const targets = isHtml
              ? await audit.evaluate((html) => [...new DOMParser().parseFromString(html, 'text/html')
                .querySelectorAll('[id], a[name]')].map((element) => element.id || element.getAttribute('name')),
              await (await request(context, target.href)).text())
              : []
            documents.set(target.href, { status: head.status(), targets })
          }
          const destination = documents.get(target.href)
          if (destination.status !== 200) problems.push(`${href}: HTTP ${destination.status}`)
          if (fragment) {
            fragments += 1
            if (!destination.targets.includes(fragment)) problems.push(`${href}: missing anchor target`)
          }
        } catch (error) {
          problems.push(`${href}: ${String(error)}`)
        }
      }
      record(`R12-${index + 1}`, `${path} and every local link resolve to HTTP routes and anchor targets`, problems.length === 0,
        `HTTP ${source.status}; ${localLinks} local links, ${fragments} fragments${problems.length ? `; ${problems.join('; ')}` : ''}`)
    }

    // M8 §5.3 lets a stand-in cover be used but requires it to be labelled. The label is one value in
    // the game record, so each DOM surface that shows the image as information is checked against that
    // value here; a template edit that drops it fails instead of quietly becoming unlabelled art.
    for (const [id, path, needs] of [
      ['R14a', '/games/', ['cover']],
      ['R14b', '/games/the-last-witness/', ['cover', 'media']],
    ]) {
      const source = documents.get(new URL(path, ROUTES_BASE).href)
      const text = source.text ?? ''
      const missing = []
      if (needs.includes('cover') && !text.includes(realGame.cover.provenance)) missing.push('cover provenance')
      if (needs.includes('media') && !text.includes(realGame.mediaProvenance)) missing.push('gallery provenance')
      record(id, `${path} labels the provisional cover and the captured frames`,
        text.includes('{{') === false && missing.length === 0,
        missing.length ? `missing: ${missing.join(', ')}` : `${needs.join(' + ')} label(s) present, no unfilled slot`)
    }

    // M8 §7 asks for handling of dead external links. The site's answer is that it publishes none:
    // the only destination that would be external (itch.io) has no supplied URL, so it renders as a
    // statement rather than an href. This records the absence rather than trusting it, because the
    // day a store URL is approved this check is where the link audit has to grow.
    const external = [...new Set([...documents.values()]
      .flatMap((source) => source.links ?? [])
      .map((href) => { try { return new URL(href, ROUTES_BASE) } catch { return null } })
      .filter((url) => url && ['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(ROUTES_BASE).origin)
      .map((url) => url.href))]
    record('R15', 'no page links to an origin this suite cannot verify', external.length === 0,
      external.length ? external.join(', ') : 'zero off-origin http(s) links across 8 pages')

    // M8 §2.3 and §9: an unconfirmed identity may be *shown*, but only as a name the visitor can see is
    // provisional, and a fact the studio has not given may be left blank but never filled with
    // scaffolding. Both halves are read from the records rather than typed here, so this is a check on
    // the mechanism, not on one sentence: setting `nameIsFinal` true retires the marker on all eight
    // pages at once and the check then fails if any page still carries it.
    const brandProblems = []
    for (const [path] of REAL_PAGES) {
      const source = documents.get(new URL(path, ROUTES_BASE).href)
      const text = source.text ?? ''
      const flags = source.identityFlags ?? []
      if (!text.includes(studio.name)) brandProblems.push(`${path}: name absent`)
      if (/\bPLACEHOLDER\b/.test(`${source.title ?? ''} ${text}`)) brandProblems.push(`${path}: unedited placeholder copy`)
      if (identityIsProvisional && (flags.length !== 1 || flags[0] !== studio.nameMarker)) {
        brandProblems.push(`${path}: markers ${JSON.stringify(flags)}`)
      }
      if (!identityIsProvisional && flags.length !== 0) brandProblems.push(`${path}: marker outlives nameIsFinal`)
    }
    // The letter is the one page that carries the studio's own words, so its labelled blanks are the
    // place where a guessed biography would be most convincing — and the gaps are compared with the
    // record's own labels, not with strings copied into this file.
    const expectedGaps = studioLetter.paragraphs.filter((paragraph) => paragraph.gap).map((paragraph) => paragraph.gap)
    const letterFlags = documents.get(new URL('/', ROUTES_BASE).href)?.paperGaps ?? []
    if (expectedGaps.some((gap) => !letterFlags.includes(gap))) {
      brandProblems.push(`/: letter gaps ${JSON.stringify(letterFlags)} lack ${JSON.stringify(expectedGaps.filter((gap) => !letterFlags.includes(gap)))}`)
    }
    if (letterFlags.length !== expectedGaps.length) brandProblems.push(`/: ${letterFlags.length} gap flag(s), ${expectedGaps.length} labelled paragraph(s)`)
    record('R25', 'the published identity is one record-driven name plus a provisional marker, never scaffolding',
      brandProblems.length === 0,
      brandProblems.length ? brandProblems.join('; ')
        : `8 pages carry "${studio.name}" with one "${studio.nameMarker}" flag each; the letter's ${expectedGaps.length} labelled blanks (${expectedGaps.join(', ')}) render; no unedited placeholder copy`)

    // M8 §11: the metadata a route emits is compared against the modules that generate it, not against
    // a copy of the expected text. Two failures this catches that "is the tag there" would not: a route
    // whose block was dropped by a template edit, and a social preview stating a title or description
    // the page itself does not show.
    const metadataProblems = []
    for (const [path, expected] of Object.entries(METADATA)) {
      const source = documents.get(new URL(path, ROUTES_BASE).href)
      if (source.jsonLd.length !== expected.jsonLd.length) {
        metadataProblems.push(`${path}: ${source.jsonLd.length} structured-data block(s), expected ${expected.jsonLd.length}`)
      }
      source.jsonLd.forEach((block, index) => {
        if (!block.ok) metadataProblems.push(`${path}: block ${index + 1} is not parseable JSON (${block.value})`)
        else if (JSON.stringify(block.value) !== JSON.stringify(expected.jsonLd[index])) {
          metadataProblems.push(`${path}: block ${index + 1} differs from the record`)
        }
      })
      const wanted = expected.social
        ? Object.fromEntries(socialTags({
          path, title: source.title, description: source.descriptions[0], image: expected.image,
        }))
        : {}
      if (JSON.stringify(source.social) !== JSON.stringify(wanted)) {
        metadataProblems.push(`${path}: social tags ${JSON.stringify(source.social)}, expected ${JSON.stringify(wanted)}`)
      }
      // No host has been chosen, so no route may claim one. M9 adds the canonical link.
      if (source.canonical !== 0) metadataProblems.push(`${path}: emits a canonical link before a host exists`)
    }
    record('R18', 'every route emits exactly the structured data and sharing tags its records support',
      metadataProblems.length === 0,
      metadataProblems.join('; ') || '8 pages: JSON-LD parses and matches the modules, sharing tags repeat each page own head, no canonical link')

    // The rules that hold for *every* block on the site, checked on the built documents rather than on
    // the module: nothing points at an origin the project has not been given, and none of the
    // properties that would turn this into a claim about a commercial identity has appeared.
    const absolute = []
    const properties = new Set()
    const walk = (value) => {
      if (Array.isArray(value)) return value.forEach(walk)
      if (!value || typeof value !== 'object') return
      for (const [key, item] of Object.entries(value)) {
        properties.add(`${value['@type'] ?? 'document'}.${key}`)
        if (typeof item === 'string' && item.includes('://') && key !== '@context') absolute.push(`${key}=${item}`)
        walk(item)
      }
    }
    for (const source of documents.values()) source.jsonLd?.forEach((block) => walk(block.value))
    const invented = [...properties].filter((key) => /\.(offers|logo|email|address|telephone|sameAs|aggregateRating|review|datePublished|price|downloadCount)$/.test(key))
    record('R19', 'the built site states no origin and no unconfirmed property in its structured data',
      absolute.length === 0 && invented.length === 0,
      [`${properties.size} distinct properties`, ...absolute, ...invented].join('; '))

    // M8 §8 fixes the game page's section order, and the record's `prose` keys decide which paragraph
    // belongs to which section. Both halves are checked: the headings in order, and every sentence
    // present exactly once, so a later re-split cannot drop a claim or print one twice.
    const gameUrl = new URL('/games/the-last-witness/', ROUTES_BASE).href
    await goto(audit, gameUrl)
    const headings = await audit.evaluate(() => [...document.querySelectorAll('main h2')]
      .map((heading) => heading.textContent.trim()))
    const wanted = ['Overview', 'Gameplay', 'Experience', 'Features', 'Availability', 'Status']
    const sentences = Object.values(realGame.prose).flat()
    const pageText = documents.get(gameUrl)?.text ?? ''
    const absent = sentences.filter((sentence) => !pageText.includes(sentence))
    const twice = sentences.filter((sentence) => pageText.split(sentence).length - 1 !== 1)
    // The status paragraph is one sentence in the record, so it must be one sentence on the page.
    // It used to exist twice, in `statusDetail` and in a `prose.status` copy.
    const stated = pageText.split(realGame.statusDetail).length - 1
    record('R16a', 'the game page sections appear in the §8 order',
      headings.slice(0, wanted.length).join(' > ') === wanted.join(' > '),
      `found: ${headings.join(' > ')}`)
    record('R16b', 'every prose sentence from the record appears once on the game page',
      sentences.length === 3 && absent.length === 0 && twice.length === 0 && stated === 1,
      `${sentences.length} sentences; absent=${absent.length}; duplicated=${twice.length}; status stated ${stated}×`)

    // M8 §8's consistency requirement, checked rather than asserted in prose: the three strings a
    // visitor uses to identify the product have to be the same words on every page that shows them.
    const fields = { title: realGame.title, statusLabel: realGame.statusLabel, summary: realGame.summary }
    const surfaces = [
      ['/games/', ['title', 'statusLabel', 'summary']],
      ['/games/the-last-witness/', ['title', 'statusLabel', 'summary']],
      ['/games/the-last-witness/play/', ['title']],
      ['/store/', ['title', 'statusLabel']],
    ]
    const drift = []
    for (const [path, keys] of surfaces) {
      const text = documents.get(new URL(path, ROUTES_BASE).href)?.text ?? ''
      for (const key of keys) if (!text.includes(fields[key])) drift.push(`${path} does not carry ${key}`)
    }
    // The download control is the one place a page could disagree with the measured record, so its
    // destination and its stated size are compared against the same two values.
    const gamePage = documents.get(new URL('/games/the-last-witness/', ROUTES_BASE).href)
    if (!gamePage.links.includes(realGame.availability.download.url)) drift.push('download href is not the staged archive')
    if (!gamePage.text.includes(realGame.availability.download.sizeLabel)) drift.push('download size is not the measured one')
    if (!gamePage.text.includes(realGame.availability.browserDemo.sizeLabel)) drift.push('demo size is not the measured one')
    record('R17', 'title, status, summary and both measured sizes are identical on every surface',
      drift.length === 0, drift.join('; ') || `${surfaces.length} pages plus the download, demo and archive figures`)
  } finally {
    await context.close()
  }
}

/**
 * M8 §12 / WP9 — the two WCAG 2.2 measures a content change can regress silently, plus the horizontal
 * overflow the new card and screenshot markup could introduce. Both are properties of the finished CSS,
 * so they are read off the rendered page at a phone and a desktop width.
 *
 * The contrast maths is the relative-luminance formula; the part that is easy to get wrong is the
 * backdrop. This site layers translucent panels (`rgba(255,255,255,0.03)`) over a dark page, and a probe
 * that treats a translucent background as opaque reports 2:1 "failures" on text that really measures 9:1.
 * Every ancestor colour is therefore composited in turn until an opaque one is found, and the text
 * colour itself is composited over that result before either luminance is taken.
 *
 * Target size (SC 2.5.8) is 24x24 CSS px with an exception for links that sit inside a sentence, where
 * enlarging the target would disturb the prose. That exception is decided by counting the words the
 * reader sees around the link, not by whether the element happens to have siblings: a paragraph holding
 * two links and a separator has three words of surrounding text, so it is a standing pair of controls
 * and must clear the floor. A paragraph of actual prose has twenty or more characters that are not a
 * link. `inline` display is still required, because a block-level link is never mid-sentence.
 */
function WCAG_AUDIT() {
  const split = (value) => {
    const numbers = (value.match(/[\d.]+/g) ?? []).map(Number)
    return { r: numbers[0] ?? 0, g: numbers[1] ?? 0, b: numbers[2] ?? 0, a: numbers[3] === undefined ? 1 : numbers[3] }
  }
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
  })
  const behind = (element) => {
    const layers = []
    for (let node = element; node; node = node.parentElement) {
      const layer = split(getComputedStyle(node).backgroundColor)
      if (layer.a > 0) layers.push(layer)
      if (layer.a === 1) break
    }
    let colour = { r: 255, g: 255, b: 255 }
    for (const layer of layers.reverse()) colour = layer.a === 1 ? layer : over(layer, colour)
    return colour
  }
  const luminance = ({ r, g, b }) => {
    const channel = (v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.05) / 1.05) ** 2.4)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }
  const shown = (element) => {
    const box = element.getBoundingClientRect()
    return box.width > 0 && box.height > 0
  }

  const samples = [...document.querySelectorAll('body *')]
    .filter((element) => [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim().length > 2) && shown(element))
    .map((element) => {
      const style = getComputedStyle(element)
      const backdrop = behind(element)
      const paint = over(split(style.color), backdrop)
      const a = luminance(paint)
      const b = luminance(backdrop)
      const size = Number.parseFloat(style.fontSize)
      return {
        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 28),
        size,
        bold: Number(style.fontWeight) >= 700,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      }
    })

  const inline = (element) => {
    if (element.tagName !== 'A' || getComputedStyle(element).display !== 'inline') return false
    const block = element.closest('p, li, dd, dt, h1, h2, h3, div, section, footer, header')
    if (!block) return false
    const labels = [...block.querySelectorAll('a[href], button')].reduce(
      (total, link) => total + link.textContent.replace(/\s+/g, ' ').trim().length, 0)
    return block.textContent.replace(/\s+/g, ' ').length - labels >= 20
  }
  const underSize = [...document.querySelectorAll('a[href], button, summary, input:not([type=hidden]), select, [role=button]')]
    .filter(shown)
    .filter((element) => { const box = element.getBoundingClientRect(); return box.width < 24 || box.height < 24 })
  const nameOf = (element) => {
    const name = (element.textContent || element.getAttribute('aria-label') || element.value || element.tagName).trim()
    return `"${name.slice(0, 26) || element.tagName.toLowerCase()}"`
  }
  const label = (element) => {
    const box = element.getBoundingClientRect()
    return `${nameOf(element)} ${Math.round(box.width)}x${Math.round(box.height)}`
  }
  const targets = underSize.filter((element) => !inline(element)).map(label)

  const worst = samples.reduce((a, b) => (a.ratio <= b.ratio ? a : b), { ratio: Infinity, text: '', size: 0 })
  return {
    textNodes: samples.length,
    controls: underSize.length,
    exempt: underSize.filter(inline).map(nameOf),
    smallest: Math.min(...samples.map((sample) => sample.size)),
    tightest: worst.ratio,
    tightestLabel: `${worst.text} ${worst.size.toFixed(1)}px`,
    contrast: samples
      .filter((sample) => sample.ratio < (sample.size >= 24 || (sample.size >= 18.66 && sample.bold) ? 3 : 4.5))
      .map((sample) => `"${sample.text}" ${sample.size}px ${sample.ratio.toFixed(2)}:1`),
    targets,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
}

async function auditAccessibility(browser) {
  const context = await browser.newContext()
  const audit = await context.newPage()
  const tally = { textNodes: 0, smallest: Infinity, tightest: Infinity, tightestLabel: '', contrast: [], targets: [], overflow: [] }
  let small = 0
  const exempt = new Set()
  const surfaces = [...REAL_PAGES.map(([path]) => ({ path })), { path: '/?view=room&game=the-last-witness', room: true }]
  try {
    for (const width of [390, 1280]) {
      await audit.setViewportSize({ width, height: 844 })
      for (const surface of surfaces) {
        await goto(audit, new URL(surface.path, ROUTES_BASE).href)
        if (surface.room) {
          await audit.waitForFunction(() => window.__saleshiRoom?.stats()?.selectedGameId === 'the-last-witness',
            null, { timeout: 30000 })
        } else {
          // The Vue islands mount after `load`, so an unmixed measurement needs them present.
          await audit.waitForTimeout(150)
        }
        // The panel is written by a watcher after the selection lands, so both cases need a beat.
        await audit.waitForTimeout(200)
        const found = await audit.evaluate(WCAG_AUDIT)
        tally.textNodes += found.textNodes
        small += found.controls
        for (const item of found.exempt) exempt.add(item)
        tally.smallest = Math.min(tally.smallest, found.smallest)
        if (found.tightest <= tally.tightest) {
          tally.tightest = found.tightest
          tally.tightestLabel = found.tightestLabel
        }
        for (const item of found.contrast) tally.contrast.push(`${width}px ${surface.path} ${item}`)
        for (const item of found.targets) tally.targets.push(`${width}px ${surface.path} ${item}`)
        if (found.overflow) tally.overflow.push(`${width}px ${surface.path}`)
      }
    }
    const reading = `${surfaces.length} surfaces x 2 widths, ${(tally.textNodes / surfaces.length / 2).toFixed(0)} text nodes each`
    record('R20', 'every published route and the room panel pass WCAG 2.2 AA text contrast', tally.contrast.length === 0,
      tally.contrast.join('; ')
      || `${reading}; smallest text ${tally.smallest.toFixed(1)}px, tightest sample ${tally.tightest.toFixed(2)}:1 (${tally.tightestLabel})`)
    record('R21', 'every non-inline interactive target is at least 24x24 CSS px',
      tally.targets.length === 0, tally.targets.join('; ')
      || `${small} controls measured under 24 px across both widths; ${exempt.size} distinct links, all mid-sentence and exempted by SC 2.5.8 (${[...exempt].join(', ')}); nothing else was under size`)
    record('R22', 'no audited surface overflows horizontally at 390 or 1280 px', tally.overflow.length === 0,
      tally.overflow.join('; ') || `${surfaces.length} surfaces x 2 widths, none wider than the viewport`)
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

try {
  await goto(page, `${BASE}/?view=room&game=the-last-witness`)
  await page.waitForFunction(() => window.__saleshiRoom?.stats()?.selectedGameId === 'the-last-witness' && window.__saleshiRoom.stats().drawCalls > 0)
  await page.waitForTimeout(1000)
  // Every action link is checked rather than the first, because the real game now offers three and
  // an unreadable one is just as much a defect as an unreadable details link.
  const actionStyles = await page.evaluate(() => [...document.querySelectorAll('.screen-actions a.screen-link')].map((element) => {
    const style = getComputedStyle(element)
    return { text: style.color, background: style.backgroundColor }
  }))
  record('R1', 'direct room URL restores selection and readable computer state', (await page.locator('#monitor-screen h2').textContent()).includes('The Last Witness')
    && (await page.locator('#selection-status').textContent()).includes('Restored')
    && actionStyles.length > 0 && actionStyles.every((style) => style.text !== style.background), JSON.stringify(actionStyles))
  await page.screenshot({ path: OUT('m6-01-computer-catalogue.png'), fullPage: true })

  // The panel is the surface a visitor reads *after* picking the case off the shelf, so it is where
  // M8 §5.3's label has to be. Compared against the record value, not a copy of the sentence.
  const panelLabel = await page.locator('#monitor-screen .screen-media-provenance').first()
    .textContent().catch(() => null)
  record('R1c', 'the computer panel labels the provisional cover with the record value',
    (panelLabel ?? '').trim() === realGame.cover.provenance, JSON.stringify((panelLabel ?? '').trim()))

  // The panel is the fourth surface, and the one inside the room, so it is checked the same way.
  const panelText = await page.locator('#monitor-screen').textContent()
  const panelDrift = [realGame.title, realGame.statusLabel, realGame.summary]
    .filter((value) => !panelText.includes(value))
  record('R17b', 'the computer panel states the same title, status and summary as the record',
    panelDrift.length === 0, panelDrift.length ? `missing: ${panelDrift.join(', ')}` : 'three values match the record')

  await page.evaluate(() => window.__saleshiRoom.previewPanelGame({
    id: 'the-last-witness', title: '[TEST FIXTURE] Panel states', statusLabel: 'Fixture only',
    summary: 'Synthetic component fixture; not a real game or site content.',
    cover: { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic one-pixel test cover' },
    screenshots: [
      { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic test screenshot one' },
      { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', alt: 'Synthetic test screenshot two' },
    ],
    availability: {
      details: { available: true }, browserDemo: { available: true, url: '/fixture-demo/' },
      download: { available: true, url: '/fixture-download/' }, itch: { available: true, url: 'https://example.invalid/fixture' },
    },
  }))
  await page.waitForFunction(() => document.querySelector('#monitor-screen h2')?.textContent.includes('[TEST FIXTURE]'))
  const fixture = await page.evaluate(() => ({
    cover: Boolean(document.querySelector('.screen-media img')),
    drawn: document.querySelectorAll('.screen-screenshots img').length,
    count: document.querySelector('.screen-media-count')?.textContent.trim(),
    actions: [...document.querySelectorAll('.screen-actions a')].map((a) => a.getAttribute('href')),
  }))
  // The panel deliberately stops drawing screenshots: at this size they are unreadable. It must
  // still say how many exist, and every action that genuinely exists must be offered.
  record('R2', 'test-only fixture proves cover, media count and available action rendering', fixture.cover
    && fixture.drawn === 0 && fixture.count?.startsWith('2 screenshots')
    && fixture.actions.includes('/fixture-demo/') && fixture.actions.includes('/fixture-download/')
    && fixture.actions.includes('https://example.invalid/fixture'), JSON.stringify(fixture))

  // M8 §7 asks for failure handling on the two shapes a real record cannot show yet: no artwork at
  // all, and nothing genuinely available. The id differs from the real game's because the panel
  // resets its per-record state on an id change — reusing the real id would exercise the template
  // and not the reset.
  await page.evaluate(() => window.__saleshiRoom.previewPanelGame({
    id: 'fixture-empty', title: '[TEST FIXTURE] Nothing supplied', statusLabel: 'Fixture only',
    summary: 'Synthetic record with no artwork and no available action.',
    screenshots: [],
    availability: {
      details: { available: false, reason: 'Fixture: no page exists.' },
      browserDemo: { available: false, reason: 'Fixture: no demo exists.' },
      download: { available: false, reason: 'Fixture: no build exists.' },
      itch: { available: false, reason: 'Fixture: no store page exists.' },
    },
  }))
  await page.waitForFunction(() => document.querySelector('#monitor-screen h2')?.textContent.includes('Nothing supplied'))
  const empty = await page.evaluate(() => ({
    images: document.querySelectorAll('#monitor-screen img').length,
    links: [...document.querySelectorAll('#monitor-screen a')].map((a) => a.getAttribute('href')),
    text: document.querySelector('#monitor-screen').textContent,
  }))
  record('R2b', 'a record with no artwork and nothing available states both instead of offering controls',
    empty.images === 0 && empty.text.includes('Cover artwork has not been supplied')
    && empty.links.every((href) => !href?.includes('/fixture-')) && empty.text.includes('Fixture: no demo exists.'),
    JSON.stringify({ images: empty.images, links: empty.links }))

  // And back again: the previous record's sentences, links and picture must all be gone.
  await page.evaluate((game) => window.__saleshiRoom.previewPanelGame(game), realGame)
  await page.waitForFunction(() => document.querySelector('#monitor-screen h2')?.textContent.includes('The Last Witness'))
  const back = await page.evaluate(() => ({
    text: document.querySelector('#monitor-screen').textContent,
    hrefs: [...document.querySelectorAll('#monitor-screen a')].map((a) => a.getAttribute('href')),
    cover: document.querySelector('#monitor-screen .screen-media img')?.getAttribute('src'),
  }))
  const stale = ['[TEST FIXTURE]', 'Fixture only', '/fixture-demo/', '/fixture-download/', 'example.invalid']
    .filter((needle) => back.text.includes(needle) || back.hrefs.some((href) => href?.includes(needle)))
  record('R2c', 'switching selection leaves no stale text, link or artwork',
    stale.length === 0 && back.cover === realGame.cover.url,
    stale.length ? `stale: ${stale.join(', ')}` : `cover=${back.cover}`)

  // An address can name a record the shelf does not hold. The screen must say so rather than pretend
  // the parameter was never typed.
  await goto(page, `${BASE}/?view=room&game=not-a-real-record`)
  await page.waitForFunction(() => window.__saleshiRoom?.stats()?.drawCalls > 0)
  const unknown = await page.evaluate(() => ({
    heading: document.querySelector('#monitor-screen h2')?.textContent.trim(),
    status: document.querySelector('#selection-status')?.textContent.trim(),
    param: new URL(window.location.href).searchParams.get('game'),
  }))
  record('R2d', 'an address naming an absent record leaves the screen on standby and says why',
    unknown.heading === 'The screen is on standby' && /does not hold/.test(unknown.status)
    && unknown.param === 'not-a-real-record', JSON.stringify(unknown))

  await goto(page, `${ROUTES_BASE}/games/`)
  await page.locator('.game-card h3 a').click()
  await page.waitForURL('**/games/the-last-witness/')
  await page.goBack()
  await page.waitForURL('**/games/')
  await page.goForward()
  await page.waitForURL('**/games/the-last-witness/')
  record('R3', 'real routes support normal browser back and forward navigation', await page.locator('h1').textContent() === 'The Last Witness')

  for (const width of [768, 900]) {
    await page.setViewportSize({ width, height: 800 })
    await goto(page, `${BASE}/?view=room&game=the-last-witness`)
    await page.waitForFunction(() => window.__saleshiRoom?.stats()?.drawCalls > 0)
    const layout = await page.evaluate(() => {
      const viewport = document.getElementById('room-viewport').getBoundingClientRect()
      const panel = document.getElementById('monitor-screen').getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth > innerWidth, separate: panel.left >= viewport.right - 1 }
    })
    record(`R4-${width}`, `room and panel remain usable at ${width}px`, !layout.overflow && layout.separate, JSON.stringify(layout))
  }

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await goto(phone, `${BASE}/?view=room`)
  await phone.waitForFunction(() => window.__saleshiRoom?.stats()?.drawCalls > 0)
  // The pose on the first frame the room reports as drawn. Before M8 the fixed-step loop could
  // render this frame without ever positioning the camera, so the room opened from the origin.
  const firstFrame = await phone.evaluate(() => {
    const { pose, station } = window.__saleshiRoom.stats()
    return { pose, station, distance: Math.hypot(pose.x, pose.y, pose.z) }
  })

  // CDP dispatches browser-trusted touch input, not synthetic DOM events or mouse movement.
  const touchState = () => phone.evaluate(() => {
    const { pose, selectedGameId, station, mode } = window.__saleshiRoom.stats()
    return {
      pose, selectedGameId, station, mode, url: location.href,
      status: document.getElementById('selection-status').textContent,
      paperOpen: document.getElementById('paper-view').open,
      scrollX, scrollY,
    }
  })
  // Station travel is eased, so the pose on the first rendered frame can still be in flight — reading
  // it there would make the 4 px-per-step drag look like a camera move. Wait for two consecutive
  // samples to agree before taking the before-state.
  await phone.waitForFunction(() => {
    const { pose } = window.__saleshiRoom.stats()
    const previous = window.__m6SettlePose
    window.__m6SettlePose = { x: pose.x, y: pose.y, z: pose.z }
    return Boolean(previous)
      && Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z) < 0.0005
  }, null, { timeout: 20000 })
  const beforeDrag = await touchState()
  const bootDrift = Math.hypot(
    beforeDrag.pose.x - firstFrame.pose.x,
    beforeDrag.pose.y - firstFrame.pose.y,
    beforeDrag.pose.z - firstFrame.pose.z,
  )
  record('R24', "the room's first drawn frame already holds the entry pose",
    firstFrame.distance > 0.5 && bootDrift < 0.001,
    `first reported frame sits ${firstFrame.distance.toFixed(3)} m from the origin at station `
    + `${firstFrame.station}; the camera moved ${bootDrift.toFixed(4)} m between that frame and rest`)
  const start = await phone.evaluate(() => {
    const canvas = document.querySelector('#room-viewport canvas')
    const rect = canvas.getBoundingClientRect()
    for (const fx of [0.3, 0.5, 0.6]) {
      for (const fy of [0.35, 0.55, 0.7]) {
        const x = Math.round(rect.left + rect.width * fx)
        const y = Math.round(rect.top + rect.height * fy)
        if (Array.from({ length: 7 }, (_, step) => document.elementFromPoint(x + step * 10, y + step * 6))
          .every((hit) => hit === canvas)) return { x, y }
      }
    }
    throw new Error('No unobstructed canvas path for the touch drag')
  })
  await phone.evaluate(() => {
    window.__m6TouchEvents = []
    window.__m6TouchListener = (event) => window.__m6TouchEvents.push({
      type: event.type, trusted: event.isTrusted, pointerType: event.pointerType, target: event.target.tagName,
    })
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(type, window.__m6TouchListener, true)
    }
  })
  const cdp = await phone.context().newCDPSession(phone)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] })
    for (let step = 1; step <= 6; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: start.x + step * 10, y: start.y + step * 6, id: 1 }],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach()
  }
  await phone.waitForTimeout(250)
  const afterDrag = await touchState()
  const touchEvents = await phone.evaluate(() => {
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.removeEventListener(type, window.__m6TouchListener, true)
    }
    return window.__m6TouchEvents
  })
  record('R9a', 'emulated touch drag delivers trusted touch pointer events to the canvas',
    touchEvents.some((event) => event.type === 'pointerdown' && event.target === 'CANVAS')
    && touchEvents.some((event) => event.type === 'pointermove')
    && touchEvents.some((event) => event.type === 'pointerup')
    && touchEvents.every((event) => event.trusted && event.pointerType === 'touch' && event.type !== 'pointercancel'), JSON.stringify(touchEvents))
  const yawDelta = afterDrag.pose.yaw - beforeDrag.pose.yaw
  const pitchDelta = afterDrag.pose.pitch - beforeDrag.pose.pitch
  record('R9b', 'touch drag changes actual camera yaw and pitch', yawDelta > 0.02 && pitchDelta < -0.02,
    JSON.stringify({ before: beforeDrag.pose, after: afterDrag.pose, yawDelta, pitchDelta }))
  const dragDiff = {}
  for (const key of ['selectedGameId', 'station', 'mode', 'url', 'status', 'paperOpen', 'scrollX', 'scrollY']) {
    if (beforeDrag[key] !== afterDrag[key]) dragDiff[key] = `${beforeDrag[key]} -> ${afterDrag[key]}`
  }
  const dragDrift = Math.hypot(
    afterDrag.pose.x - beforeDrag.pose.x,
    afterDrag.pose.y - beforeDrag.pose.y,
    afterDrag.pose.z - beforeDrag.pose.z,
  )
  if (dragDrift >= 0.001) dragDiff.pose = `${dragDrift.toFixed(4)} m`
  record('R9c', 'touch drag does not accidentally select, travel, open a note or scroll the page',
    beforeDrag.selectedGameId === null && afterDrag.selectedGameId === null
    && afterDrag.station === beforeDrag.station && afterDrag.mode === beforeDrag.mode
    && afterDrag.url === beforeDrag.url && afterDrag.status === beforeDrag.status
    && !afterDrag.paperOpen && afterDrag.scrollX === beforeDrag.scrollX && afterDrag.scrollY === beforeDrag.scrollY
    && dragDrift < 0.001,
    JSON.stringify(dragDiff))

  await phone.locator('.proxy[data-interact-id="the-last-witness"]').tap()
  await phone.waitForTimeout(1000)
  const mobile = await phone.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const viewport = document.getElementById('room-viewport').getBoundingClientRect()
    const panel = document.getElementById('monitor-screen').getBoundingClientRect()
    return {
      layout: window.__saleshiRoom.stats().panelLayout,
      separate: panel.top >= viewport.bottom - 1,
      panelRatio: panel.height / stage.height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }
  })
  record('R5', 'phone selection uses a bounded drawer instead of covering the room', mobile.layout === 'drawer'
    && mobile.separate && mobile.panelRatio <= 0.46 && !mobile.overflow, JSON.stringify(mobile))
  await phone.screenshot({ path: OUT('m6-02-phone-panel.png'), fullPage: true })

  await phone.setViewportSize({ width: 844, height: 390 })
  await goto(phone, `${BASE}/?view=room&game=the-last-witness`)
  await phone.waitForFunction(() => window.__saleshiRoom?.stats()?.selectedGameId === 'the-last-witness' && window.__saleshiRoom.stats().drawCalls > 0)
  await phone.waitForTimeout(1000)
  const landscape = await phone.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const viewport = document.getElementById('room-viewport').getBoundingClientRect()
    const panelElement = document.getElementById('monitor-screen')
    const panel = panelElement.getBoundingClientRect()
    const controls = document.getElementById('room-controls').getBoundingClientRect()
    return {
      width: innerWidth, height: innerHeight,
      layout: window.__saleshiRoom.stats().panelLayout,
      roomWidth: viewport.width, roomHeight: viewport.height,
      stageTop: stage.top, stageBottom: stage.bottom, controlsBottom: controls.bottom,
      separate: panel.left >= viewport.right - 1,
      contained: panel.top >= stage.top - 1 && panel.bottom <= stage.bottom + 1
        && panel.left >= stage.left - 1 && panel.right <= stage.right + 1,
      firstViewport: stage.top >= 0 && stage.bottom <= innerHeight + 1 && controls.bottom <= innerHeight + 1,
      overflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
      panelOverflow: panelElement.scrollWidth > panelElement.clientWidth + 1,
    }
  })
  record('R10', 'landscape phone room, panel and controls fit 844x390 without overflow',
    landscape.width === 844 && landscape.height === 390 && landscape.layout === 'side'
    && landscape.roomWidth >= 200 && landscape.roomHeight >= 192 && landscape.separate
    && landscape.contained && landscape.firstViewport && !landscape.overflow && !landscape.panelOverflow, JSON.stringify(landscape))
  await phone.screenshot({ path: OUT('m6-08-phone-landscape.png'), fullPage: true })
  await phone.close()

  const noWebgl = await browser.newContext()
  await noWebgl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).includes('webgl') ? null : original.call(this, type, ...args)
    }
  })
  const fallback = await noWebgl.newPage()
  await goto(fallback, `${ROUTES_BASE}/`)
  record('R6', 'no-WebGL entry retains useful catalogue navigation and no fake room control', await fallback.locator('#stage').isHidden()
    && await fallback.locator('[data-action="enter-room"]').isDisabled()
    && await fallback.locator('.game-card h3 a').count() === 1)
  await noWebgl.close()

  const saveData = await browser.newContext()
  await saveData.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }))
  const reduced = await saveData.newPage()
  await goto(reduced, `${BASE}/`)
  // Under a reduced-data preference the room module is never loaded at all, so absence of the hook
  // counts as not running rather than throwing.
  record('R7', 'reduced-data preference starts the text view with an optional room launcher', !(await reduced.evaluate(() => window.__saleshiRoom?.isRunning?.() ?? false))
    && (await reduced.locator('#room-status').textContent()).includes('reduced data')
    && await reduced.locator('[data-action="enter-room"]').isEnabled())
  await saveData.close()

  const noJs = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await noJs.newPage()
  await goto(staticPage, `${ROUTES_BASE}/`)
  const noJsState = {
    cards: await staticPage.locator('.game-card h3 a').count(),
    launcherHidden: await staticPage.locator('#room-launcher').isHidden(),
    statusHidden: await staticPage.locator('#room-status').isHidden(),
    storeVisible: await staticPage.getByRole('link', { name: 'Store', exact: true }).isVisible(),
  }
  record('R8', 'no-JS homepage has real shared content and no dead room launcher', noJsState.cards === 1
    && noJsState.launcherHidden && noJsState.statusHidden && noJsState.storeVisible, JSON.stringify(noJsState))
  await noJs.close()
} catch (error) {
  record('R0', 'route and fallback suite completed without an exception', false, error.stack)
}

// Still audit all real pages if a dev-only room check failed (for example, an HMR outage).
try {
  await auditRealPages(browser)
} catch (error) {
  record('R13', 'real-page audit completed without an exception', false, error.stack)
}

// The accessibility numbers are measured here rather than asserted in a document, because both of them
// are properties of the finished CSS rather than of the source: a later colour change or a shorter
// label can move a route under the floor without touching a line of markup.
try {
  await auditAccessibility(browser)
} catch (error) {
  record('R23', 'accessibility audit completed without an exception', false, error.stack)
} finally {
  await browser.close()
}

const failed = results.filter((result) => !result.pass)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exitCode = 1
