/**
 * Selection state, deliberately framework-free.
 *
 * The 3D room, the accessibility proxies and the Vue screen panel all read and write
 * selection through this module. Keeping it outside Vue means constrained free movement
 * (Milestone 2) and any later interface can drive the same state without rewriting the
 * selection or accessibility systems.
 */

import { gameById, games } from '../data/games.js'

const listeners = new Set()
let selectedId = null

function writeUrl(id) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('game', id)
  else url.searchParams.delete('game')
  // replaceState, not pushState: selecting a tape should not fill the history stack.
  window.history.replaceState(null, '', url)
}

function notify(reason) {
  const game = selectedId ? gameById(selectedId) : null
  for (const listener of listeners) listener(game, reason)
}

export function selectGame(id, { source = 'programmatic', updateUrl = true } = {}) {
  const game = gameById(id)
  if (!game) return null
  const changed = game.id !== selectedId
  selectedId = game.id
  if (updateUrl) writeUrl(game.id)
  if (changed) notify(source)
  return game
}

export function clearSelection({ updateUrl = true } = {}) {
  if (!selectedId) return
  selectedId = null
  if (updateUrl) writeUrl(null)
  notify('cleared')
}

export function getSelectedGame() {
  return selectedId ? gameById(selectedId) : null
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Reads ?game=<id> so a shared or reloaded URL restores the same selection. */
export function restoreFromUrl() {
  const requested = new URL(window.location.href).searchParams.get('game')
  if (!requested) return null
  return selectGame(requested, { source: 'url', updateUrl: false })
}

export function listGames() {
  return games
}
