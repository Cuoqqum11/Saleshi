/**
 * Public-metadata tests (M8 §11.3, §11.4).
 *
 * These check the *rules* the metadata module is built on rather than a snapshot of its output: a
 * snapshot test passes when a fabricated value is added to a record, which is the exact failure mode
 * §9 and §2.3 forbid. Each case therefore either pins the property set that is allowed to exist, or
 * proves that a missing fact removes the property instead of leaving an empty one behind.
 *
 * `tests/e2e/routes.mjs` R18 then checks the same modules against what the built pages actually
 * serve, so a page that never received its metadata fails too.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { games, gameById } from '../src/js/data/games.js'
import { offeringsForGame } from '../src/js/data/offerings.js'
import { studio } from '../src/js/data/studio.js'
import {
  absoluteHost, catalogueJsonLd, documentUrl, gameJsonLd, organizationJsonLd,
  serializeJsonLd, socialTags, webSiteJsonLd,
} from '../src/js/data/metadata.js'

const here = dirname(fileURLToPath(import.meta.url))
const realGame = gameById('the-last-witness')

/**
 * Every key set a generated document is allowed to carry, by `@type`. A type has more than one entry
 * where it appears both as its own document and embedded in another one — `Organization` is a
 * description-bearing document on the homepage and a bare name-and-url credit inside the game record.
 */
const allowList = {
  Organization: [
    ['@context', '@type', 'name', 'description', 'url'],
    ['@type', 'name', 'url'],
  ],
  WebSite: [['@context', '@type', 'name', 'description', 'url']],
  ItemList: [['@context', '@type', 'numberOfItems', 'itemListElement']],
  ListItem: [['@type', 'position', 'name', 'url']],
  VideoGame: [['@context', '@type', 'name', 'description', 'url', 'genre', 'gamePlatform',
    'isAccessibleForFree', 'downloadUrl', 'creator']],
}

/**
 * Names that would turn this site into a claim about a commercial identity it does not have:
 * a contact route, a mark, an audience figure, a verdict, or a price.
 */
const forbidden = ['logo', 'image', 'email', 'address', 'telephone', 'sameAs', 'offers', 'price',
  'priceCurrency', 'aggregateRating', 'ratingValue', 'reviewCount', 'review', 'award', 'datePublished',
  'twitter', 'downloadCount', 'playerCount', 'contentRating', 'trailer']

/** Every object in a document, including nested ones, so a forbidden key cannot hide at depth two. */
function objects(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => objects(item, found))
  else if (value && typeof value === 'object') {
    found.push(value)
    Object.values(value).forEach((item) => objects(item, found))
  }
  return found
}

