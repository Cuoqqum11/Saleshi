/**
 * Browser cart state. Lines contain an offering and one contribution amount — never a meaningless
 * quantity for voluntary support. localStorage makes navigation and reloads recover the same cart;
 * storage failure simply leaves an in-memory cart for the current tab.
 *
 * Amounts here are for display only. The server revalidates every line and recomputes the total.
 */
import { offeringById } from '../data/offerings.js'
import { roundMoney } from './money.js'

const STORAGE_KEY = 'saleshi-cart-v1'
const listeners = new Set()
const hasWindow = typeof window !== 'undefined'

export function isValidContribution(offering, value) {
  if (!offering?.available) return false
  const amount = Number(value)
  if (!Number.isFinite(amount)) return false
  const { minimum, maximum, model } = offering.pricing
  if (model !== 'pay-what-you-want') return true
  return amount >= minimum && amount <= maximum
    && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8
}

function amountFor(offering, value) {
  if (offering.pricing.model === 'fixed') return offering.pricing.amount
  const amount = Number(value)
  if (!isValidContribution(offering, amount)) {
    throw new Error(`Choose an amount between ${offering.pricing.minimum} and ${offering.pricing.maximum} ${offering.pricing.currency}, with at most two decimal places.`)
  }
  return roundMoney(amount)
}

function readStoredCart() {
  if (!hasWindow) return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((line) => {
      const offering = offeringById(line?.offeringId)
      if (!offering?.available || !isValidContribution(offering, line?.amount)) return []
      return [{ offeringId: offering.id, amount: amountFor(offering, line.amount) }]
    })
  } catch {
    return []
  }
}

let lines = readStoredCart()

function syncBadges() {
  if (!hasWindow) return
  const count = String(lines.length)
  for (const badge of document.querySelectorAll('[data-cart-count]')) {
    badge.textContent = `(${count})`
    badge.hidden = false
  }
}

function commit(nextLines) {
  lines = nextLines
  if (hasWindow) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // The current tab still has a working cart when storage is unavailable.
    }
  }
  syncBadges()
  for (const listener of listeners) listener(getCartLines())
}

export function getCartLines() {
  return lines.map((line) => ({ ...line }))
}

export function getCartDetails() {
  return lines.map((line) => {
    const offering = offeringById(line.offeringId)
    return { ...line, offering, lineTotal: line.amount }
  })
}

export function getCartTotal() {
  return roundMoney(lines.reduce((total, line) => total + line.amount, 0))
}

export function addToCart(offeringId, value) {
  const offering = offeringById(offeringId)
  if (!offering?.available) throw new Error('This offering is not available.')
  const amount = amountFor(offering, value)
  const existing = lines.find((line) => line.offeringId === offeringId)
  if (existing) {
    commit(lines.map((line) => line.offeringId === offeringId ? { offeringId, amount } : line))
  } else {
    commit([...lines, { offeringId, amount }])
  }
  return { offeringId, amount }
}

export function updateCartAmount(offeringId, value) {
  const offering = offeringById(offeringId)
  if (!offering || !lines.some((line) => line.offeringId === offeringId)) {
    throw new Error('This offering is not in the cart.')
  }
  const amount = amountFor(offering, value)
  commit(lines.map((line) => line.offeringId === offeringId ? { offeringId, amount } : line))
}

export function removeFromCart(offeringId) {
  commit(lines.filter((line) => line.offeringId !== offeringId))
}

export function clearCart() {
  commit([])
}

export function subscribeToCart(listener) {
  listeners.add(listener)
  syncBadges()
  listener(getCartLines())
  return () => listeners.delete(listener)
}

if (hasWindow) syncBadges()
