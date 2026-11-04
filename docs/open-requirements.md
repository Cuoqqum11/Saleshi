# Open requirements and unresolved questions

Status: current after M8 game content and studio identity (2026-11-04). The game now on the site is
the studio's actual title with its actual builds, the room is a designed environment rather than a
grey box, the studio's identity is a single token module with its omissions labelled rather than
guessed, every published route carries metadata derived from those records, and MySQL persistence,
seeding and the full local test matrix are evidenced. Assessment sign-off and public deployment
remain subject to the items below. The sequence these milestones follow is
[the roadmap](roadmap.md).

## Questions for the tutor

1. **Product category.** Game studios are not one of the listed approved business categories. Is an indie game studio acceptable, or must the product be reframed as software sold directly by the developer?
2. **Does voluntary support count as a sale?** The implemented offering is pay-what-you-want creator support with no invented premium edition or benefit. Confirm whether this satisfies the sales requirement or whether a real fixed-price product must be supplied. The game itself is free to play and free to download.
3. **Simulated checkout.** The implemented workflow has server-side price recomputation, order/order-line persistence and no card fields or payment. Confirm that this is acceptable assessment evidence.
4. **Back-end depth.** Does Express + MySQL satisfy the expected server/database work, and does the brief require a second back-end framework?
5. **Deployment.** Is a local/LAN demonstration acceptable, or is a public URL required? No domain, VPS or paid service has been purchased.
6. **Provisional studio identity.** The game content is real. The studio's name and biography are still
   not supplied, so M8 replaced the free-floating "PLACEHOLDER" text with one flag:
   `src/js/data/studio.js` has `nameIsFinal: false`, which makes every page carry a "studio name not
   final" marker and makes the studio letter say out loud that its biography is missing. Confirm
   whether an identity labelled this honestly is acceptable for submission, or whether the name and
   biography must arrive before it is.

Part 2 of the brief had not been supplied when this implementation was built. Reconcile it when available rather than assuming these choices satisfy unseen requirements.

## Content the studio owner must supply

- Final studio name, biography and studio-letter text.
- Promotional artwork, if the three in-game frames now used as the cover and gallery are not what the studio wants published. They were captured from the browser build during integration, not supplied by the studio, and the throwaway driver that produced them is not in the repository. The game page labels them as captures rather than press artwork, and [docs/assets.md](assets.md) records what each one is, where it came from and what the build does to its bytes. Approval is a separate question from use: `cover.shareApproved` is `false`, which is what withholds `og:image` — the picture a shared link shows — until the studio says these frames may represent the game off-site (M8 §11.3, ADR-015).
- The itch.io page address, if that acquisition route should replace the explanatory text now shown in its place.
- A release date or an explicit "no release date" statement for the demo. Structured data states none until then (M8 §11.4).
- Confirmation of the current GBP 1–100 contribution configuration, or real replacement commercial terms.
- A release-mode web export, if the debug export's payload or behaviour is not what should be published (see below).
- A verdict on whether the font licence text must also travel inside the browser export's `.pck`.

No additional games, reviews, release dates, artwork or commercial claims should be invented to fill these gaps.

## Technical verification still open

- **Game builds:** the staged files, archive contents, hashes, HTTP range support and in-frame start are verified. The Windows `.exe` has never been launched from this site and is unsigned, so SmartScreen will warn. Nobody has played the demo to the end, and the developer's own build record says no unassisted first-time player has.
- **Export mode:** the browser export reports itself as a debug build. A release export has not been produced or measured, and its payload may be materially smaller than the 38.8 MB now quoted.
- **Payload cost:** 38.8 MB for the browser demo and 35.1 MB for the archive are measured sizes. Nothing has been measured on a throttled or mobile connection, and the site deliberately downloads neither until the visitor asks.
- **Database operations:** local MySQL 8.0.46 connectivity, seed projection, pruning/retirement, transactions, checks, retry idempotency, process-restart persistence and one dump-and-restore drill are verified, and the portable instance now sits in `D:\saleshi-mysql` rather than a temporary directory. Managed/scheduled storage, off-machine retention, production-sized restores and upgrades from an older M5 schema are not verified.
- **Real hardware:** emulated touch dragging and 844×390 landscape now pass, but physical phones and visible-tab real-GPU frame rate remain unverified.
- **Cross-browser and assistive technology:** only Chromium has run. Firefox, Safari and a real screen-reader session remain open.
- **Deployment:** production files/API passed locally; DNS, HTTPS, hosting, compression, monitoring, retention policy, rate limiting and operational security still need review. Local timings are not deployment benchmarks. The metadata consequence of having no host is recorded: every structured-data URL is a path, no route emits `<link rel="canonical">`, and `og:url`/`og:image` are omitted rather than guessed. Setting `studio.web.canonicalBaseUrl` in M9 is the whole change (ADR-015).
- **Checkout recovery scope:** idempotency survives retries within a mounted checkout page, not a browser reload. Reloading after an undelivered committed response can create another simulated order; retry in the same page instead. Offering changes may invalidate an older quote. No authenticated order history or cross-refresh retry recovery exists.
- **Test infrastructure:** this workstation intermittently denies loopback connections (`net::ERR_NETWORK_ACCESS_DENIED` / `connect EACCES`). Only transport signatures are retried; the one failing `B10` line is quoted in the test plan's defect table, and the retained log is the passing re-run that overwrote it. The cause is not the site.

## Resolved direction

- Room entry depends on WebGL capability, reduced-data preference and an absolute usability floor, not width alone (ADR-008).
- The computer panel occupies a separate grid region, so it cannot cover the canvas or object chips. At narrow sizes it is a bounded drawer rather than a near-fullscreen overlay.
- Both papers have chip, keyboard and direct raycast-selection tests.
- Games and offerings share one model across room, catalogue, details and store; static HTML is generated at dev/build time (ADR-009). Build sizes and hashes come from the same generated-record principle (ADR-011).
- The browser demo loads only on an explicit click inside an iframe, so no visitor pays 38.8 MB by accident (ADR-012).
- Room test hooks ship in a dev server and in a dedicated QA bundle, never in the deployable build (ADR-005, amended by ADR-013).
- Checkout is deliberately simulated and server-validated (ADR-010). Real payments remain disabled unless separately approved.
- Detailed models, textures and a visual lighting pass were postponed until the interaction and sales
  workflow were accepted; they were delivered in M7 and are documented in [art-direction.md](art-direction.md).
- The room now carries one visual limitation that is a content gap, not a technical one: nothing in it
  is branded, because the studio name has still not been supplied.
