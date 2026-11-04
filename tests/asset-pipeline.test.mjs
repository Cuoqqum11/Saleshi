/**
 * Tests for the build-time image pipeline.
 *
 * The property worth defending is not "the files got smaller" but "the files got smaller without
 * the picture changing", and every refusal rule exists because some future frame could break it.
 * So the suite pins three things: the committed frames still pass the lossless test, the guards
 * still say no when a frame would not, and the bundle boundary — this project's artwork is
 * rewritten while the studio's exported game build is served untouched.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import test from 'node:test'

import { decodeToRgb, listPngs, optimisePng, pngChunk, readPng } from '../scripts/asset-pipeline.mjs'
import { gameBuilds } from '../src/js/data/builds.js'
import { games } from '../src/js/data/games.js'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const at = (relative) => path.join(ROOT, relative.split('/').join(path.sep))

function ihdr({ width, height, depth = 8, color = 2, interlace = 0 }) {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = depth
  data[9] = color
  data[12] = interlace
  return data
}

/** Assembles a PNG from raw, already-filtered scanlines so each case can control one header field. */
function makePng(header, body, raw) {
  return Buffer.concat([
    SIGNATURE,
    pngChunk('IHDR', ihdr(header)),
    ...body,
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** A width×height truecolor image whose pixel colours come from `colourAt(x, y)`. */
function truecolor(width, height, colourAt) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * 3)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colourAt(x, y)
      row[x * 3] = r
      row[x * 3 + 1] = g
      row[x * 3 + 2] = b
    }
    rows.push(Buffer.from([0]), row) // filter 0 (None), so the pixels are exactly what the test says
  }
  return makePng({ width, height }, [], Buffer.concat(rows))
}

const sha256file = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  stream.on('error', reject)
  stream.on('data', (chunk) => hash.update(chunk))
  stream.on('end', () => resolve(hash.digest('hex')))
})

test('every frame this site publishes is eligible for the lossless palette pass', () => {
  const referenced = games.flatMap((game) => [
    game.cover?.url,
    ...(game.screenshots ?? []).map((shot) => shot.url),
  ].filter(Boolean).map((url) => url.replace(/^\/+/, '')))
  assert.ok(referenced.length >= 3, `expected the game records to reference artwork, found ${referenced.length}`)
  for (const relative of new Set(referenced)) {
    const filePath = at(path.posix.join('public', relative))
    assert.ok(existsSync(filePath), `${relative} is referenced by a game record but is not in public/`)
    const result = optimisePng(readFileSync(filePath))
    assert.ok(result.changed, `${relative} was refused: ${result.reason}`)
    assert.ok(result.bytesAfter < result.bytesBefore, `${relative} was rewritten larger, which the pipeline refuses to ship`)
  }
})

test('a rewritten frame is the same picture, pixel for pixel', () => {
  const files = listPngs(at('public/game/screenshots'))
  assert.ok(files.length >= 3, `expected the three committed frames, found ${files.length}`)
  for (const file of files) {
    const buffer = readFileSync(at(path.posix.join('public/game/screenshots', file)))
    const result = optimisePng(buffer)
    assert.equal(result.changed, true, `${file}: ${result.reason}`)
    assert.deepEqual(
      [...decodeToRgb(readPng(result.buffer))],
      [...decodeToRgb(readPng(buffer))],
      `${file} did not survive the rewrite unchanged`,
    )
  }
})

test('the encoder refuses what it cannot do losslessly', () => {
  const fourPixels = Buffer.concat([Buffer.from([0]), Buffer.alloc(12)])
  const cases = [
    ['a file that is not a PNG', Buffer.from('this is not a PNG')],
    ['more than 256 distinct colours', truecolor(17, 16, (x, y) => {
      const i = y * 17 + x
      return [i & 0xff, (i >> 8) * 7, (i * 3) & 0xff]
    })],
    ['alpha (colour type 6)', makePng({ width: 2, height: 2, color: 6 }, [], Buffer.concat([Buffer.from([0]), Buffer.alloc(8)]))],
    ['a bit depth other than 8', makePng({ width: 2, height: 2, depth: 4 }, [], fourPixels)],
    ['an interlaced scan', makePng({ width: 2, height: 2, interlace: 1 }, [], fourPixels)],
    ['a gAMA declaration', makePng({ width: 2, height: 2 },
      [pngChunk('gAMA', Buffer.from([0, 0, 182, 136]))], fourPixels)],
    ['an sRGB declaration', makePng({ width: 2, height: 2 }, [pngChunk('sRGB', Buffer.from([0]))], fourPixels)],
    ['a tRNS declaration', makePng({ width: 2, height: 2 }, [pngChunk('tRNS', Buffer.from([255, 0]))], fourPixels)],
  ]
  for (const [what, buffer] of cases) {
    const result = optimisePng(buffer)
    assert.equal(result.changed, false, `the pipeline accepted ${what}: ${result.reason}`)
    assert.ok(result.reason, `refusing ${what} has to say why`)
    assert.equal(Buffer.compare(result.buffer, buffer), 0, `refusing ${what} must still hand back the original bytes`)
  }
})

