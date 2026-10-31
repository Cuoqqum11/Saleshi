import { existsSync } from 'node:fs'
import mysql from 'mysql2/promise'
import { games } from '../src/js/data/games.js'
import { offerings } from '../src/js/data/offerings.js'

// .env holds the connection settings and the restricted runtime account, which is deliberately not
// granted DELETE. Seeding also removes game rows the published records no longer contain, so it
// runs from a second file with administrative credentials when that file exists. Only one file is
// read, because loadEnvFile never overrides a variable the first file already set. The target is
// printed below so a wrong-database seed is visible before it does anything.
const credentialsFile = process.env.DB_ENV_FILE
  ?? (existsSync('.env.mysql-admin.local') ? '.env.mysql-admin.local' : '.env')
if (existsSync(credentialsFile)) process.loadEnvFile(credentialsFile)

const target = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'saleshi',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
}
console.log(`Seeding ${target.host}:${target.port}/${target.database} as ${target.user} (credentials from ${credentialsFile}).`)

const connection = await mysql.createConnection(target)

// The rows the site publishes come from src/js/data, so seeding is a projection of those records,
// not an independent catalogue. Two consequences are handled explicitly below: a game that was in
// the records and no longer is must disappear from the database, and an offering whose game was
// renamed must follow it. Historical orders are never touched — they keep their own snapshots.
try {
  await connection.beginTransaction()

  for (const game of games) {
    await connection.execute(
      `INSERT INTO games (id, slug, title, status, summary) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE slug = VALUES(slug), title = VALUES(title),
        status = VALUES(status), summary = VALUES(summary)`,
      [game.id, game.slug, game.title, game.status, game.summary],
    )
  }

  for (const offering of offerings) {
    await connection.execute(
      `INSERT INTO offerings
        (id, game_id, title, available, pricing_model, currency, minimum_amount, maximum_amount, fixed_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        game_id = VALUES(game_id), title = VALUES(title), available = VALUES(available),
        pricing_model = VALUES(pricing_model), currency = VALUES(currency),
        minimum_amount = VALUES(minimum_amount), maximum_amount = VALUES(maximum_amount),
        fixed_amount = VALUES(fixed_amount)`,
      [
        offering.id, offering.gameId, offering.title, offering.available, offering.pricing.model,
        offering.pricing.currency, offering.pricing.minimum ?? null, offering.pricing.maximum ?? null,
        offering.pricing.amount ?? null,
      ],
    )
  }

  // mysql2's execute does not expand an array into an IN (...) list, so one placeholder is emitted
  // per id and the ids are still bound as parameters.
  const placeholders = (values) => values.map(() => '?').join(', ')

  const keptGameIds = games.map((game) => game.id)
  const keptOfferingIds = offerings.map((offering) => offering.id)

  // An offering on a retired order line can still point at a superseded game, and the foreign key
  // is ON DELETE RESTRICT, so the join decides: only unreferenced stale games are removed.
  const [prunedGames] = await connection.execute(
    `DELETE g FROM games g
     LEFT JOIN offerings o ON o.game_id = g.id
     WHERE g.id NOT IN (${placeholders(keptGameIds)}) AND o.id IS NULL`,
    keptGameIds,
  )

  // Retired offerings stay because order_lines reference them; making one unavailable is enough to
  // stop it being orderable, and the server re-reads that flag on every request.
  const [retired] = await connection.execute(
    `UPDATE offerings SET available = FALSE
     WHERE id NOT IN (${placeholders(keptOfferingIds)}) AND available = TRUE`,
    keptOfferingIds,
  )

  await connection.commit()
  console.log(
    `Seeded ${games.length} game and ${offerings.length} offering from the shared records; ` +
    `removed ${prunedGames.affectedRows} stale game row(s), retired ${retired.affectedRows} offering row(s).`,
  )
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.end()
}