/** URLs whose origin this site has not been given, i.e. everything except the schema.org vocabulary. */
function origins(value, found = []) {
  for (const object of objects(value)) {
    for (const [key, item] of Object.entries(object)) {
      if (typeof item === 'string' && /:\/\//.test(item) && key !== '@context') found.push(`${key}=${item}`)
    }
  }
  return found
}

const documents = () => [
  organizationJsonLd(),
  webSiteJsonLd(),
  catalogueJsonLd(),
  ...games.map((game) => gameJsonLd(game)),
]

test('every generated document is valid JSON that round-trips unchanged', () => {
  for (const document of documents()) {
    const text = serializeJsonLd(document)
    assert.deepEqual(JSON.parse(text), document)
  }
})

test('serialised JSON-LD carries no character that could close its script element', () => {
  const text = serializeJsonLd({ s: realGame.cover.provenance, n: '<script>alert(1)</script>', a: 'a & b' })
  for (const character of ['<', '>', '&']) assert.equal(text.includes(character), false, character)
  assert.deepEqual(JSON.parse(text), { s: realGame.cover.provenance, n: '<script>alert(1)</script>', a: 'a & b' })
})

test('each document type carries only its allowed properties', () => {
  for (const document of documents()) {
    for (const object of objects(document)) {
      const shapes = allowList[object['@type']]
      assert.ok(shapes, `unexpected @type ${JSON.stringify(object['@type'])}`)
      const keys = Object.keys(object).sort()
      const matched = shapes.some((shape) => JSON.stringify(shape.slice().sort()) === JSON.stringify(keys))
      assert.ok(matched, `${object['@type']} carries ${keys.join(', ')}, which is not a permitted shape`)
    }
  }
})

test('no document asserts a contact route, a mark, a figure, a verdict or a price', () => {
  const found = objects(documents()).flatMap((object) => Object.keys(object).filter((key) => forbidden.includes(key)))
  assert.deepEqual(found, [])
})

test('while no host is configured, every URL is a path rather than an origin', () => {
  assert.equal(studio.web.canonicalBaseUrl, null)
  assert.equal(absoluteHost(), null)
  assert.deepEqual(origins(documents()), [])
  for (const object of objects(catalogueJsonLd())) {
    if (object.url) assert.match(object.url, /^\//)
  }
})

test('one configured host makes every structured-data URL absolute, without a doubled slash', () => {
  const previous = studio.web.canonicalBaseUrl
  try {
    studio.web.canonicalBaseUrl = 'https://host.example.test/'
    assert.equal(absoluteHost(), 'https://host.example.test')
    assert.equal(documentUrl('/games/'), 'https://host.example.test/games/')
    for (const document of documents()) {
      const absolute = objects(document).flatMap((object) => Object.entries(object)
        .filter(([, value]) => typeof value === 'string' && value.includes('.test/'))
        .map(([, value]) => value))
      assert.ok(absolute.length > 0)
      for (const value of absolute) {
        assert.ok(value.startsWith('https://host.example.test/'), value)
        assert.equal(value.includes('test//'), false, value)
      }
    }
  } finally {
    studio.web.canonicalBaseUrl = previous
  }
})

test('a record with no answer removes the property instead of emitting an empty one', () => {
  const noGenre = gameJsonLd({ ...realGame, genre: null })
  assert.equal('genre' in noGenre, false)
  const noPlatforms = gameJsonLd({ ...realGame, platforms: [] })
  assert.equal('gamePlatform' in noPlatforms, false)
  const noDownload = gameJsonLd({
    ...realGame,
    availability: { ...realGame.availability, download: { ...realGame.availability.download, available: false } },
  })
  assert.equal('downloadUrl' in noDownload, false)
  assert.equal(gameJsonLd(null), null)
})

test('the catalogue lists exactly the published records, in shelf order', () => {
  const list = catalogueJsonLd()
  const ordered = games.slice().sort((a, b) => a.slot - b.slot)
  assert.equal(list.numberOfItems, games.length)
  assert.equal(list.itemListElement.length, games.length)
  list.itemListElement.forEach((item, index) => {
    assert.equal(item.position, index + 1)
    assert.equal(item.name, ordered[index].title)
    assert.equal(item.url, ordered[index].page)
  })
})

test('the game document repeats the record and claims nothing beside it', () => {
  const document = gameJsonLd(realGame)
  assert.equal(document.name, realGame.title)
  assert.equal(document.description, realGame.summary)
  assert.equal(document.url, realGame.page)
  assert.equal(document.downloadUrl, realGame.availability.download.url)
  assert.equal(document.creator.name, studio.name)
  // `isAccessibleForFree` is only true while nothing on the site charges for the game. A fixed-price
  // offering would make this property a false claim, so the assertion fails rather than the page.
  assert.equal(document.isAccessibleForFree, true)
  for (const game of games) {
    for (const offering of offeringsForGame(game.id)) {
      assert.notEqual(offering.pricing.model, 'fixed', `${offering.id} would make free access untrue`)
    }
  }
})

test('social tags repeat the page title and description and withhold what needs a host', () => {
  const tags = socialTags({ path: '/games/', title: 'Games catalogue — Saleshi', description: 'A catalogue.' })
  const map = Object.fromEntries(tags)
  assert.deepEqual(Object.keys(map), ['og:type', 'og:site_name', 'og:title', 'og:description'])
  assert.equal(map['og:title'], 'Games catalogue — Saleshi')
  assert.equal(map['og:description'], 'A catalogue.')
  assert.equal(map['og:site_name'], studio.name)
  assert.equal('og:image' in map, false)
})

test('the sharing image waits for both a host and the studio approving the artwork', () => {
  const image = { ...realGame.cover }
  const previous = studio.web.canonicalBaseUrl
  try {
    studio.web.canonicalBaseUrl = 'https://host.example.test'
    const unapproved = Object.fromEntries(socialTags({ path: '/games/the-last-witness/', title: 'T', description: 'D', image: { ...image, shareApproved: false } }))
    assert.equal(unapproved['og:url'], 'https://host.example.test/games/the-last-witness/')
    assert.equal('og:image' in unapproved, false)
    const approved = Object.fromEntries(socialTags({ path: '/x/', title: 'T', description: 'D', image: { ...image, shareApproved: true } }))
    assert.equal(approved['og:image'], `https://host.example.test${image.url}`)
    assert.equal(approved['og:image:alt'], image.alt)
    assert.equal(approved['og:image:width'], String(image.width))
    assert.equal(approved['og:image:height'], String(image.height))
  } finally {
    studio.web.canonicalBaseUrl = previous
  }
})

test('stated image dimensions are the dimensions of the files being served', () => {
  const media = [realGame.cover, ...realGame.screenshots]
  for (const item of media) {
    const bytes = readFileSync(join(here, '..', `public${item.url}`))
    assert.equal(bytes.readUInt32BE(16), item.width, `${item.url} width`)
    assert.equal(bytes.readUInt32BE(20), item.height, `${item.url} height`)
    assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG')
  }
})
