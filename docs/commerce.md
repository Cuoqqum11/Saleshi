# Catalogue, cart and simulated checkout

## Data model

Games describe creative work; offerings describe acquisition or support terms. The only current offering is voluntary pay-what-you-want studio support associated with the placeholder game. It promises no premium edition, exclusive content, download or automatic delivery.

- Shared records: `src/js/data/games.js` and `src/js/data/offerings.js`.
- Build-time HTML: `scripts/static-content.mjs` supplies the homepage, catalogue, details and store.
- Browser cart: `src/js/store/cart.js`, key `saleshi-cart-v1`, one `{ offeringId, amount }` per offering; no support quantity.
- Authority: `server/commerce.js` validates customer, availability, unique lines, amount bounds and decimal precision. Currency, fixed prices, line totals and order totals come from server records, never submitted totals.
- Persistence: `server/repository.js` defaults to MySQL. Memory must be explicitly selected for an application run and loses orders on restart.

## MySQL requirements and setup

Use **MySQL 8.0.16 or newer with enforced CHECK constraints**; the measured version was **MySQL Community Server 8.0.46, Windows x64**. MariaDB or another database has not been substituted or tested. Node 24 and the lockfile dependencies were used locally.

For a new database, set administrator connection values outside version control, then run:

```bash
mysql -u root -p -e "CREATE DATABASE saleshi CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
mysql -u root -p saleshi < server/schema.sql
node --env-file=.env.mysql-admin.local server/seed.js
```

The administrator environment file is an optional local convenience, not a distributed credential file. It uses the same `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` names as `.env.example`. `seed.js` needs insert/update rights and inserts only shared records. Application credentials should instead receive SELECT on `offerings` and SELECT/INSERT on `orders` and `order_lines`. They need no DDL, UPDATE, DELETE, or customer-table administration privileges.

`schema.sql` is a **fresh-install schema, not an upgrade migration**. `CREATE TABLE IF NOT EXISTS` does not add constraints or idempotency columns to an older M5 database. Preserve existing data and prepare a reviewed migration before upgrading such a database; do not drop populated tables to make setup pass.

### This workstation's verified local instance

Docker was attempted first but could not run because WSL was not installed. No Windows feature was enabled. The official portable MySQL archive was used instead:

- Base directory: `C:/Users/jackc/AppData/Local/Temp/saleshi-mysql/mysql-8.0.46-winx64`.
- Data directory: the `data` subdirectory; MySQL binds only to `127.0.0.1:3307` and MySQL X is disabled.
- Database: `saleshi`; one shared game and one shared offering seeded.
- `.env` contains generated credentials for `saleshi_app`, MySQL driver/port, and application port `5196`.
- `.env.mysql-admin.local` contains separate generated administrator credentials. Root's initial temporary blank password was replaced. Both files are ignored; neither belongs in a commit or evidence bundle.

To restart the existing portable instance, without reinitialising its data:

```bash
"C:/Users/jackc/AppData/Local/Temp/saleshi-mysql/mysql-8.0.46-winx64/bin/mysqld.exe" --no-defaults --basedir="C:/Users/jackc/AppData/Local/Temp/saleshi-mysql/mysql-8.0.46-winx64" --datadir="C:/Users/jackc/AppData/Local/Temp/saleshi-mysql/mysql-8.0.46-winx64/data" --port=3307 --bind-address=127.0.0.1 --mysqlx=OFF --console
```

This is a local test instance, **not a Windows service or durable deployment**. Its temporary directory may be cleaned by the operating system. Back it up and move to a deliberately managed location before relying on it for retained data. Never rerun `--initialize` against this populated directory. The application can then run with `npm run dev`, or `npm run build` followed by `npm start`; stop an already-running instance before reusing its port.

## Schema and repository contract

`games`, `offerings`, `orders` and `order_lines` use InnoDB. DECIMAL columns store money. Pricing checks enforce consistent fixed/PWYW fields and nonnegative bounds; order and line checks prevent negative values and inconsistent unit/line totals. Foreign keys restrict deletion of referenced games, offerings and orders. Lines snapshot title and amount so changing or disabling an offering does not rewrite historical lines.

Order creation inserts the order and all lines in one transaction, rolling everything back when a line fails. The repository releases its connection before duplicate-key lookup so simultaneous retries cannot exhaust the five-connection pool. The application account cannot update or delete historical records. The database alone does not enforce the aggregate sum of all lines; the server computes it.

Repository operations are `ping`, `getOffering`, `createOrder`, `findOrder` and `close`. Startup calls `ping`; failure stops startup rather than falling back. A successful ping proves connectivity, not schema migration correctness. The tests additionally exercise the actual tables and constraints.

## HTTP API and idempotency

| Method and route | Behaviour |
| --- | --- |
| `GET /api/health` | Pings the selected repository and reports its driver and simulated mode |
| `POST /api/cart/quote` | Validates lines and computes authoritative currency, amounts and total |
| `POST /api/orders` | Requires a UUID `Idempotency-Key`, revalidates customer/cart, writes the order transactionally |
| `GET /api/orders/:reference` | Returns the public projection of an existing high-entropy reference, or 404 |

The checkout page generates one interaction UUID and reuses it after failure. A unique database key and SHA-256 fingerprint of validated customer/currency/amount details make an identical retry return the original order; different details with the same key return 409. Twelve simultaneous repository retries and a browser retry after simulated loss of an already-committed response are tested. A new page load generates a new interaction: cross-refresh recovery is not implemented, so reloading after an undelivered committed response can create another simulated order. Retry within the same page instead. Offering changes between attempts may invalidate a retry because the current quote is revalidated first; the known order reference remains retrievable.

References contain 128 random bits (`SAL-` plus 32 hexadecimal characters). API output omits customer name/email and internal keys/hashes. References are bearer-style lookup identifiers, not user authentication; do not publicly share real order URLs. API responses use `Cache-Control: no-store`.

Invalid values/JSON return 400, conflicting key reuse 409, oversized JSON 413, and unexpected failures a generic 500. Database error codes are logged without request bodies or SQL. The browser keeps its cart on failure, restores the submit button, focuses the error or invalid field and does not claim success. Malformed success JSON or a missing/invalid order reference also leaves the cart intact for retry. Checkout controls remain hidden until a quote succeeds, including without JavaScript. Duplicate lines are checked against the server-resolved offering ID, preventing MySQL case-insensitive aliases from adding the same support offering twice.

## Executed M6 verification

See `../tests/test-plan.md` and `evidence/README.md` for retained logs:

- MySQL repository: **14/14**, including actual CHECK/FK enforcement, rollback, concurrent retry and a verified process restart (old process exit and port closure asserted before starting a new process).
- Memory repository: **11 passed, 3 MySQL-only checks skipped**; never counted as MySQL evidence.
- Production browser commerce using the restricted MySQL account: **30/30**, including malformed-success response recovery and canonical duplicate-offering rejection.
- Direct SQL inspection: a £12.50 simulated order and its single £12.50 line; no duplicate idempotency groups.
- Actual database shutdown: health/order APIs returned generic 500 JSON, no SQL/connection details; startup against the stopped database exited with failure. After restart the order remained retrievable.

Every order is simulated. There are no card fields or payment-provider credentials. Public deployment, backup restoration, operational security, public load/rate limiting and real payments are outside this verified local boundary. Tutor confirmation of the business category and whether voluntary support satisfies the sales requirement remains essential.
