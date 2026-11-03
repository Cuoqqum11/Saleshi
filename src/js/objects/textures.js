/**
 * Procedural surfaces.
 *
 * Every texture here is drawn into a canvas at load time, so the room ships no image assets of its
 * own and the whole environment still fits in a few hundred kilobytes of code. The one photographic
 * input is the studio's own game artwork, drawn into a printed card by `coverCardTexture`.
 *
 * The noise is seeded. Two runs of `tests/e2e/visual.mjs` therefore see the same grain, which is
 * what makes a before/after pair a comparison rather than a coincidence.
 */

import * as THREE from 'three'
import { palette } from '../room/palette.js'

function rng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(size) {
  const element = document.createElement('canvas')
  element.width = size
  element.height = size
  return element
}

function toTexture(element, { repeat = [1, 1], srgb = true, anisotropy = 4 } = {}) {
  const texture = new THREE.CanvasTexture(element)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

/**
 * A plank of timber: long grain, a few knots, worn seams between boards.
 *
 * Returns a colour map and a roughness map built from the same strokes, so the grain that catches
 * the light is the grain you can see. `planks` is how many boards share one tile, which is what
 * makes the same generator serve a wide floor and a narrow shelf edge — the repeat is chosen per
 * surface so the wood never appears at the same scale twice in one room.
 */
export function woodMaps({ size = 256, planks = 2, base = '#45301f', dark = '#2f2115', light = '#6a4d31', seed = 1 } = {}) {
  const random = rng(seed)
  const colour = canvas(size)
  const rough = canvas(size)
  const ctx = colour.getContext('2d')
  const rtx = rough.getContext('2d')

  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  rtx.fillStyle = '#8a8a8a'
  rtx.fillRect(0, 0, size, size)

  const band = size / planks
  for (let plank = 0; plank < planks; plank += 1) {
    const top = plank * band
    const tint = 0.9 + random() * 0.25
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top, size, band)
    ctx.clip()
    ctx.fillStyle = base
    ctx.globalAlpha = tint
    ctx.fillRect(0, top, size, band)
    ctx.globalAlpha = 1

    // Grain: long, slightly wavy strokes that run the length of the board. The alpha is low because
    // these strokes tile: at the first pass's contrast a 1.5 m shelf board showed forty visible waves
    // and read as a wood-effect laminate rather than timber.
    for (let line = 0; line < 30; line += 1) {
      const y = top + random() * band
      const weight = 0.4 + random() * 1.6
      const alpha = 0.02 + random() * 0.07
      ctx.strokeStyle = random() > 0.45 ? dark : light
      ctx.globalAlpha = alpha
      ctx.lineWidth = weight
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= size; x += size / 6) {
        ctx.quadraticCurveTo(x + size / 12, y + (random() - 0.5) * band * 0.1, x + size / 6, y + (random() - 0.5) * band * 0.06)
      }
      ctx.stroke()
      rtx.strokeStyle = random() > 0.5 ? '#c8c8c8' : '#5e5e5e'
      rtx.globalAlpha = alpha * 1.6
      rtx.lineWidth = weight
      rtx.beginPath()
      rtx.moveTo(0, y)
      rtx.lineTo(size, y)
      rtx.stroke()
    }
    ctx.globalAlpha = 1
    rtx.globalAlpha = 1

    // One knot per board at most, drawn as concentric rings.
    if (random() > 0.45) {
      const kx = random() * size
      const ky = top + band * (0.25 + random() * 0.5)
      for (let ring = 5; ring > 0; ring -= 1) {
        ctx.strokeStyle = dark
        ctx.globalAlpha = 0.1 + ring * 0.03
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(kx, ky, ring * 2.6, ring * 1.7, 0.3, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()

    // The seam between boards: darker, and rougher where the finish has worn.
    ctx.fillStyle = dark
    ctx.globalAlpha = 0.55
    ctx.fillRect(0, top, size, 1.5)
    ctx.globalAlpha = 1
    rtx.fillStyle = '#e0e0e0'
    rtx.fillRect(0, top, size, 2)
  }

  // A little overall wear so no region is a flat fill.
  for (let speck = 0; speck < size * 3; speck += 1) {
    ctx.fillStyle = random() > 0.5 ? light : dark
    ctx.globalAlpha = 0.03 + random() * 0.05
    ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1)
  }
  ctx.globalAlpha = 1

  return {
    map: colour,
    roughnessMap: rough,
  }
}

/**
 * Wall plaster: far quieter than paper, and deliberately without the paper generator's blotches.
 *
 * The first lighting pass reused `paperMaps` for the walls, and at a 0.9 m tile its 26 radial
 * blotches became 6–22 cm swirls that repeat visibly up a 7 m wall — the "printed wallpaper" tell the
 * material notes warn about. Plaster only needs enough grain to stop being a flat fill, so this is
 * fine speckle plus one very low-contrast mottle, and it is drawn at a larger tile on top of that.
 */
export function plasterMaps({ size = 256, base = '#6b5a45', seed = 11 } = {}) {
  const random = rng(seed)
  const colour = canvas(size)
  const ctx = colour.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  for (let pass = 0; pass < 5; pass += 1) {
    const gradient = ctx.createRadialGradient(
      random() * size, random() * size, size * 0.1,
      random() * size, random() * size, size * (0.4 + random() * 0.3),
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0.018)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }

  for (let grain = 0; grain < size * 2; grain += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    ctx.fillRect(random() * size, random() * size, 1, 1)
  }
  return { map: colour }
}

/** Woven paper fibre: low contrast on purpose, because a noisy sheet reads as dirt. */
export function paperMaps({ size = 256, base = '#efe3cb', seed = 7 } = {}) {
  const random = rng(seed)
  const colour = canvas(size)
  const ctx = colour.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  for (let blotch = 0; blotch < 26; blotch += 1) {
    const gradient = ctx.createRadialGradient(
      random() * size, random() * size, 1,
      random() * size, random() * size, 18 + random() * 46,
    )
    gradient.addColorStop(0, 'rgba(150, 128, 96, 0.05)')
    gradient.addColorStop(1, 'rgba(150, 128, 96, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  for (let fibre = 0; fibre < size * 2; fibre += 1) {
    ctx.strokeStyle = random() > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(120,100,72,0.12)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    const x = random() * size
    const y = random() * size
    ctx.moveTo(x, y)
    ctx.lineTo(x + (random() - 0.5) * 7, y + (random() - 0.5) * 7)
    ctx.stroke()
  }
  return { map: colour }
}

/**
 * The suggestion of a printed page.
 *
 * This is the one place a paper object gets ink on it, and it deliberately prints nothing that can be
 * read: a heading block, a rule, and rows of grey at varying widths. The words themselves are DOM —
 * `src/js/ui/paperView.js` clones the real HTML out of `index.html` when the sheet is selected — so a
 * visitor who cannot see the 3D object loses nothing, and nobody can mistake a texture for the
 * document. What the print does buy is the recognition that the sheet is a *document* rather than a
 * blank, which a cream rectangle on a wall does not on its own communicate.
 *
 * Aspect is A-series (0.707), so one generator serves the A4 letter and the A5 note.
 */
export function printedPageCanvas({ variant = 'letter', width = 256, height = 362, seed = 41 } = {}) {
  const random = rng(seed)
  const element = canvas(1)
  element.width = width
  element.height = height
  const ctx = element.getContext('2d')
  const maps = paperMaps({ size: 128, base: palette.paper, seed })
  ctx.drawImage(maps.map, 0, 0, width, height)

  const margin = Math.round(width * 0.11)
  const column = width - margin * 2
  const ink = 'rgba(38, 30, 22, 0.72)'
  const rule = 'rgba(38, 30, 22, 0.3)'

  // Heading block and the rule under it: the shape every letter has at the top.
  ctx.fillStyle = ink
  ctx.fillRect(margin, margin, column * 0.52, 9)
  ctx.fillStyle = rule
  ctx.fillRect(margin, margin + 16, column, 1.5)

  let y = margin + 30
  let row = 0
  while (y < height - margin - 18) {
    if (variant === 'note' && row % 3 === 0) {
      ctx.fillStyle = ink
      ctx.fillRect(margin, y + 1, 4, 4)
      ctx.fillStyle = rule
      ctx.fillRect(margin + 10, y, column * (0.62 + random() * 0.3), 4.5)
    } else {
      // A paragraph ends short of the measure, so the last row of a block is narrower.
      const width2 = row % 5 === 4 ? column * (0.35 + random() * 0.25) : column * (0.86 + random() * 0.14)
      ctx.fillStyle = rule
      ctx.fillRect(margin, y, width2, 4.5)
    }
    y += (row % 5 === 4 ? 17 : 11)
    row += 1
  }

  // A signature: a short squiggle, not a name.
  ctx.strokeStyle = ink
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(margin, height - margin - 6)
  for (let x = 0; x < 5; x += 1) {
    ctx.quadraticCurveTo(
      margin + x * 9 + 4, height - margin - 6 - (6 + random() * 8),
      margin + (x + 1) * 9, height - margin - 6 - random() * 4,
    )
  }
  ctx.stroke()
  return element
}

/**
 * The printed card that goes on the front of a game case: the studio's own frame as the artwork, the
 * title beneath it, and a window cut clean through the lower band so the cassette inside is visible.
 * The cut is what makes it a J-card rather than a sticker — and it is why the card is drawn with
 * transparency instead of being painted opaque and trimmed.
 *
 * The layout is a fixed vertical stack, in fractions of the card height: artwork, then the title, then
 * the window. `cassette.js` places the tape in world space against those same fractions, so the card
 * and the object behind it cannot drift apart.
 *
 * Nothing here is invented: the image is a real capture of the real build and the strings come from
 * the game record.
 */
export const CARD_LAYOUT = { artBottom: 0.42, titleBottom: 0.76, windowTop: 0.76 }

export function coverCardCanvas({
  image, title, subtitle = '', width = 320, height = 456, windowInset = 0.13,
}) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  const ctx = element.getContext('2d')
  const ink = '#17130f'
  const paper = palette.paper

  const artBottom = Math.round(height * CARD_LAYOUT.artBottom)
  const titleBottom = Math.round(height * CARD_LAYOUT.titleBottom)

  ctx.fillStyle = paper
  ctx.fillRect(0, 0, width, height)

  if (image) {
    // Cover, not letterbox: the frame is cropped centred rather than squashed to fit.
    const sourceRatio = image.width / image.height
    const targetRatio = width / artBottom
    let sx = 0
    let sy = 0
    let sw = image.width
    let sh = image.height
    if (sourceRatio > targetRatio) {
      sw = image.height * targetRatio
      sx = (image.width - sw) / 2
    } else {
      sh = image.width / targetRatio
      sy = (image.height - sh) / 2
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, artBottom)
  } else {
    // No artwork supplied for this record: the band stays a flat printed field, not a fake screenshot.
    ctx.fillStyle = '#22301d'
    ctx.fillRect(0, 0, width, artBottom)
  }

  ctx.fillStyle = 'rgba(23,19,15,0.45)'
  ctx.fillRect(0, artBottom, width, 2)

  // Status line first, then the title: the window band starts exactly where the title band ends, so
  // nothing in this region may be allowed to grow downwards.
  ctx.font = '500 13px ui-monospace, monospace'
  ctx.fillStyle = 'rgba(23,19,15,0.6)'
  ctx.textBaseline = 'top'
  // The subtitle comes from the game record (its status label). No studio name is printed, because
  // the studio's own name is still a placeholder in the shared data.
  ctx.fillText(subtitle.toUpperCase(), 14, artBottom + 6)

  // Title: wrapped to at most two lines, then shrunk until it fits both the card width and the band.
  const maxWidth = width - 28
  const bandTop = artBottom + 26
  const bandHeight = titleBottom - bandTop
  let fontSize = 56
  let lines = []
  for (;;) {
    ctx.font = `600 ${fontSize}px ui-monospace, monospace`
    lines = wrapLines(ctx, title, maxWidth)
    if (lines.length > 2) lines = [lines[0], `${lines[1].slice(0, 14)}…`]
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width))
    if ((widest <= maxWidth && lines.length * fontSize * 1.14 <= bandHeight) || fontSize <= 16) break
    fontSize -= 2
  }
  ctx.fillStyle = ink
  lines.forEach((line, index) => {
    ctx.fillText(line, 14, bandTop + index * fontSize * 1.14)
  })

  // The window, cut through the bottom band. The fraction is shared with `cassette.js`, which places
  // the tape behind it in world space.
  const cutTop = Math.round(height * CARD_LAYOUT.windowTop)
  const inset = width * windowInset
  ctx.clearRect(inset, cutTop, width - inset * 2, height - cutTop)
  ctx.strokeStyle = 'rgba(23,19,15,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(inset, cutTop, width - inset * 2, height - cutTop)

  ctx.strokeStyle = 'rgba(23,19,15,0.22)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3)
  return element
}

function wrapLines(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const word of String(text).split(' ')) {
    const next = `${line} ${word}`.trim()
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * The spine: the strip folded over the top edge of the card, which is the part that faces out when
 * cases are packed together. It carries the title horizontally, because a real J-card spine is
 * wide enough to read from the front of a shelf.
 */
export function spineCanvas({ title, width = 512, height = 72, background = '#efe3cb', text = '#17130f' }) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  const ctx = element.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(23,19,15,0.16)'
  ctx.fillRect(0, 0, width, 3)
  ctx.fillRect(0, height - 3, width, 3)

  ctx.fillStyle = text
  ctx.textBaseline = 'middle'
  let fontSize = 34
  ctx.font = `600 ${fontSize}px ui-monospace, monospace`
  while (ctx.measureText(title).width > width - 26 && fontSize > 10) {
    fontSize -= 2
    ctx.font = `600 ${fontSize}px ui-monospace, monospace`
  }
  ctx.fillText(title, (width - ctx.measureText(title).width) / 2, height / 2)
  return element
}

export function textureFrom(canvasElement, options) {
  return toTexture(canvasElement, options)
}
