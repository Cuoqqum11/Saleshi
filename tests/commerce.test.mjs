import test from 'node:test'
import assert from 'node:assert/strict'
import { createRepository } from '../server/repository.js'
import { InputError, createOrderReference, quoteCart, validateCustomer } from '../server/commerce.js'

process.env.DB_DRIVER = 'memory'
const repository = createRepository()
const validLine = { offeringId: 'studio-support', amount: 5 }

test('server quote recomputes the total from validated offering lines', async () => {
  const quote = await quoteCart(repository, [validLine])
  assert.equal(quote.total, 5)
  assert.equal(quote.currency, 'GBP')
  assert.equal(quote.lines[0].lineTotal, 5)
  assert.equal(quote.checkoutMode, 'simulated')
})

test('server quote rejects tampered, malformed and unavailable offerings', async () => {
  const invalidCarts = [
    [],
    [{ offeringId: 'unknown', amount: 5 }],
    [{ offeringId: 'studio-support', amount: 0.99 }],
    [{ offeringId: 'studio-support', amount: 100.01 }],
    [{ offeringId: 'studio-support', amount: 5.001 }],
    [{ offeringId: 'studio-support', amount: '' }],
    [{ offeringId: 'studio-support', amount: '5 OR 1=1' }],
    [validLine, validLine],
  ]
  for (const lines of invalidCarts) {
    await assert.rejects(() => quoteCart(repository, lines), InputError)
  }
})

test('fixed offering prices come from the server record, not the submitted amount', async () => {
  const fixedRepository = {
    async getOffering(id) {
      return id === 'fixed-test' ? {
        id, title: 'Fixed test', available: true,
        pricing: { model: 'fixed', amount: 12.5, currency: 'GBP' },
      } : null
    },
  }
  const quote = await quoteCart(fixedRepository, [{ offeringId: 'fixed-test', amount: 0.01 }])
  assert.equal(quote.total, 12.5)
})

test('customer validation trims and normalises valid values and rejects invalid values', () => {
  assert.deepEqual(validateCustomer({ name: '  Test User  ', email: ' TEST@EXAMPLE.COM ' }), {
    name: 'Test User', email: 'test@example.com',
  })
  assert.throws(() => validateCustomer({ name: 'X', email: 'test@example.com' }), InputError)
  assert.throws(() => validateCustomer({ name: 'Test User', email: 'not-an-email' }), InputError)
})

test('order references are unguessable and match the confirmation route format', () => {
  const first = createOrderReference()
  const second = createOrderReference()
  assert.match(first, /^SAL-[A-F0-9]{32}$/)
  assert.notEqual(first, second)
})

test('memory adapter creates and retrieves one order with its validated lines', async () => {
  const quote = await quoteCart(repository, [validLine])
  const order = await repository.createOrder({
    reference: createOrderReference(), customerName: 'Test User', customerEmail: 'test@example.com',
    currency: quote.currency, total: quote.total, lines: quote.lines,
  })
  const retrieved = await repository.findOrder(order.reference)
  assert.equal(retrieved.status, 'simulated')
  assert.equal(retrieved.total, 5)
  assert.equal(retrieved.lines.length, 1)
  assert.equal(retrieved.customerEmail, undefined)
})
