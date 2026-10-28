# Saleshi

Saleshi is an indie game studio website built around a navigable 3D room. Cassettes represent the game catalogue, the desk computer presents game information and creator-support actions, and pinned papers open readable HTML views. A conventional multi-page catalogue and store remain available without WebGL. The project is practical evidence for Pearson BTEC Level 5 HND Computing Unit 13.

**Status: Milestone 5 complete.** The room, catalogue, reusable game page, store, persistent browser cart, Express API and simulated checkout are integrated. Checkout collects no card details, takes no payment and creates only a clearly labelled simulated order. Game content remains marked as placeholder; no additional titles or artwork have been invented.

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
npm install
cp .env.example .env   # optional for defaults; never commit .env
npm run dev            # Express + Vite at http://localhost:5173
npm run build
npm start              # serve dist/ and the API
```

The default database driver is `mysql`. Create and seed the database before using the sales API:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS saleshi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p saleshi < server/schema.sql
node server/seed.js
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` in `.env`. Do not commit real credentials. For an explicitly isolated local test run:

```bash
DB_DRIVER=memory npm run dev
npm run test:commerce
node tests/e2e/commerce.mjs
node tests/e2e/routes.mjs
node tests/e2e/gate.mjs
node tests/e2e/papers.mjs
node tests/e2e/movement.mjs
```

Use `BASE_URL` when the server is not on port 5173. `npm run dev:vite` remains available for front-end-only work, but its sales API will not exist.

**Verification boundary:** the production and development sales flows passed with the explicit memory adapter. The MySQL schema and repository are implemented, but the MySQL client was not installed and no configured server was available in this session, so MySQL connectivity, migration and transaction behaviour remain unverified. Real-device, physical touch-drag, cross-browser, screen-reader and visible-tab GPU performance testing also remain open.

## Shared content and commercial rules

`src/js/data/games.js` contains creative game records only. `src/js/data/offerings.js` contains acquisition/support offerings and commercial configuration. Vite's static-content plugin renders the homepage, catalogue, game details and store from those records, while the room uses the same modules. The MySQL seed mirrors the offering used by the server.

The cart stores only `{ offeringId, amount }` under `saleshi-cart-v1`. Voluntary support has an amount, not a quantity. Browser totals are display-only: the server loads each offering again, validates availability and amount rules, recomputes the total, and writes the order and lines in one transaction. Confirmation references contain 128 bits of randomness and responses omit customer name/email.

See `docs/commerce.md`, `docs/decisions/`, `docs/evidence/`, `docs/unit13-mapping.md` and `tests/test-plan.md` for implementation and assessment evidence.
