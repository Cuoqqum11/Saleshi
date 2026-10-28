import { existsSync } from 'node:fs'
import mysql from 'mysql2/promise'
import { games } from '../src/js/data/games.js'
import { offerings } from '../src/js/data/offerings.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'saleshi',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
})

try {
  for (const game of games) {
    await connection.execute(
      `INSERT INTO games (id, slug, title, status, summary) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), status = VALUES(status), summary = VALUES(summary)`,
      [game.id, game.slug, game.title, game.status, game.summary],
    )
  }
  for (const offering of offerings) {
    await connection.execute(
      `INSERT INTO offerings
        (id, game_id, title, available, pricing_model, currency, minimum_amount, maximum_amount, fixed_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title), available = VALUES(available), pricing_model = VALUES(pricing_model),
        currency = VALUES(currency), minimum_amount = VALUES(minimum_amount),
        maximum_amount = VALUES(maximum_amount), fixed_amount = VALUES(fixed_amount)`,
      [
        offering.id, offering.gameId, offering.title, offering.available, offering.pricing.model,
        offering.pricing.currency, offering.pricing.minimum ?? null, offering.pricing.maximum ?? null,
        offering.pricing.amount ?? null,
      ],
    )
  }
  console.log(`Seeded ${games.length} game and ${offerings.length} offering from the shared records.`)
} finally {
  await connection.end()
}
