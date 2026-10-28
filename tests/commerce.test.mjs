import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import mysql from 'mysql2/promise'
import { createRepository } from '../server/repository.js'
import {
  InputError,
  createOrderFingerprint,
  createOrderReference,
  quoteCart,
  validateCustomer,
  validateIdempotencyKey,
} from '../server/commerce.js'

if (existsSync('.env')) process.loadEnvFile('.env')
process.env.DB_DRIVER ??= 'memory'
const repository = createRepository()
after(() => repository.close())
console.log(`Repository under test: ${repository.driver}`)
const validLine = { offeringId: 'studio-support', amount: 5 }
const validCustomer = { name: 'Test User', email: 'test@example.com' }

async function validOrder(overrides = {}) {
  const quote = await quoteCart(repository, [validLine])
  return {
    reference: createOrderReference(),
    customerName: validCustomer.name,
    customerEmail: validCustomer.email,
    currency: quote.currency,
    total: quote.total,
    lines: quote.lines,
    idempotencyKey: randomUUID(),
    requestHash: createOrderFingerprint(validCustomer, quote),
    ...overrides,
  }
}

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
    [validLine, { offeringId: 'STUDIO-SUPPORT', amount: 5 }],
  ]
  for (const lines of invalidCarts) {
    await assert.rejects(() => quoteCart(repository, lines), InputError)
  }
  await assert.rejects(() => quoteCart({ getOffering: async () => ({ available: false }) }, [validLine]), InputError)
  const offering = await repository.getOffering(validLine.offeringId)
  await assert.rejects(() => quoteCart({ getOffering: async () => offering }, [
    validLine, { offeringId: 'STUDIO-SUPPORT', amount: 5 },
  ]), InputError)
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

test('checkout interaction identifiers are valid UUIDs and normalised for storage', () => {
  const key = randomUUID()
  assert.equal(validateIdempotencyKey(key.toUpperCase()), key)
  for (const value of [undefined, null, '', 'not-a-uuid', 42]) {
    assert.throws(() => validateIdempotencyKey(value), InputError)
  }
})

test('order fingerprints are deterministic and change with validated order details', async () => {
  const quote = await quoteCart(repository, [validLine])
  const fingerprint = createOrderFingerprint(validCustomer, quote)
  assert.match(fingerprint, /^[a-f0-9]{64}$/)
  assert.equal(fingerprint, createOrderFingerprint({ ...validCustomer }, quote))
  assert.notEqual(fingerprint, createOrderFingerprint({ ...validCustomer, name: 'Other User' }, quote))
})

test('selected adapter creates and retrieves one order with its validated lines', async () => {
  const order = await repository.createOrder(await validOrder())
  const retrieved = await repository.findOrder(order.reference)
  assert.equal(retrieved.status, 'simulated')
  assert.equal(retrieved.total, 5)
  assert.equal(retrieved.lines.length, 1)
  assert.equal(retrieved.customerEmail, undefined)
})

test('repeating the same checkout interaction returns the original order', async () => {
  const details = await validOrder()
  const created = await repository.createOrder(details)
  const retry = await repository.createOrder({ ...details, reference: createOrderReference() })
  assert.deepEqual(retry, created)
})

test('reusing a checkout interaction for different details is rejected', async () => {
  const details = await validOrder()
  await repository.createOrder(details)
  const quote = await quoteCart(repository, [validLine])
  const changedHash = createOrderFingerprint({ ...validCustomer, name: 'Other User' }, quote)
  await assert.rejects(
    () => repository.createOrder({ ...details, reference: createOrderReference(), requestHash: changedHash }),
    (error) => error.status === 409,
  )
})

test('concurrent retries do not exhaust the connection pool or duplicate orders', { timeout: 15000 }, async () => {
  const details = await validOrder()
  const original = await repository.createOrder(details)
  const retries = await Promise.all(Array.from({ length: 12 }, () =>
    repository.createOrder({ ...details, reference: createOrderReference() })))
  assert.ok(retries.every((order) => order.reference === original.reference))
})

