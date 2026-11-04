/**
 * Lossless image re-encode for the artwork this site publishes, run at build time on the bundle.
 *
 * Why this exists as code rather than as a one-off edit: the three frames are screenshots of a
 * flat-shaded Godot game, and measuring them (npm run assets:report) showed they use 87, 104 and
 * 190 distinct colours while being stored as 24-bit truecolor — three bytes per pixel for something
 * that needs a palette index. Re-encoding as an indexed PNG removes the redundant bytes a lossless
 * codec was paying for every frame, and because the palette is built from the colours actually
 * present, the decoded picture is byte-for-byte the same. Nothing here is a quality trade: no
 * quantisation, no resampling, no format change.
 *
 * It is a build step, not a repo edit, so the studio's captured frames stay in `public/` exactly as
 * they were made. The bundle carries the optimised copy; the source of record does not change.
 *
 * Deliberate limits, each of which makes a refusal rather than a guess:
 *   - Only unanimated truecolor (colour type 2), bit depth 8, non-interlaced PNGs are eligible.
 *     Paletted PNG has no general alpha, so type 6 is left alone rather than approximated.
 *   - A file with more than 256 distinct colours is refused. Fitting one to a palette is
 *     quantisation, which is a different decision with different consequences.
 *   - A file carrying gAMA, cHRM, iCCP, sRGB or a second IHDR is refused, because re-serialising
 *     would drop the colour specification and quietly shift how the image renders.
 *   - Only the directories listed in `dirs` below are visited. The Godot web export is served
 *     byte-for-byte and `npm run game:check` hashes it, so the pipeline must never touch it.
 *
 * Usage:
 *   npm run assets:report              measured before/after for the committed originals
 *   npm run assets:check               fail if the committed frames are no longer eligible
 *   (build) rewrite eligible files in dist/, verified by decoding each result
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Bytes per pixel for the PNG colour types this file understands.
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

// Chunks that change how the pixels are interpreted. Dropping one would alter the picture.
const COLOUR_CRITICAL = new Set(['gAMA', 'cHRM', 'iCCP', 'sRGB', 'sBIT'])

export function readPng(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    return { error: 'not a PNG' }
  }
  const chunks = []
  const idat = []
  let off = SIGNATURE.length
  while (off + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(off)
    const type = buffer.toString('ascii', off + 4, off + 8)
    const data = buffer.subarray(off + 8, off + 8 + length)
    chunks.push({ type, data })
    if (type === 'IDAT') idat.push(data)
    off += 12 + length
  }
  const header = chunks.find((chunk) => chunk.type === 'IHDR')?.data
  if (!header) return { error: 'PNG has no IHDR' }
  return {
    chunks,
    idat: Buffer.concat(idat),
    width: header.readUInt32BE(0),
    height: header.readUInt32BE(4),
    depth: header[8],
    color: header[9],
    compression: header[10],
    filter: header[11],
    interlace: header[12],
  }
}

/** Reverses the per-scanline filters so the pixel bytes can be examined or re-used. */
function unfilter(raw, width, height, channels) {
  const stride = width * channels
  const image = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const row = image.subarray(y * stride, (y + 1) * stride)
    const above = y > 0 ? image.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0
      const b = above[x]
      const c = x >= channels ? above[x - channels] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        value += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      }
      row[x] = value & 0xff
    }
  }
  return image
}

/** Applies one scanline filter and returns the filtered bytes. */
function applyFilter(row, above, channels, filter) {
  const out = Buffer.alloc(row.length)
  for (let x = 0; x < row.length; x++) {
    const a = x >= channels ? row[x - channels] : 0
    const b = above[x]
    const c = x >= channels ? above[x - channels] : 0
    let value = row[x]
    if (filter === 1) value -= a
    else if (filter === 2) value -= b
    else if (filter === 3) value -= (a + b) >> 1
    else if (filter === 4) {
      const p = a + b - c
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      value -= (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
    }
    out[x] = value & 0xff
  }
  return out
}

function shannonEntropy(bytes) {
  const counts = new Array(256).fill(0)
  for (const byte of bytes) counts[byte] += 1
  let entropy = 0
  for (const count of counts) {
    if (count) entropy -= (count / bytes.length) * Math.log2(count / bytes.length)
  }
  return entropy
}

/**
 * Chooses a filter per scanline by the entropy it leaves behind. A measured comparison of this
 * against the shipped files' own filter choices is what made the palette pass worth doing at all,
 * so the number here is not a guess about which filter heuristic to use.
 */
function filterScanlines(image, width, height, channels) {
  const stride = width * channels
  const parts = []
  let above = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const row = image.subarray(y * stride, (y + 1) * stride)
    let best = null
    for (const filter of [0, 1, 2, 3, 4]) {
      const filtered = applyFilter(row, above, channels, filter)
      const entropy = shannonEntropy(filtered)
      if (best === null || entropy < best.entropy) best = { filter, filtered, entropy }
    }
    parts.push(Buffer.from([best.filter]), best.filtered)
    above = row
  }
  return Buffer.concat(parts)
}

