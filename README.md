# Saleshi

Saleshi is an indie game studio website built around a navigable 3D room. Cassettes represent the game catalogue, the desk computer presents game information and creator-support actions, and pinned papers open readable HTML views. A conventional multi-page catalogue and store remain available without WebGL. The project is practical evidence for Pearson BTEC Level 5 HND Computing Unit 13.

**Status: M8 game content and studio identity integrated and locally verified; assessment and deployment sign-off remain open.** The room, catalogue, store, browser cart and simulated checkout work with real MySQL 8.0.46, including transactional writes, idempotent retries and persistence across a verified application restart. The listed game is the studio's actual title, *The Last Witness*: a Godot 4.7 browser demo plays inside the site and a Windows desktop build downloads from it. Checkout collects no card details and takes no payment. The studio's identity is deliberately unfinished rather than invented — the name is displayed as a working name and labelled "studio name not final" from one flag in `src/js/data/studio.js`, and there is no logo, email, location, social account, biography or release history because none was supplied; the site states each omission where it would otherwise be guessed. Every published route now carries its own title, description and structured data generated from those same records, with any property the records cannot confirm withheld rather than invented — [docs/content-architecture.md](docs/content-architecture.md) maps where each word comes from and [docs/branding.md](docs/branding.md) lists the identity decisions still waiting on the studio. M6 was preserved in commit `3e4c20d` and M7 in `d9b62e0` before the changes that followed them.

## Stack

- HTML, CSS and native JavaScript modules, built by Vite 8 as a multi-page site.
- Three.js for the studio room (architecture, furniture, cassette cases and pinned papers, all built procedurally), loaded only when the room starts.
- Vue 3 for the reactive computer panel; cart and checkout use focused DOM controllers.
- Node.js and Express for quoting, order creation and confirmation.
- MySQL through `mysql2`, with parameterised queries and transactional order/order-line writes.
- A separate `DB_DRIVER=memory` adapter for local automated tests only. It is never selected silently and loses orders when the server stops.
- The studio's Godot 4.7 exports (web build and Windows archive), staged into `public/game/web/` and `public/downloads/` by `npm run game:stage` and deliberately **not** committed to Git. `src/js/data/builds.js` records their measured sizes and SHA-256 digests, and is what the site quotes from. The three in-game frames the catalogue and game page use (`public/game/screenshots/`) are the exception: they are small, the site cannot render its cover art without them, so they belong in Git.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Room-first homepage plus conventional studio/game content |
| `/games/` | Static-HTML catalogue generated from shared game records |
| `/games/the-last-witness/` | Game details in six sections: overview, gameplay, experience, features, availability, status |
| `/games/the-last-witness/play/` | Browser demo, loaded only when the visitor clicks |
| `/downloads/the-last-witness-windows-x64.zip` | Windows desktop archive (35.1 MB, supports byte ranges) |
| `/store/` | Offerings, prices, terms and add-to-cart enhancement |
| `/cart/` | Persistent cart, amount editing, removal and server quote |
| `/checkout/` | Server-reviewed simulated checkout with minimal customer details |
| `/order/?reference=…` | Safe-reference simulated order confirmation |

`/?view=list` forces the text experience, `/?view=room` requests the room where WebGL exists, and `/?game=the-last-witness` restores a selection. Ordinary links provide normal back/forward navigation.

## Run locally

```bash
npm ci
# For a fresh checkout only: copy .env.example to .env and configure MySQL.
# Do not overwrite existing .env credentials.
npm run game:stage     # copy the studio's Godot exports into public/ and rewrite the build record
npm run dev            # Express + Vite, using PORT from .env (otherwise 5173)
# Alternatively, stop the dev server and serve a production build:
npm run build
npm start
```

The game binaries are ~75 MB and stay out of Git, so a fresh clone has no playable demo until
`npm run game:stage` has run against the studio's export folder (`GAME_SOURCE_DIR` overrides the
source path). `npm run game:check` verifies what is already staged. `npm run build:qa` produces a
separate single-chunk `dist-qa/` that keeps the room test hooks for the browser suites; it is never
deployed.

The build also losslessly re-encodes the game's own screenshot PNGs inside the bundle (121.6 → 81.7
KiB, verified pixel-for-pixel). `public/` keeps the captured files; `npm run assets:report` prints the
measurement and `npm run assets:check` fails if a frame stops qualifying. See
[docs/assets.md](docs/assets.md).

MySQL 8.0.16+ is required for enforced checks. Create the database, apply `server/schema.sql` and run `npm run db:seed` with administrator credentials before starting the app. Use restricted application credentials in `.env`. Full setup, privileges, the local portable MySQL restart command, and the fresh-schema/upgrade distinction are in [docs/commerce.md](docs/commerce.md).

