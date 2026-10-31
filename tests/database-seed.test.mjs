import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import mysql from 'mysql2/promise'
import { createRepository } from '../server/repository.js'
import { games } from '../src/js/data/games.js'
import { offerings } from '../src/js/data/offerings.js'

// These tests delete rows, so they need the administrative credentials; the runtime account is
// deliberately granted no DELETE. Without that file the whole file skips rather than passing.
const ADMIN_ENV_FILE = process.env.SEED_ENV_FILE ?? '.env.mysql-admin.local'
const ready = existsSync('.env') && existsSync(ADMIN_ENV_FILE)
const execFileAsync = promisify(execFile)

function readEnvFile(file) {
  const values = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (match) values[match[1]] = match[2].replace(/^"(.*)"$/, '$1')
  }
  return values
}

// process.env keeps the restricted runtime account for the whole run, so the repository paths under
// test are still exercised with the credentials the deployed server actually uses. Admin
// credentials are passed to the seed process and to the test connection without touching it.
if (existsSync('.env')) process.loadEnvFile('.env')
const adminEnv = ready ? readEnvFile(ADMIN_ENV_FILE) : {}

async function admin() {
  return mysql.createConnection({
    host: adminEnv.DB_HOST ?? process.env.DB_HOST ?? '127.0.0.1',
    port: Number(adminEnv.DB_PORT ?? process.env.DB_PORT ?? 3306),
    database: adminEnv.DB_NAME ?? process.env.DB_NAME ?? 'saleshi',
    user: adminEnv.DB_USER,
    password: adminEnv.DB_PASSWORD,
    decimalNumbers: true,
  })
}

async function seed() {
  // loadEnvFile never overrides a variable the environment already carries, and this process has
  // the runtime account's DB_USER in it, so the database variables are stripped from the child's
  // environment and read from the administrative file instead.
  const env = { ...process.env }
  for (const key of Object.keys(env)) if (key.startsWith('DB_')) delete env[key]
  env.DB_ENV_FILE = ADMIN_ENV_FILE
  const { stdout } = await execFileAsync(process.execPath, ['server/seed.js'], { env })
  return stdout.trim()
}

async function rows(sql, params = []) {
  const connection = await admin()
  try {
    const [result] = await connection.query(sql, params)
    return result
  } finally {
    await connection.end()
  }
}

const skip = ready ? false : `needs MySQL (${ADMIN_ENV_FILE} and .env)`

test('S1 seed projects the shared records into MySQL with no extra rows', { skip, timeout: 30000 }, async () => {
  const summary = await seed()
  assert.match(summary, /Seeded \d+ game and \d+ offering from the shared records/)

  const storedGames = await rows('SELECT id, slug, title, status, summary FROM games ORDER BY id')
  assert.deepEqual(
    storedGames,
    [...games].sort((a, b) => a.id.localeCompare(b.id)).map((game) => ({
      id: game.id, slug: game.slug, title: game.title, status: game.status, summary: game.summary,
    })),
    'the games table must be exactly the published records',
  )

  const storedOfferings = await rows(
    `SELECT o.id, o.game_id AS gameId, o.title, o.available, o.pricing_model AS pricingModel,
            o.currency, o.minimum_amount AS minimum, o.maximum_amount AS maximum, o.fixed_amount AS fixed
     FROM offerings o ORDER BY o.id`,
  )
  assert.deepEqual(
    storedOfferings,
    [...offerings].sort((a, b) => a.id.localeCompare(b.id)).map((offering) => ({
      id: offering.id,
      gameId: offering.gameId,
      title: offering.title,
      available: offering.available ? 1 : 0,
      pricingModel: offering.pricing.model,
      currency: offering.pricing.currency,
      minimum: offering.pricing.minimum ?? null,
      maximum: offering.pricing.maximum ?? null,
      fixed: offering.pricing.amount ?? null,
    })),
  )

  // Every offering must point at a game that exists, which is what the foreign key guarantees but
  // this checks directly after a rename.
  const orphans = await rows(
    'SELECT o.id FROM offerings o LEFT JOIN games g ON g.id = o.game_id WHERE g.id IS NULL',
  )
  assert.deepEqual(orphans, [])
})

test('S2 a superseded game row is pruned and re-running the seed changes nothing', { skip, timeout: 30000 }, async () => {
  await seed()
  await rows(
    `INSERT INTO games (id, slug, title, status, summary)
     VALUES ('m6b-superseded', 'm6b-superseded', 'Retired', 'released', 'Inserted by tests/database-seed.test.mjs')`,
  )

  const first = await seed()
  assert.match(first, /removed 1 stale game row\(s\)/, first)
  assert.deepEqual(await rows('SELECT id FROM games WHERE id = ?', ['m6b-superseded']), [])

  const before = await rows('SELECT id, slug, title, status, summary FROM games ORDER BY id')
  const beforeOfferings = await rows('SELECT id, game_id, title, available FROM offerings ORDER BY id')
  const second = await seed()
  assert.match(second, /removed 0 stale game row\(s\)/, second)
  assert.deepEqual(await rows('SELECT id, slug, title, status, summary FROM games ORDER BY id'), before)
  assert.deepEqual(await rows('SELECT id, game_id, title, available FROM offerings ORDER BY id'), beforeOfferings)
})