test('a frame inside the palette limit is accepted and is left alone the second time', () => {
  const buffer = truecolor(64, 48, (x, y) => ((x + y) % 2 ? [12, 34, 56] : [240, 200, 160]))
  const result = optimisePng(buffer)
  assert.equal(result.changed, true, result.reason)
  assert.equal(result.entries, 2)
  assert.equal(readPng(result.buffer).color, 3, 'the rewrite should be an indexed PNG')
  assert.deepEqual([...decodeToRgb(readPng(result.buffer))], [...decodeToRgb(readPng(buffer))])
  const again = optimisePng(result.buffer)
  assert.equal(again.changed, false, 're-running the pipeline on its own output must be a no-op, not a second rewrite')
})

test('a rewrite that would not actually save anything is refused', () => {
  // Two colours over four pixels: the palette and its chunk header cost more than the three
  // bytes-per-pixel they save. Shipping it anyway would be churn for no gain, so the size test
  // catches it and the original goes out unchanged.
  const buffer = truecolor(4, 4, (x, y) => ((x + y) % 2 ? [12, 34, 56] : [240, 200, 160]))
  const result = optimisePng(buffer)
  assert.equal(result.changed, false)
  assert.match(result.reason, /not smaller/)
})

test('npm run assets:check passes on the committed frames', () => {
  const run = listPngs(at('public/game/screenshots'))
    .map((file) => ({ file, result: optimisePng(readFileSync(at(path.posix.join('public/game/screenshots', file)))) }))
  const refused = run.filter(({ result }) => !result.changed)
  assert.deepEqual(refused, [], `the pipeline refuses ${refused.length} committed frame(s): ${refused.map((r) => `${r.file}: ${r.result.reason}`).join('; ')}`)
})

test('every chunk the encoder writes carries the CRC a reader expects', () => {
  // The pipeline verifies its own output by decoding it with its own reader, so a mistake shared by
  // writer and reader would pass unnoticed. Node's CRC is a second opinion from outside this module:
  // a little-endian CRC here produced files the pipeline accepted and browsers refused.
  const walk = (buffer) => {
    const found = []
    let off = SIGNATURE.length
    while (off + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(off)
      const type = buffer.toString('ascii', off + 4, off + 8)
      const payload = buffer.subarray(off + 8, off + 8 + length)
      found.push({ type, payload, crc: buffer.readUInt32BE(off + 8 + length) })
      off += 12 + length
    }
    return found
  }
  const buffers = listPngs(at('public/game/screenshots'))
    .map((file) => ({ file, source: readFileSync(at(path.posix.join('public/game/screenshots', file))) }))
  assert.ok(buffers.length >= 3)
  for (const { file, source } of buffers) {
    const result = optimisePng(source)
    assert.equal(result.changed, true, `${file}: ${result.reason}`)
    for (const chunk of walk(result.buffer)) {
      const expected = zlib.crc32(Buffer.concat([Buffer.from(chunk.type, 'ascii'), chunk.payload])) >>> 0
      assert.equal(chunk.crc, expected, `${file}: ${chunk.type} chunk CRC does not match zlib.crc32`)
    }
  }
})

test('the bundle carries the optimised frames and the studio export untouched', async () => {
  const dist = at('dist')
  if (!existsSync(dist)) return 'skipped: no dist/ — run `npm run build` before asserting against a bundle'
  const relative = 'game/screenshots/the-last-witness-evidence-register.png'
  const built = readPng(readFileSync(at(path.posix.join('dist', relative))))
  const source = readPng(readFileSync(at(path.posix.join('public', relative))))
  assert.equal(built.color, 3, `${relative} in dist/ should be the indexed rewrite`)
  assert.equal(source.color, 2, `${relative} in public/ should still be the captured original`)
  assert.deepEqual([...decodeToRgb(built)], [...decodeToRgb(source)], `${relative} changed pixels between public/ and dist/`)
  for (const member of gameBuilds.web.files) {
    const filePath = path.join(dist, 'game/web', member.name)
    assert.ok(existsSync(filePath), `dist/ is missing ${member.name}`)
    assert.equal(await sha256file(filePath), member.sha256,
      `the asset pipeline must not touch the Godot export: ${member.name} no longer matches the measured record`)
  }
})
