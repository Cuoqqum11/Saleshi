import { createHash, randomBytes } from 'node:crypto'

export class InputError extends Error {
  constructor(message, field) {
    super(message)
    this.status = 400
    this.field = field
  }
}

function validAmount(offering, value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return false
  const text = String(value)
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) return false
  const amount = Number(text)
  if (!Number.isFinite(amount)) return false
  if (offering.pricing.model !== 'pay-what-you-want') return true
  return amount >= offering.pricing.minimum && amount <= offering.pricing.maximum
}

export async function quoteCart(repository, submittedLines) {
  if (!Array.isArray(submittedLines) || submittedLines.length === 0 || submittedLines.length > 50) {
    throw new InputError('The cart must contain between 1 and 50 lines.')
  }
  const seen = new Set()
  const lines = []
  for (const submitted of submittedLines) {
    if (!submitted || typeof submitted.offeringId !== 'string') {
      throw new InputError('Each cart line must contain a unique offering identifier.')
    }
    const offering = await repository.getOffering(submitted.offeringId)
    if (!offering?.available) throw new InputError('A cart offering is unknown or unavailable.')
    if (seen.has(offering.id)) throw new InputError('Each cart line must contain a unique offering identifier.')
    seen.add(offering.id)
    if (!validAmount(offering, submitted.amount)) {
      throw new InputError(`${offering.title} needs an amount between ${offering.pricing.minimum} and ${offering.pricing.maximum} ${offering.pricing.currency}, with at most two decimal places.`)
    }
    const amount = offering.pricing.model === 'fixed'
      ? Number(offering.pricing.amount)
      : Number(submitted.amount)
    lines.push({
      offeringId: offering.id,
      title: offering.title,
      amount,
      lineTotal: amount,
      currency: offering.pricing.currency,
    })
  }
  const currencies = new Set(lines.map((line) => line.currency))
  if (currencies.size !== 1) throw new InputError('All offerings in an order must use the same currency.')
  const total = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100
  return { lines, currency: lines[0].currency, total, checkoutMode: 'simulated' }
}

export function validateCustomer(customer) {
  const name = typeof customer?.name === 'string' ? customer.name.trim() : ''
  const email = typeof customer?.email === 'string' ? customer.email.trim().toLowerCase() : ''
  if (name.length < 2 || name.length > 100) throw new InputError('Enter a name between 2 and 100 characters.', 'name')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InputError('Enter a valid email address for this demonstration order.', 'email')
  }
  return { name, email }
}

export function createOrderReference() {
  return `SAL-${randomBytes(16).toString('hex').toUpperCase()}`
}

export function validateIdempotencyKey(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new InputError('A valid checkout interaction identifier is required.')
  }
  return value.toLowerCase()
}

export function createOrderFingerprint(customer, quote) {
  const canonical = JSON.stringify({
    customer,
    currency: quote.currency,
    total: quote.total,
    lines: quote.lines.map(({ offeringId, amount, lineTotal }) => ({ offeringId, amount, lineTotal })),
  })
  return createHash('sha256').update(canonical).digest('hex')
}
