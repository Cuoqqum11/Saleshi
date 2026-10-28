# Open requirements and unresolved questions

Status: current after Milestone 5 (2026-10-28). The implemented room, catalogue, cart and simulated checkout are not blocked by these items, but assessment sign-off and real deployment still are.

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

- **MySQL runtime:** schema, shared-record seed and transactional repository exist, but the `mysql` client was not installed and no server was configured. All executed order tests used `DB_DRIVER=memory`. Run schema/seed and repeat API/order tests against MySQL before reporting that integration as working.
- **Real hardware:** visible-tab GPU frame rate, physical phone layout and touch drag-to-look are unverified.
- **Cross-browser and assistive technology:** only Chromium has run. Firefox, Safari and a real screen-reader session remain open.
- **Deployment:** production files and API passed locally; DNS, HTTPS, hosting, backups and operational security have not been configured.

## Resolved direction

- Room entry depends on WebGL capability, reduced-data preference and an absolute usability floor, not width alone (ADR-008).
- The computer panel occupies a separate grid region, so it cannot cover the canvas or object chips. At narrow sizes it is a bounded drawer rather than a near-fullscreen overlay.
- Both papers have chip, keyboard and direct raycast-selection tests.
- Games and offerings share one model across room, catalogue, details and store; static HTML is generated at dev/build time (ADR-009).
- Checkout is deliberately simulated and server-validated (ADR-010). Real payments remain disabled unless separately approved.
- Detailed models, textures and a visual lighting pass remain postponed until the interaction and sales workflow are accepted.
