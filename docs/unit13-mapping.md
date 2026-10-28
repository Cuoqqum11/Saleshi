# Unit 13 evidence map — Milestone 5

This map identifies practical evidence; it does not claim that a criterion has been awarded. The single report must still explain and justify the choices in the student's own words.

| Criterion area | Implemented evidence | Verification and limitation |
| --- | --- | --- |
| **P3 — build the website** | Room-first homepage; reusable game page; catalogue, store, cart, checkout and confirmation routes; shared CSS; responsive side panel/drawer; HTML content without WebGL/JS. | Production build passed. R1–R8 and C1–C13 exercised routes, history, layouts and fallbacks in Chromium. Physical devices and other browsers remain untested. |
| **M1 — implement a coherent front end/back end solution** | Three.js + Vue front end, Express API and repository boundary; shared game/offering model; persistent cart; order/order-line creation; schema and seed. | Six Node tests and thirteen commerce checks passed in development and production using explicit memory storage. MySQL is implemented but not runtime-verified. |
| **M2 — design for usability, accessibility, SEO and performance** | Real HTML routes and metadata; semantic headings/forms; visible focus; keyboard proxies; native paper dialog; reduced motion; no-WebGL/no-JS content; lazy room chunk; static catalogue/store content. | G1/G2, P1–P8, W11/W12, R1–R8 and C12 provide measured evidence. No screen-reader session or honest real-GPU frame-rate result yet. The lazy Three.js chunk is about 624 kB and retains a size warning. |
| **M3 — implement server-side processing and data handling** | Server cart quotes, customer and offering validation, parameterised MySQL queries, transactional order writes, safe-reference confirmation projection. | Tampered amount/total and malformed customer tests passed. Correct order lines and total were retrieved after reload in the memory adapter. Actual MySQL transaction execution is an open test. |
| **D1 — evaluate and justify the solution** | ADR-001…010, open requirements, test plan, honest simulated-checkout terms and unresolved product-category question. | Evaluation should weigh room immersion against the always-available list, shared static content against template duplication, and free local demonstration against unverified deployment/MySQL requirements. No paid infrastructure or real payment feature was introduced. |

## Assessment decisions still requiring input

- Whether an indie game studio is an acceptable sales-website subject under the approved categories.
- Whether voluntary pay-what-you-want support is a sufficient sale or whether a genuinely supplied fixed-price product is required.
- Whether local/LAN demonstration is acceptable and what Part 2 adds when issued.
- Whether placeholder game content is acceptable for submission.
