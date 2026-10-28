# Deployment options and readiness

No domain, VPS or paid service has been purchased. M6 verified a **local** production build plus real MySQL; this is not a deployed service or production-readiness claim.

## Runtime requirements

- `npm run build` emits seven HTML routes and static CSS/JavaScript in `dist/`.
- Express serves those files and same-origin `/api` routes, validates prices and writes simulated orders.
- MySQL 8.0.16+ is required for enforced checks. Runtime credentials need SELECT on offerings and SELECT/INSERT on orders/lines; setup/migration credentials remain separate.
- The current application binds to loopback. An approved deployment could put a TLS reverse proxy in front of it; do not expose MySQL publicly.
- Static pages retain catalogue/terms without the API. Cart quoting, checkout and confirmation need the live API. A static-only host cannot deliver the complete sales workflow.

## Options and trade-offs

| Option | Cost model | Benefit | Limitation |
| --- | --- | --- | --- |
| Local demonstration | No hosting charge | Already tested, no public customer-data exposure | Requires tutor acceptance; not remotely accessible or backed up automatically |
| Static host only | Free tiers may be available | Simple publication of the fallback/catalogue | No Express/MySQL checkout; must not present it as the complete deployed application |
| Single application platform plus MySQL | Provider-dependent recurring/free-tier limits | Managed application restart and TLS can reduce administration | Must verify database support, persistent storage, limits, region and backups before selection |
| Self-managed VPS and reverse proxy | Recurring server/domain costs | Full control and direct administration evidence | Requires patching, TLS, process supervision, database access controls, backups and monitoring |
| CMS/online builder | Provider/theme/plugin-dependent | Useful P4 comparison for ordinary sales pages | The custom room and checkout would require integration work; no comparison implementation was built |

**Recommendation:** retain the verified local demonstration until the tutor confirms whether publication is required. If it is, compare a managed Node/MySQL deployment with a VPS against the actual budget and administration time before choosing. No spending or deployment is authorised by this document. Hosting choice does not by itself satisfy an assessment criterion.

## Measured local boundary

The build, real MySQL workflow, safe API errors, price authority and basic metadata/link checks passed. The room chunk is 623.51 kB minified (167.95 kB estimated gzip). The current Express static server transfers assets uncompressed; the gzip build number is not the measured network transfer. A production reverse proxy should be configured and measured for compression and suitable immutable caching of hashed assets. API responses are explicitly `no-store`.

`evidence/m6-performance.json` records nine cold-context local Chromium runs against the final M6 production build, with SHA-256 hashes identifying the measured files. Room transfer was 653,288 bytes versus 26,349 for the text view and 16,516 for the store. These results establish that the fallback avoids the large room chunk, not mobile load speed, real-GPU frame rate, public-network performance or ranking. The document LCP metric does not measure 3D canvas readiness. Room layout-shift measurements ranged from 0.0302 to 0.1512 and included a 186 ms long task, so visual stability and startup cost still need attention. Rerun the measurements on the deployed build and actual devices.

## Publication checklist — not yet performed

- [ ] Agree hosting/budget, product category, real content and commercial terms with the owner/tutor.
- [ ] Serve all seven deep routes and `/api` at the intended origin; configure appropriate 404s.
- [ ] Configure DNS, HTTPS, redirect policy and a reverse proxy/process supervisor.
- [ ] Keep MySQL private and use managed secrets; never publish `.env` or administrator credentials.
- [ ] Review schema upgrade steps for any existing database; fresh-install SQL is not a migration.
- [ ] Move data out of the temporary test location and prove backup restoration.
- [ ] Configure compression/caching and repeat local-link, browser, accessibility and performance tests on the live origin.
- [ ] Review rate limiting, abuse handling, security headers, data retention/privacy and monitoring before public exposure.
- [ ] Validate on physical devices, other browsers and assistive technology.
- [ ] Keep payments disabled. Any real payment integration needs separate approval and review; no card data is collected by this prototype.