On this workstation, the verified local database uses port `3307`, the application `.env` uses port `5196`, and both application/admin credentials are generated and ignored by Git. The portable instance now lives in `D:\saleshi-mysql` with manual dumps in `D:\saleshi-mysql\backups`; it is still not an installed service or a hosted, backed-up deployment. It used to sit in a temporary directory, which Windows cleaned and took down mid-run — see [docs/commerce.md](docs/commerce.md). Milestone 6b runs used explicit `PORT=` overrides (`5310`, `5313`, `5314`) so a deployable origin, a memory-comparison origin and the QA origin could be tested side by side.

```bash
DB_DRIVER=memory npm run test:commerce
npm run test:builds     # staged binaries match the committed record
npm run test:assets     # the image pipeline: guards, round-trip, CRCs, export untouched
npm run test:metadata   # structured data and sharing tags: allowed properties, host gate, image sizes
npm run test:database   # seed projection, pruning, retirement, untouched order history (needs admin file)
# MySQL repository tests, after building; constraint checks need an isolated admin connection:
TEST_MYSQL_CONSTRAINTS=1 node --env-file=.env.mysql-admin.local --test tests/commerce.test.mjs
BASE_URL=http://127.0.0.1:5310 node tests/e2e/commerce.mjs
# Room suites need the test hooks, so run them against the QA origin:
npm run build:qa && DIST_DIR=dist-qa PORT=5314 npm start
BASE_URL=http://127.0.0.1:5314 node tests/e2e/gate.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/papers.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/movement.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/routes.mjs
BASE_URL=http://127.0.0.1:5314 node tests/e2e/game-builds.mjs
```

Run server and test commands in separate terminals. Set `BASE_URL` explicitly; individual suites have historical default ports. Front-end-only Vite has no sales API. For a database-free application run, explicitly use `DB_DRIVER=memory npm run dev`; never report it as MySQL persistence. Set `EVIDENCE_PREFIX` to the milestone you are running, or a browser suite will overwrite the screenshots an earlier milestone's report cites.

**Verified:** metadata derivation 12/12; image pipeline 8/8; build-record tests 6/6; MySQL seed projection 4/4; MySQL repository/integration 14/14; the same repository suite against the memory adapter 11 passed/3 skipped (adapter comparison, not persistence evidence); routes/responsive/accessibility 47/47 — including WCAG 2.2 AA text contrast, 24 px target size and zero horizontal overflow on 9 surfaces at 390 and 1280 px; room gate 12/12; papers 8/8; movement 15 passed with 2 visual notes; game-build e2e 21/21 on the QA origin and 20 passed/1 skipped on the deployable origin; production commerce e2e on `dist` + MySQL 30/30, and 30/30 again on an explicitly memory-driven origin as a comparison; `npm audit --omit=dev` reports 0 production vulnerabilities. The Godot demo starts and renders inside the site frame with zero export requests before the click. See [test plan](tests/test-plan.md) and [retained evidence](docs/evidence/README.md).

**Boundary:** the desktop `.exe` has never been launched from this site, the demo has never been played end to end by a first-time player, and the web export reports itself as a debug export. Emulated touch dragging is tested, but physical devices, other browsers, screen readers and real-GPU frame rate are not. Local browser timings are not deployment benchmarks. DNS/HTTPS/public hosting, backup restoration, existing-schema upgrades and production readiness remain unverified. Tutor category/sales approval and the final written report are still required.

## Shared content and commercial rules

`src/js/data/games.js` contains creative game records only. `src/js/data/offerings.js` contains acquisition/support offerings and commercial configuration. `src/js/data/builds.js` is generated by `npm run game:stage` from the studio's export folder and is the only source the site uses when it states a build size or hash. `src/js/data/metadata.js` turns those same records into public metadata — JSON-LD and sharing tags — and emits a property only when a record confirms its value, so no price, rating, release date, contact route or origin appears in machine-readable form (see [ADR-015](docs/decisions/ADR-015-metadata-from-records-paths-not-origins.md)). Vite's static-content plugin renders the homepage, catalogue, game details and store from those records, while the room uses the same modules. `npm run db:seed` projects the games and offerings into MySQL exactly — pruning a game row nothing references any more and retiring an offering an order still refers to — so the database catalogue cannot drift from the published one.

The cart stores only `{ offeringId, amount }` under `saleshi-cart-v1`. Voluntary support has an amount, not a quantity. Browser totals are display-only: the server loads each offering again, validates availability and amount rules, recomputes the total, and writes the order and lines in one transaction. Confirmation references contain 128 bits of randomness and responses omit customer name/email.

See `docs/commerce.md`, `docs/assets.md`, `docs/branding.md`, `docs/content-architecture.md`, `docs/decisions/`, `docs/evidence/`, `docs/unit13-mapping.md` and `tests/test-plan.md` for implementation and assessment evidence.
