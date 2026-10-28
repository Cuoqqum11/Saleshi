/**
 * Pointer handling: drag to look, tap to interact.
 *
 * Pointer Lock is deliberately not used. Locking the cursor would hide it, break the hover
 * feedback the interaction model depends on, and have no touch equivalent. A small movement
 * threshold separates a drag from a click instead, which keeps `click` meaning "interact".
 */

import * as THREE from 'three'

const DRAG_THRESHOLD_PX = 6

export function createPicking({ element, camera, targets, controller, onSelect, onHoverChange }) {
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let lastPointer = { x: 0, y: 0 }
  let pressed = null
  let dragging = false
  let hoveredId = null
  let hoverDirty = false
  let enabled = true

  function interactIdFromHit(hit) {
    let object = hit.object
    while (object) {
      if (object.userData?.interactId) return object.userData.interactId
      object = object.parent
    }
    return null
  }

  function castAt(clientX, clientY) {
    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height) return []
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    return raycaster.intersectObjects(targets, true)
  }

  function onPointerDown(event) {
    if (!enabled || (event.button !== undefined && event.button > 0)) return
    pressed = { x: event.clientX, y: event.clientY, id: event.pointerId }
    dragging = false
  }

  function onPointerMove(event) {
    lastPointer = { x: event.clientX, y: event.clientY }
    if (!enabled) return
    if (pressed && pressed.id === event.pointerId) {
      const dx = event.clientX - pressed.x
      const dy = event.clientY - pressed.y
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragging = true
      if (dragging) {
        // Deltas come from the recorded position, not event.movement*, which is 0 for touch.
        controller.setLookDelta(dx, dy)
        pressed = { x: event.clientX, y: event.clientY, id: event.pointerId }
      }
      return
    }
    hoverDirty = true
  }

  function onPointerUp(event) {
    if (!enabled || !pressed || pressed.id !== event.pointerId) return
    const wasDrag = dragging
    pressed = null
    dragging = false
    if (wasDrag) return
    const hit = castAt(event.clientX, event.clientY)[0]
    const id = hit ? interactIdFromHit(hit) : null
    if (id) onSelect(id, { source: 'pointer' })
  }

  function onPointerLeave() {
    pressed = null
    dragging = false
    if (hoveredId !== null) {
      hoveredId = null
      onHoverChange(null)
    }
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerleave', onPointerLeave)
  // A pointer released outside the stage still has to end the drag.
  window.addEventListener('pointerup', onPointerUp)

  return {
    /** Called from the render loop, and only when the pointer has actually moved. */
    refreshHover() {
      if (!hoverDirty || !enabled || pressed) return
      hoverDirty = false
      const hit = castAt(lastPointer.x, lastPointer.y)[0]
      const id = hit ? interactIdFromHit(hit) : null
      if (id !== hoveredId) {
        hoveredId = id
        onHoverChange(id)
      }
    },

    /** Lets a hovered DOM proxy light up the 3D object it stands for. */
    setHoverFromDom(id) {
      if (id === hoveredId) return
      hoveredId = id
      onHoverChange(id)
    },

    setEnabled(value) {
      enabled = value
      if (!value) onPointerLeave()
    },

    dispose() {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerup', onPointerUp)
    },
  }
}
