/**
 * The DOM focus-proxy layer.
 *
 * Every interactive object in the 3D scene gets a real <button> placed on top of it by
 * projecting the object's world position to screen coordinates once per frame. That single
 * mechanism supplies keyboard focus, visible focus rings, `aria-label`s, `aria-current`
 * state and screen-reader semantics without rendering any text or control as geometry —
 * which is the reason the room can satisfy accessibility requirements instead of merely
 * claiming to.
 *
 * An object that is outside the current view is *not* removed from the tab order. Its proxy
 * is clamped to the nearest edge and marked, so moving the camera can never strand a
 * keyboard user with nothing to focus.
 */

import * as THREE from 'three'

const EDGE_PADDING = 10
const SAMPLE_SIZE = 60
// A point behind the camera projects to a mirrored, meaningless position, so every object the
// visitor has turned away from lands on almost the same pixel. Clamped chips are therefore
// spread down the edge instead of being left to stack: stacked chips meant two of the three
// interactive objects could not be clicked from the shelf.
const CLAMPED_GAP = 6
/**
 * Marking a chip as clamped appends the CSS `::after` text " (edge of view)" or " (behind you)",
 * which measured 76 px wider on the shortest label. The chip is therefore wider *after* it has
 * been placed than the measurement used to place it, so the allowance is reserved on the frame it
 * changes state and dropped once the measured width already includes the suffix.
 */
const CLAMPED_SUFFIX_WIDTH = 84

export function createFocusProxy({ camera, layer, entries, onSelect, onHoverFromDom }) {
  const projected = new THREE.Vector3()
  const viewport = { width: 0, height: 0 }
  const buttons = new Map()
  const timings = []
  let selectedId = null

  for (const entry of entries) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'proxy'
    button.dataset.interactId = entry.id
    button.textContent = entry.shortLabel
    button.setAttribute('aria-label', `${entry.label}. ${entry.hint}`)
    button.addEventListener('click', () => onSelect(entry.id, { source: 'keyboard-or-pointer-on-proxy' }))
    button.addEventListener('pointerenter', () => onHoverFromDom(entry.id))
    button.addEventListener('pointerleave', () => onHoverFromDom(null))
    button.addEventListener('focus', () => onHoverFromDom(entry.id))
    button.addEventListener('blur', () => onHoverFromDom(null))
    layer.append(button)
    buttons.set(entry.id, { button, entry })
  }

  function place(id, x, y, clamped, hint) {
    const record = buttons.get(id)
    if (!record) return
    const { button } = record
    button.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
    button.classList.toggle('is-clamped', clamped)
    button.dataset.edgeHint = clamped ? hint : ''
    record.clamped = clamped
  }

  /**
   * Reads every chip size before writing any transform. Interleaving the two would force the
   * browser to lay out the layer once per object, once per frame.
   */
  function measure() {
    const items = []
    for (const { button, entry } of buttons.values()) {
      const world = entry.anchor
        ? entry.anchor.clone()
        : entry.object.getWorldPosition(projected)
      world.project(camera)
      items.push({
        entry,
        width: button.offsetWidth,
        height: button.offsetHeight,
        x: (world.x * 0.5 + 0.5) * viewport.width,
        y: (-world.y * 0.5 + 0.5) * viewport.height,
        behind: world.z > 1,
      })
    }
    return items
  }

  return {
    update(viewportWidth, viewportHeight) {
      const started = performance.now()
      viewport.width = viewportWidth
      viewport.height = viewportHeight

      const limitX = viewportWidth - EDGE_PADDING
      const limitY = viewportHeight - EDGE_PADDING
      const items = measure()

      const clamped = []
      for (const item of items) {
        const { entry, x, y, behind } = item
        const offscreen = behind
          || x < EDGE_PADDING + item.width / 2
          || x > limitX - item.width / 2
          || y < EDGE_PADDING + item.height / 2
          || y > limitY - item.height / 2
        if (offscreen) {
          item.hint = behind ? 'behind you' : 'edge of view'
          clamped.push(item)
        } else {
          place(entry.id, x, y, false, '')
        }
      }

      let rowBottom = EDGE_PADDING
      for (const item of clamped.sort((a, b) => a.y - b.y)) {
        const allowance = buttons.get(item.entry.id).clamped ? 0 : CLAMPED_SUFFIX_WIDTH
        const halfWidth = Math.min(item.width + allowance, viewportWidth - EDGE_PADDING * 2) / 2
        const x = Math.min(limitX - halfWidth, Math.max(EDGE_PADDING + halfWidth, item.x))
        const y = Math.max(rowBottom + item.height / 2, EDGE_PADDING + item.height / 2)
        rowBottom = y + item.height / 2 + CLAMPED_GAP
        place(item.entry.id, x, Math.min(y, limitY - item.height / 2), true, item.hint)
      }

      timings.push(performance.now() - started)
      if (timings.length > SAMPLE_SIZE) timings.shift()
    },

    setSelected(id) {
      selectedId = id
      for (const [key, { button }] of buttons) {
        if (key === selectedId) button.setAttribute('aria-current', 'true')
        else button.removeAttribute('aria-current')
      }
    },

    getMetrics() {
      if (!timings.length) return { samples: 0, averageMs: 0, worstMs: 0 }
      const sorted = [...timings].sort((a, b) => a - b)
      return {
        samples: timings.length,
        averageMs: Number((timings.reduce((sum, value) => sum + value, 0) / timings.length).toFixed(3)),
        worstMs: Number(sorted[sorted.length - 1].toFixed(3)),
      }
    },

    dispose() {
      for (const { button } of buttons.values()) button.remove()
      buttons.clear()
    },
  }
}
