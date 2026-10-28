# Saleshi

Saleshi is an indie game studio website built around a navigable 3D room. Cassettes represent the game catalogue, the desk computer presents game information and creator-support actions, and pinned papers open readable HTML views. A conventional multi-page catalogue and store remain available without WebGL. The project is practical evidence for Pearson BTEC Level 5 HND Computing Unit 13.

**Status: M6 local integration verified; assessment and deployment sign-off remain open.** The room, catalogue, store, browser cart and simulated checkout work with real MySQL 8.0.46, including transactional writes, idempotent retries and persistence across a verified application restart. Checkout collects no card details and takes no payment. Game content remains placeholder; no additional games or artwork have been invented. M5 was preserved in baseline commit `adae819` before M6 changes.

## Stack

- HTML, CSS and native JavaScript modules, built by Vite 8 as a multi-page site.
- Three.js for the grey-box room, loaded only when the room starts.
- Vue 3 for the reactive computer panel; cart and checkout use focused DOM controllers.
- Node.js and Express for quoting, order creation and confirmation.
- MySQL through `mysql2`, with parameterised queries and transactional order/order-line writes.
- A separate `DB_DRIVER=memory` adapter for local automated tests only. It is never selected silently and loses orders when the server stops.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Room-first homepage plus conventional studio/game content |
| `/games/` | Static-HTML catalogue generated from shared game records |
| `/games/placeholder-slug/` | Reusable game-details page |
| `/store/` | Offerings, prices, terms and add-to-cart enhancement |
| `/cart/` | Persistent cart, amount editing, removal and server quote |
| `/checkout/` | Server-reviewed simulated checkout with minimal customer details |
| `/order/?reference=…` | Safe-reference simulated order confirmation |

`/?view=list` forces the text experience, `/?view=room` requests the room where WebGL exists, and `/?game=placeholder-slug` restores a selection. Ordinary links provide normal back/forward navigation.

## Run locally

```bash
npm ci
# For a fresh checkout only: copy .env.example to .env and configure MySQL.
# Do not overwrite existing .env credentials.
npm run dev            # Express + Vite, using PORT from .env (otherwise 5173)
# Alternatively, stop the dev server and serve a production build:
npm run build
npm start
```

MySQL 8.0.16+ is required for enforced checks. Create the database, apply `server/schema.sql` and run `server/seed.js` with administrator credentials before starting the app. Use restricted application credentials in `.env`. Full setup, privileges, the local portable MySQL restart command, and the fresh-schema/upgrade distinction are in [docs/commerce.md](docs/commerce.md).

On this workstation, the verified local database uses port `3307`, the application `.env` uses port `5196`, and both application/admin credentials are generated and ignored by Git. The database lives in a temporary directory, not an installed service or backed-up deployment.

```bash
DB_DRIVER=memory npm run test:commerce
# MySQL repository tests, after building; constraint checks need an isolated admin connection:
TEST_MYSQL_CONSTRAINTS=1 node --env-file=.env.mysql-admin.local --test tests/commerce.test.mjs
BASE_URL=http://127.0.0.1:5196 node tests/e2e/commerce.mjs
# Room instrumentation is development-only. Run a separate Vite instance if needed:
npm run dev:vite -- --host 127.0.0.1 --port 5190 --strictPort
BASE_URL=http://127.0.0.1:5190 ROUTES_BASE_URL=http://127.0.0.1:5196 node tests/e2e/routes.mjs
BASE_URL=http://127.0.0.1:5190 node tests/e2e/gate.mjs
BASE_URL=http://127.0.0.1:5190 node tests/e2e/papers.mjs
BASE_URL=http://127.0.0.1:5190 node tests/e2e/movement.mjs
```

Run server and test commands in separate terminals. Set `BASE_URL` explicitly; individual suites have historical default ports. Front-end-only Vite has no sales API. For a database-free application run, explicitly use `DB_DRIVER=memory npm run dev`; never report it as MySQL persistence.

**Verified:** MySQL repository 14/14; production MySQL commerce 30/30; routes/responsive/metadata 27/27; room gate 11/11; papers 8/8; movement 15 passed with 2 visual notes. Memory repository checks pass separately with MySQL checks skipped. The build and production-dependency audit passed. See [test plan](tests/test-plan.md) and [retained evidence](docs/evidence/README.md).

**Boundary:** emulated touch dragging is tested, but physical devices, other browsers, screen readers and real-GPU frame rate are not. Local browser timings are not deployment benchmarks. DNS/HTTPS/public hosting, backup restoration, existing-schema upgrades and production readiness remain unverified. Tutor category/sales approval and the final written report are still required.

## Shared content and commercial rules

`src/js/data/games.js` contains creative game records only. `src/js/data/offerings.js` contains acquisition/support offerings and commercial configuration. Vite's static-content plugin renders the homepage, catalogue, game details and store from those records, while the room uses the same modules. The MySQL seed mirrors the offering used by the server.

The cart stores only `{ offeringId, amount }` under `saleshi-cart-v1`. Voluntary support has an amount, not a quantity. Browser totals are display-only: the server loads each offering again, validates availability and amount rules, recomputes the total, and writes the order and lines in one transaction. Confirmation references contain 128 bits of randomness and responses omit customer name/email.

See `docs/commerce.md`, `docs/decisions/`, `docs/evidence/`, `docs/unit13-mapping.md` and `tests/test-plan.md` for implementation and assessment evidence.