test('S3 an offering that leaves the records is retired, and its game survives while orders need it', {
  skip, timeout: 30000,
}, async () => {
  await seed()
  const reference = `SAL-${randomUUID().replace(/-/g, '').toUpperCase()}`

  try {
    await rows(
      `INSERT INTO games (id, slug, title, status, summary)
       VALUES ('m6b-old-game', 'm6b-old-game', 'Old', 'demo', 'Inserted by tests/database-seed.test.mjs')`,
    )
    await rows(
      `INSERT INTO offerings (id, game_id, title, available, pricing_model, currency, fixed_amount)
       VALUES ('m6b-old-offering', 'm6b-old-game', 'Old edition', TRUE, 'fixed', 'GBP', 5)`,
    )
    await rows(
      `INSERT INTO orders (reference, customer_name, customer_email, currency, total, idempotency_key, request_hash)
       VALUES (?, 'Seed Test', 'seedtest@example.com', 'GBP', 5, ?, ?)`,
      [reference, randomUUID(), '0'.repeat(64)],
    )
    const [order] = await rows('SELECT id FROM orders WHERE reference = ?', [reference])
    await rows(
      `INSERT INTO order_lines (order_id, offering_id, offering_title, unit_amount, line_total)
       VALUES (?, 'm6b-old-offering', 'Old edition', 5, 5)`,
      [order.id],
    )

    const summary = await seed()
    assert.match(summary, /retired 1 offering row\(s\)/, summary)
    assert.match(summary, /removed 0 stale game row\(s\)/, summary)

    const [offering] = await rows('SELECT available FROM offerings WHERE id = ?', ['m6b-old-offering'])
    assert.equal(offering.available, 0, 'a retired offering must stop being purchasable')
    const survivors = await rows('SELECT id FROM games WHERE id = ?', ['m6b-old-game'])
    assert.equal(
      survivors.length, 1,
      'the game must survive while an order line still references its offering',
    )

    // The server reads availability from the row on every request, so retirement is enforced
    // server-side rather than only in the interface.
    const repository = createRepository()
    try {
      const stored = await repository.getOffering('m6b-old-offering')
      assert.equal(stored.available, false)
    } finally {
      await repository.close()
    }
  } finally {
    const connection = await admin()
    try {
      await connection.query('DELETE FROM order_lines WHERE offering_id = ?', ['m6b-old-offering'])
      await connection.query('DELETE FROM orders WHERE reference = ?', [reference])
      await connection.query('DELETE FROM offerings WHERE id = ?', ['m6b-old-offering'])
      await connection.query('DELETE FROM games WHERE id = ?', ['m6b-old-game'])
    } finally {
      await connection.end()
    }
  }
})

test('S4 historical orders are untouched by seeding and still retrieve', { skip, timeout: 30000 }, async () => {
  const ordersBefore = await rows('SELECT COUNT(*) AS total FROM orders')
  const linesBefore = await rows('SELECT COUNT(*) AS total FROM order_lines')
  await seed()
  await seed()
  assert.deepEqual(await rows('SELECT COUNT(*) AS total FROM orders'), ordersBefore)
  assert.deepEqual(await rows('SELECT COUNT(*) AS total FROM order_lines'), linesBefore)

  const [earliest] = await rows(
    'SELECT reference FROM orders ORDER BY created_at ASC, id ASC LIMIT 1',
  )
  assert.ok(earliest, 'the development database has no order to retrieve')

  const repository = createRepository()
  try {
    const order = await repository.findOrder(earliest.reference)
    assert.equal(order.reference, earliest.reference)
    assert.equal(order.status, 'simulated')
    assert.ok(order.lines.length > 0)
    // A renamed game must not rewrite history: the line keeps the title sold at the time.
    assert.equal(typeof order.lines[0].title, 'string')
  } finally {
    await repository.close()
  }
})

after(async () => {
  if (!ready) return
  // Nothing left behind if a test threw between the insert and its own cleanup.
  const connection = await admin()
  try {
    await connection.query('DELETE FROM order_lines WHERE offering_id = ?', ['m6b-old-offering'])
    await connection.query('DELETE FROM offerings WHERE id LIKE ?', ['m6b-%'])
    await connection.query('DELETE FROM games WHERE id LIKE ?', ['m6b-%'])
  } finally {
    await connection.end()
  }
})
