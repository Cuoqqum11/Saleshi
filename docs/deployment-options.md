# Deployment options and readiness

No domain, VPS or paid service has been purchased. M6 verified a **local** production build plus real MySQL; M6b added the studio's real game builds and re-ran the matrix against production bundles. None of this is a deployed service or a production-readiness claim.

## Runtime requirements

- `npm run game:stage` must run before `npm run build`: the ~75 MB of game binaries are not in Git, and Vite copies whatever is in `public/` into `dist/` verbatim. A host that receives only the repository gets a site whose demo and download routes 404.
- `npm run build` emits eight site HTML routes plus static CSS/JavaScript in `dist/`. Measured total: **78,324,197 bytes**, of which `dist/game/web` is 40,742,601 and `dist/downloads` is 36,761,734.
- Express serves those files and same-origin `/api` routes, validates prices and writes simulated orders.
- MySQL 8.0.16+ is required for enforced checks. Runtime credentials need SELECT on offerings and SELECT/INSERT on orders/lines; setup/migration credentials remain separate. `npm run db:seed` re-projects the catalogue from the shared records.
- The browser demo needs a **secure context**: it runs on `https` and on `localhost`, and refuses to start on a plain-HTTP network address. A LAN demonstration from another machine over `http://192.168.x.x` therefore shows the download route, not the playable one.
- The current application binds to loopback. An approved deployment could put a TLS reverse proxy in front of it; do not expose MySQL publicly.
- Static pages retain catalogue/terms without the API. Cart quoting, checkout and confirmation need the live API. A static-only host cannot deliver the complete sales workflow.

## Options and trade-offs

| Option | Cost model | Benefit | Limitation |
| --- | --- | --- | --- |
| Local demonstration | No hosting charge | Already tested, no public customer-data exposure | Requires tutor acceptance; not remotely accessible or backed up automatically. The browser demo only runs for visitors on the same machine (`localhost`), because a plain-HTTP LAN address is not a secure context. |
| Static host only | Free tiers may be available | Simple publication of the fallback/catalogue | No Express/MySQL checkout; must not present it as the complete deployed application |
| Single application platform plus MySQL | Provider-dependent recurring/free-tier limits | Managed application restart and TLS can reduce administration | Must verify database support, persistent storage, file-size/asset limits, region and backups before selection. A free tier that caps repository or artifact size may not accept 75 MB of game binaries. |
| Application platform plus object storage/CDN for the builds | Usage-based, often a small free allowance | Serves the 38.8 MB export and 35.1 MB archive off a cached edge with range requests, keeping them out of the application's request path | Two deployment targets instead of one, and cache/hash invalidation to manage when the studio re-exports |
| Self-managed VPS and reverse proxy | Recurring server/domain costs | Full control and direct administration evidence | Requires patching, TLS, process supervision, database access controls, backups and monitoring |
| CMS/online builder | Provider/theme/plugin-dependent | Useful P4 comparison for ordinary sales pages | The custom room, embedded demo and checkout would require integration work; no comparison implementation was built |

**Recommendation:** retain the verified local demonstration until the tutor confirms whether publication is required. If it is, compare a managed Node/MySQL deployment with a VPS against the actual budget and administration time, and decide separately whether the game binaries live with the application or in cached object storage. No spending or deployment is authorised by this document. Hosting choice does not by itself satisfy an assessment criterion.

## Measured local boundary

The build, real MySQL workflow, safe API errors, price authority and basic metadata/link checks passed. The room chunk is 626.67 kB minified (169.34 kB estimated gzip). The current Express static server transfers assets uncompressed; the gzip build number is not the measured network transfer. A production reverse proxy should be configured and measured for compression and suitable immutable caching of hashed assets. API responses are explicitly `no-store`.

For the game binaries, what is measured is narrower and deliberately so: the archive answers `HEAD` 200 with the exact `content-length` it publishes and honours a byte range with 206, the export's entry and `.wasm` are reachable with an `application/wasm` type, and zero requests under `/game/web/` happen before the visitor clicks. So the 75 MB costs a deployment its storage and bandwidth planning, not its page weight — every route except the play page is unchanged. `.wasm` and `.pck` are already dense binary, so whether compression helps at all must be measured rather than assumed; range support and cache headers matter more for a 35 MB download. An unsigned `.exe` behind a download link will also draw browser and antivirus warnings that need a stated answer, not silence.

`evidence/m6-performance.json` records nine cold-context local Chromium runs against the final M6 production build, with SHA-256 hashes identifying the measured files. Room transfer was 653,288 bytes versus 26,349 for the text view and 16,516 for the store. These results establish that the fallback avoids the large room chunk, not mobile load speed, real-GPU frame rate, public-network performance or ranking. The document LCP metric does not measure 3D canvas readiness. Room layout-shift measurements ranged from 0.0302 to 0.1512 and included a 186 ms long task, so visual stability and startup cost still need attention. None of those three routes fetches the game export, so the M6 numbers are still the current page-performance picture; re-measure on the deployed build and on actual devices, and add the play page.

## Publication checklist — not yet performed

- [ ] Agree hosting/budget, product category, real content and commercial terms with the owner/tutor.
- [ ] Decide the export question before publishing: a debug web export is live now, and a release export would change the published sizes and hashes (`npm run game:stage` re-measures them).
- [ ] Confirm the font-licence position for the browser export's `.pck`, not only for the desktop archive.
- [ ] Stage the binaries (`npm run game:stage`) as part of the release step, or provision them out of band; a build from a bare clone publishes a 404 demo.
- [ ] Serve all eight deep routes and `/api` at the intended origin; configure appropriate 404s.
- [ ] Configure DNS, HTTPS, redirect policy and a reverse proxy/process supervisor. HTTPS is not optional if the browser demo should work off-machine.
- [ ] Keep MySQL private and use managed secrets; never publish `.env` or administrator credentials.
- [ ] Review schema upgrade steps for any existing database; fresh-install SQL is not a migration.
- [x] Move data out of the temporary test location (done: `D:\saleshi-mysql`, drill in `evidence/m6b-database-relocation.txt`). Still to do: **scheduled** off-machine backups and retention.
- [ ] Configure compression/caching and repeat local-link, browser, accessibility and performance tests on the live origin.
- [ ] Review rate limiting, abuse handling, security headers, data retention/privacy and monitoring before public exposure. Large-binary bandwidth needs an explicit limit or a CDN.
- [ ] Validate on physical devices, other browsers and assistive technology.
- [ ] Keep payments disabled. Any real payment integration needs separate approval and review; no card data is collected by this prototype.