/** Builds the palette from the colours present and returns the index bytes, or null if too many. */
function toIndexed(rgb, width, height) {
  const indexes = Buffer.alloc(width * height)
  const palette = new Map()
  for (let pixel = 0, offset = 0; pixel < indexes.length; pixel += 1, offset += 3) {
    const colour = (rgb[offset] << 16) | (rgb[offset + 1] << 8) | rgb[offset + 2]
    let index = palette.get(colour)
    if (index === undefined) {
      index = palette.size
      if (index > 255) return null
      palette.set(colour, index)
    }
    indexes[pixel] = index
  }
  const paletteBytes = Buffer.alloc(palette.size * 3)
  let at = 0
  for (const [colour, index] of palette) {
    if (index !== at / 3) return null // a Map iteration order mismatch would mis-map every pixel
    paletteBytes[at] = (colour >> 16) & 0xff
    paletteBytes[at + 1] = (colour >> 8) & 0xff
    paletteBytes[at + 2] = colour & 0xff
    at += 3
  }
  return { indexes, palette: paletteBytes, entries: palette.size }
}

let crcTable
function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let crc = -1
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

/** Wraps `data` in a PNG chunk: length, type, payload and a big-endian CRC over type + payload. */
export function pngChunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  // Big-endian, like every other integer in a PNG stream. A little-endian CRC here produces a file
  // that this module's own reader accepts and every real decoder rejects, which is exactly how it
  // first behaved until the browser check in tests/e2e/game-builds.mjs caught it.
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function pngBuffer(width, height, depth, color, body) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = depth
  ihdr[9] = color
  return Buffer.concat([SIGNATURE, pngChunk('IHDR', ihdr), ...body, pngChunk('IEND', Buffer.alloc(0))])
}

// Binary kibibytes, because that is what the division is. The site's own published sizes use the
// looser "MB" label, which `src/js/data/builds.js` measures; this line is only ever read in a
// terminal, so here the unit is stated exactly.
const bytes = (count) => `${(count / 1024).toFixed(1)} KiB`

/**
 * Decodes a PNG to raw RGB.
 *
 * This is the encoder's own decoder, so it is enough to verify the module against itself; the
 * browser-side check in `tests/e2e/game-builds.mjs` compares the same pixels through Chromium's
 * independent PNG decoder before anything ships.
 */
export function decodeToRgb(png) {
  const channels = CHANNELS[png.color]
  const raw = zlib.inflateSync(png.idat)
  if (png.color === 3) {
    const indexes = unfilter(raw, png.width, png.height, 1)
    const table = png.chunks.find((chunk) => chunk.type === 'PLTE')?.data
    if (!table) return null
    const rgb = Buffer.alloc(indexes.length * 3)
    for (let i = 0; i < indexes.length; i++) {
      const at = indexes[i] * 3
      rgb[i * 3] = table[at]
      rgb[i * 3 + 1] = table[at + 1]
      rgb[i * 3 + 2] = table[at + 2]
    }
    return rgb
  }
  if (png.color !== 2) return null
  return unfilter(raw, png.width, png.height, channels)
}

/**
 * Re-encodes one PNG as indexed if — and only if — that is provably lossless.
 * Returns `{ buffer, entries, bytesBefore, bytesAfter, reason }`; `reason` says why a refusal
 * happened when the buffer comes back unchanged.
 */
