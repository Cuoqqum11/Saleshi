import mysql from 'mysql2/promise'
import { offerings } from '../src/js/data/offerings.js'

function publicOrder(order) {
  return {
    reference: order.reference,
    currency: order.currency,
    total: Number(order.total),
    status: order.status,
    createdAt: order.createdAt,
    lines: order.lines?.map((line) => ({
      offeringId: line.offeringId,
      title: line.title,
      amount: Number(line.amount),
      lineTotal: Number(line.lineTotal),
    })) ?? [],
  }
}

function idempotencyConflict() {
  const error = new Error('This checkout reference was already used for different order details. Restart checkout and try again.')
  error.status = 409
  return error
}

function memoryRepository() {
  const orders = new Map()
  const orderKeys = new Map()
  let nextId = 1
  return {
    driver: 'memory',
    async ping() {},
    async getOffering(id) {
      return offerings.find((offering) => offering.id === id) ?? null
    },
    async createOrder(order) {
      const existingReference = orderKeys.get(order.idempotencyKey)
      if (existingReference) {
        const existing = orders.get(existingReference)
        if (existing.requestHash !== order.requestHash) throw idempotencyConflict()
        return publicOrder(existing)
      }
      if (orders.has(order.reference)) throw new Error('Order reference collision.')
      const stored = {
        ...order,
        id: nextId++,
        status: 'simulated',
        createdAt: new Date().toISOString(),
      }
      orders.set(order.reference, stored)
      orderKeys.set(order.idempotencyKey, order.reference)
      return publicOrder(stored)
    },
    async findOrder(reference) {
      const order = orders.get(reference)
      return order ? publicOrder(order) : null
    },
    async close() {},
  }
}

function mysqlRepository() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? 'saleshi',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    connectionLimit: 5,
    decimalNumbers: true,
  })

  const rowToOffering = (row) => row ? {
    id: row.id,
    gameId: row.game_id,
    available: Boolean(row.available),
    title: row.title,
    pricing: {
      model: row.pricing_model,
      currency: row.currency,
      minimum: row.minimum_amount,
      maximum: row.maximum_amount,
      amount: row.fixed_amount,
    },
  } : null

  async function findOrder(reference) {
    const [orders] = await pool.execute(
      `SELECT id, reference, currency, total, status, created_at AS createdAt
       FROM orders WHERE reference = ? LIMIT 1`,
      [reference],
    )
    if (!orders[0]) return null
    const [lines] = await pool.execute(
      `SELECT offering_id AS offeringId, offering_title AS title,
              unit_amount AS amount, line_total AS lineTotal
       FROM order_lines WHERE order_id = ? ORDER BY id`,
      [orders[0].id],
    )
    return { ...publicOrder(orders[0]), lines }
  }

  async function findByIdempotencyKey(key) {
    const [rows] = await pool.execute(
      'SELECT reference, request_hash AS requestHash FROM orders WHERE idempotency_key = ? LIMIT 1',
      [key],
    )
    if (!rows[0]) return null
    return { requestHash: rows[0].requestHash, order: await findOrder(rows[0].reference) }
  }

  return {
    driver: 'mysql',
    async ping() { await pool.query('SELECT 1') },
    async getOffering(id) {
      const [rows] = await pool.execute('SELECT * FROM offerings WHERE id = ? LIMIT 1', [id])
      return rowToOffering(rows[0])
    },
    async createOrder(order) {
      try {
        const connection = await pool.getConnection()
        try {
          await connection.beginTransaction()
          const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000)
          const [result] = await connection.execute(
            `INSERT INTO orders
              (reference, customer_name, customer_email, currency, total, status, created_at, idempotency_key, request_hash)
             VALUES (?, ?, ?, ?, ?, 'simulated', ?, ?, ?)`,
            [
              order.reference, order.customerName, order.customerEmail, order.currency, order.total,
              createdAt, order.idempotencyKey, order.requestHash,
            ],
          )
          for (const line of order.lines) {
            await connection.execute(
              `INSERT INTO order_lines
                (order_id, offering_id, offering_title, unit_amount, line_total)
               VALUES (?, ?, ?, ?, ?)`,
              [result.insertId, line.offeringId, line.title, line.amount, line.lineTotal],
            )
          }
          await connection.commit()
          return publicOrder({ ...order, status: 'simulated', createdAt })
        } catch (error) {
          await connection.rollback()
          throw error
        } finally {
          connection.release()
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          const existing = await findByIdempotencyKey(order.idempotencyKey)
          if (existing) {
            if (existing.requestHash !== order.requestHash) throw idempotencyConflict()
            return existing.order
          }
        }
        throw error
      }
    },
    findOrder,
    async close() { await pool.end() },
  }
}

export function createRepository() {
  const driver = process.env.DB_DRIVER ?? 'mysql'
  if (driver === 'memory') return memoryRepository()
  if (driver === 'mysql') return mysqlRepository()
  throw new Error(`Unsupported DB_DRIVER "${driver}". Choose "mysql" or the explicit local test adapter "memory".`)
}