test('MySQL rolls back the order and first line when the second line fails', {
  skip: repository.driver !== 'mysql',
}, async () => {
  const details = await validOrder()
  details.lines.push({ offeringId: 'missing-rollback-fixture', title: 'Rollback fixture', amount: 5, lineTotal: 5 })
  await assert.rejects(() => repository.createOrder(details), (error) => error.code === 'ER_NO_REFERENCED_ROW_2')
  assert.equal(await repository.findOrder(details.reference), null)
})

test('MySQL enforces checks, preserves snapshots and restricts referenced deletion', {
  skip: repository.driver !== 'mysql' || process.env.TEST_MYSQL_CONSTRAINTS !== '1',
}, async () => {
  const order = await repository.createOrder(await validOrder())
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? 'saleshi', user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '', decimalNumbers: true,
  })
  try {
    await connection.beginTransaction()
    await assert.rejects(() => connection.execute('UPDATE orders SET total = -1 WHERE reference = ?', [order.reference]),
      (error) => error.code === 'ER_CHECK_CONSTRAINT_VIOLATED')
    await assert.rejects(() => connection.execute("UPDATE offerings SET minimum_amount = -1 WHERE id = 'studio-support'"),
      (error) => error.code === 'ER_CHECK_CONSTRAINT_VIOLATED')
    await assert.rejects(() => connection.execute('UPDATE order_lines SET line_total = -1 WHERE order_id = (SELECT id FROM orders WHERE reference = ?)', [order.reference]),
      (error) => error.code === 'ER_CHECK_CONSTRAINT_VIOLATED')
    await assert.rejects(() => connection.execute("DELETE FROM offerings WHERE id = 'studio-support'"),
      (error) => error.code === 'ER_ROW_IS_REFERENCED_2')
    await connection.execute("UPDATE offerings SET title = 'Temporary test title', available = FALSE WHERE id = 'studio-support'")
    const [lines] = await connection.execute('SELECT offering_title, unit_amount FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE reference = ?)', [order.reference])
    assert.equal(lines[0].offering_title, order.lines[0].title)
    assert.equal(lines[0].unit_amount, order.lines[0].amount)
    const [counts] = await connection.execute('SELECT COUNT(*) AS count FROM orders WHERE reference = ?', [order.reference])
    assert.equal(counts[0].count, 1)
  } finally {
    await connection.rollback()
    await connection.end()
  }
})

test('MySQL order survives a verified application process restart', {
  skip: repository.driver !== 'mysql', timeout: 30000,
}, async (t) => {
  let child
  const start = () => new Promise((resolve, reject) => {
    child = spawn(process.execPath, ['server/index.js', '--production'], {
      env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.once('error', reject)
    child.once('exit', (code) => reject(new Error(`Server exited before readiness: ${code}`)))
    child.stdout.on('data', (data) => {
      output += data
      const match = output.match(/server: (http:\/\/127\.0\.0\.1:\d+)/)
      if (match && output.includes('Database driver: mysql')) resolve(match[1])
    })
  })
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      child.kill()
      await exited
    }
  })
  const base = await start()
  const firstPid = child.pid
  const response = await fetch(`${base}/api/orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ customer: validCustomer, lines: [validLine] }),
  })
  assert.equal(response.status, 201)
  const { order } = await response.json()
  const exited = once(child, 'exit')
  child.kill()
  await exited
  await assert.rejects(() => fetch(`${base}/api/health`))
  const restartedBase = await start()
  assert.notEqual(child.pid, firstPid)
  const retrieved = await fetch(`${restartedBase}/api/orders/${order.reference}`)
  assert.equal(retrieved.status, 200)
  assert.deepEqual((await retrieved.json()).order, order)
  t.diagnostic(`Persisted ${order.reference}; terminated PID ${firstPid}, retrieved via PID ${child.pid}`)
})