export function optimisePng(buffer) {
  const png = readPng(buffer)
  const before = buffer.length
  const unchanged = (reason, extra = {}) => ({
    buffer, bytesBefore: before, bytesAfter: before, reason, changed: false, ...extra,
  })

  if (png.error) return unchanged(png.error)
  if (png.depth !== 8) return unchanged(`bit depth ${png.depth}, only 8 is handled`)
  if (png.interlace !== 0) return unchanged('interlaced (Adam7) file')
  if (png.color !== 2) return unchanged(`colour type ${png.color}, only truecolor without alpha is handled`)
  const unsafe = png.chunks.filter((chunk) => COLOUR_CRITICAL.has(chunk.type))
  if (unsafe.length) return unchanged(`carries ${unsafe.map((c) => c.type).join('/')}, which re-serialising would drop`)
  if (png.chunks.some((chunk) => chunk.type === 'tRNS')) return unchanged('has a tRNS chunk')

  const rgb = decodeToRgb(png)
  const indexed = toIndexed(rgb, png.width, png.height)
  if (!indexed) return unchanged('more than 256 distinct colours, so a palette would have to approximate')

  const filtered = filterScanlines(indexed.indexes, png.width, png.height, 1)
  const idat = zlib.deflateSync(filtered, { level: 9 })
  const encoded = pngBuffer(png.width, png.height, 8, 3, [
    pngChunk('PLTE', indexed.palette),
    pngChunk('IDAT', idat),
  ])

  // Trust, then verify: the rewritten file is decoded and compared to the original pixel-for-pixel
  // before anything is allowed to ship it.
  const roundTrip = decodeToRgb(readPng(encoded))
  if (!roundTrip || Buffer.compare(roundTrip, rgb) !== 0) {
    return unchanged('re-encode did not round-trip to identical pixels')
  }
  if (encoded.length >= before) return unchanged(`indexed re-encode was not smaller (${bytes(before)} → ${bytes(encoded.length)})`,
    { entries: indexed.entries })

  return {
    buffer: encoded, changed: true, entries: indexed.entries, width: png.width, height: png.height,
    bytesBefore: before, bytesAfter: encoded.length, reason: `palette of ${indexed.entries} colours`,
  }
}

/** Every PNG under the given directory, sorted, with paths relative to the given root. */
export function listPngs(dir, root = dir) {
  if (!fs.existsSync(dir)) return []
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...listPngs(full, root))
    else if (entry.name.toLowerCase().endsWith('.png')) found.push(path.relative(root, full))
  }
  return found
}

// Only the artwork this project owns. The Godot export under game/web is served byte-for-byte, so
// adding it here would break npm run game:check as well as the claim that the build is untouched.
const PIPELINE_DIRS = ['game/screenshots']

function runOn(outDir, { write }) {
  const rows = []
  for (const relative of PIPELINE_DIRS) {
    for (const file of listPngs(path.join(outDir, relative), outDir)) {
      const full = path.join(outDir, file)
      const result = optimisePng(fs.readFileSync(full))
      if (write && result.changed) fs.writeFileSync(full, result.buffer)
      rows.push({ file: file.split(path.sep).join('/'), ...result, written: write && result.changed })
    }
  }
  return rows
}

function report(rows, label) {
  const before = rows.reduce((total, row) => total + row.bytesBefore, 0)
  const after = rows.reduce((total, row) => total + (row.changed ? row.bytesAfter : row.bytesBefore), 0)
  for (const row of rows) {
    const size = row.changed
      ? `${bytes(row.bytesBefore)} → ${bytes(row.bytesAfter)} (${row.reason}${row.written ? ', written' : ', not written'})`
      : `${bytes(row.bytesBefore)} [left as-is: ${row.reason}]`
    console.log(`  ${row.file}  ${size}`)
  }
  const saved = before ? (100 - (after / before) * 100).toFixed(1) : '0.0'
  console.log(`${label}: ${rows.length} PNG(s), ${bytes(before)} → ${bytes(after)} (−${saved}%).`)
  return { before, after, rows }
}

// A plain `argv.length` guard would also fire if something imported this module and set argv, so the
// comparison is against this file's own path.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  const rows = runOn(path.join(ROOT, 'public'), { write: false })
  const refused = rows.filter((row) => !row.changed)
  if (process.argv.includes('--check')) {
    if (refused.length) {
      console.error(`The asset pipeline now refuses ${refused.length} of ${rows.length} committed frame(s):`)
      for (const row of refused) console.error(`  ${row.file}: ${row.reason}`)
      console.error('A refusal is the pipeline protecting the picture, not a fault to switch off: a refused frame ships '
        + 'exactly as captured. Re-run `npm run assets:report` to see why, and record the new split in docs/assets.md.')
      process.exitCode = 1
    } else {
      report(rows, 'assets:check')
      console.log('Every committed frame is still eligible for the lossless palette pass.')
    }
  } else {
    report(rows, 'assets:report')
    if (refused.length) console.log(`${refused.length} of ${rows.length} frame(s) are left as-captured; see the reasons above.`)
  }
}

/**
 * Vite plugin: after the bundle is written, losslessly re-encode this project's own PNGs inside it.
 * The source files in public/ are not modified, so `dist/` is smaller while the repository still
 * holds the frames exactly as they were captured.
 */
export function assetPipelinePlugin() {
  let outDir = null
  return {
    name: 'asset-pipeline',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (!outDir) return
      const rows = runOn(outDir, { write: true })
      if (!rows.length) return
      report(rows, `asset-pipeline (${path.basename(outDir)})`)
    },
  }
}
