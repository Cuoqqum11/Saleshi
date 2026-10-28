# Open requirements and unresolved questions

Status: current after M6 local verification (2026-10-28). Real MySQL integration and local QA are evidenced; assessment sign-off and public deployment remain subject to the items below.

## Questions for the tutor

1. **Product category.** Game studios are not one of the listed approved business categories. Is an indie game studio acceptable, or must the product be reframed as software sold directly by the developer?
2. **Does voluntary support count as a sale?** The implemented offering is pay-what-you-want creator support with no invented premium edition or benefit. Confirm whether this satisfies the sales requirement or whether a real fixed-price product must be supplied.
3. **Simulated checkout.** The implemented workflow has server-side price recomputation, order/order-line persistence and no card fields or payment. Confirm that this is acceptable assessment evidence.
4. **Back-end depth.** Does Express + MySQL satisfy the expected server/database work, and does the brief require a second back-end framework?
5. **Deployment.** Is a local/LAN demonstration acceptable, or is a public URL required? No domain, VPS or paid service has been purchased.
6. **Game assets.** Is clearly marked placeholder content acceptable, or must real title, description, artwork and builds exist before submission?

Part 2 of the brief had not been supplied when this implementation was built. Reconcile it when available rather than assuming these choices satisfy unseen requirements.

## Content the studio owner must supply

- Final studio name, biography and studio-letter text.
- Real game title, description, genre, features, cover, screenshots and release information.
- Browser demo, downloadable build and itch.io URL if those routes should become available.
- Confirmation of the current GBP 1–100 contribution configuration, or real replacement commercial terms.

No additional games, reviews, release dates, artwork or commercial claims should be invented to fill these gaps.

## Technical verification still open

- **Database operations:** local MySQL 8.0.46 connectivity, seed, transactions, checks, retry idempotency and process-restart persistence are verified. The portable database is in a temporary directory; managed storage, backup restoration and upgrades from an older M5 schema are not verified.
- **Real hardware:** emulated touch dragging and 844×390 landscape now pass, but physical phones and visible-tab real-GPU frame rate remain unverified.
- **Cross-browser and assistive technology:** only Chromium has run. Firefox, Safari and a real screen-reader session remain open.
- **Deployment:** production files/API passed locally; DNS, HTTPS, hosting, compression, monitoring, retention policy, rate limiting and operational security still need review. Local timings are not deployment benchmarks.
- **Checkout recovery scope:** idempotency survives retries within a mounted checkout page, not a browser reload. Reloading after an undelivered committed response can create another simulated order; retry in the same page instead. Offering changes may invalidate an older quote. No authenticated order history or cross-refresh retry recovery exists.

## Resolved direction

- Room entry depends on WebGL capability, reduced-data preference and an absolute usability floor, not width alone (ADR-008).
- The computer panel occupies a separate grid region, so it cannot cover the canvas or object chips. At narrow sizes it is a bounded drawer rather than a near-fullscreen overlay.
- Both papers have chip, keyboard and direct raycast-selection tests.
- Games and offerings share one model across room, catalogue, details and store; static HTML is generated at dev/build time (ADR-009).
- Checkout is deliberately simulated and server-validated (ADR-010). Real payments remain disabled unless separately approved.
- Detailed models, textures and a visual lighting pass remain postponed until the interaction and sales workflow are accepted.
