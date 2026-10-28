/**
 * The readable paper view.
 *
 * A native `<dialog>` is most of the mechanism: `showModal()` gives focus trapping and Esc to
 * close for free, and the content stays real HTML — cloned from the text that already exists in
 * the page, never baked into a texture and never duplicated in JS.
 * Opening it touches neither the camera nor the selection, so closing returns the visitor to
 * exactly the room they left.
 */

export function createPaperView({ dialog, titleEl, bodyEl, sources, onOpen, onClose }) {
  let trigger = null

  function open(id) {
    const source = sources[id]
    if (!source) return false
    titleEl.textContent = source.title
    const content = source.content()
    if (content.querySelector) {
      for (const exclude of content.querySelectorAll('[data-note-exclude]')) exclude.remove()
    }
    bodyEl.replaceChildren(content)
    trigger = document.activeElement
    dialog.showModal()
    onOpen?.(id)
    return true
  }

  dialog.addEventListener('close', () => {
    // The clone is discarded; the page's own copy of the text was never moved.
    bodyEl.replaceChildren()
    // Chromium leaves focus on the close button of a closed dialog, so the return is done here
    // rather than trusted to the engine: someone who opened a note with Enter has to land back on
    // that note's chip, not on a hidden control.
    if (trigger && trigger !== document.body && trigger.isConnected && typeof trigger.focus === 'function') {
      trigger.focus()
    }
    trigger = null
    onClose?.()
  })

  return { open, isOpen: () => dialog.open }
}
