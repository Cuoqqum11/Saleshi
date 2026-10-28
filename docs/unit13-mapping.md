# Unit 13 evidence map — M6

This is an evidence index, **not an awarded grade or the final report**. The previous M5 table used implementation-oriented shorthand for several criteria; the labels below follow the standard Unit 13 assessment areas and must be reconciled against the issued centre brief and Part 2. The student still needs one 1,500–2,000-word report in their own words, with appropriate references.

| Criterion | Practical evidence and useful comparison | What the report must still explain |
| --- | --- | --- |
| **P1 — DNS purpose/types and domain organisation/management** | `deployment-options.md` distinguishes local loopback from possible public hosting. No domain or DNS zone was configured. | Explain DNS resolution, authoritative/recursive roles, relevant record types, domain registration/delegation and management. A localhost screenshot is not DNS evidence. |
| **P2 — relationships between protocols, server hardware, operating systems and web-server software** | Browser → HTTP/JSON → Express/Node → MySQL is demonstrated on Windows. MySQL uses loopback TCP, InnoDB and filesystem persistence. | Explain how these layers interact during design, publication and access, including HTTPS/TLS, hosting hardware/resources, OS processes and reverse-proxy/web-server responsibilities. Clearly identify which public-hosting elements remain proposed. |
| **P3 — front-/back-end technologies and presentation/application layers** | HTML/CSS/DOM and Vue present content; Three.js renders the room; Express validates requests; MySQL persists transactions. `commerce.md`, repository tests and the browser checkout show the boundary. | Discuss capabilities and relationships, not merely a list of libraries. Use forged-price rejection to explain why browser presentation is not authoritative application logic. |
| **P4 — online creation tools versus custom-built websites** | The custom room, DOM fallback and checkout provide a concrete comparison subject. WordPress/site-builder alternatives are discussed in deployment options, not implemented comparison sites. | Compare flexibility, performance, functionality, UX and UI with an online builder/CMS. Support claims with referenced examples; do not claim an empirical builder benchmark was run. |
| **M1 — analyse technologies/frameworks' effects on design, functionality and management** | ADRs explain Vue islands, progressive enhancement, room navigation and separate game/offering records. M6 adds retry protection, transactions, a restricted account and tests. | Analyse benefits and costs: reactive island versus whole-page SPA, WebGL immersion versus weight/accessibility, custom code versus maintenance/testing responsibility. A working backend alone does not establish this criterion. |
| **M2 — search-engine influence and evidence-based SEO improvements** | Seven static routes have titles, descriptions, language and one h1; 47 local-link checks and 16 fragment checks pass. No-JS/WebGL fallback and production transfer/timing measurements are retained. | Review indexing/ranking influences and recommend changes tied to evidence: genuine descriptive content, clear link structure, deployed crawlability, compression and real-device measurements. Placeholder content is a limitation. No public ranking, indexing, Lighthouse score or SEO improvement has been measured. |
| **M3 — analyse a range of custom-development tools and techniques** | Vite multi-page build, Vue component, Three.js picking, Express routes, mysql2 parameterisation, InnoDB transactions, Playwright/CDP, Node tests and Git baseline are visible artifacts. | Compare development/testing techniques and alternatives, such as DOM versus canvas controls, static-generated HTML versus client-only content, and real-DB integration tests versus a memory adapter. Explain suitability and trade-offs rather than calling server-side processing itself M3. |
| **D1 — justify selected technologies, management services, tools and software** | ADR-001…010, measured results, known failures and fixes, deployment options and unresolved requirements provide inputs. | Integrate the justification against the brief, cost, content, accessibility, security and maintenance constraints. Explain why local MySQL evidence is useful but not production readiness, and why no paid hosting or real payments were introduced. |

## Retained evidence to cite

- `evidence/m6-mysql-tests.txt`: **14/14** repository/integration checks, actual constraints and rollback, 12 concurrent retries, old-process termination and retrieval by a new process.
- `evidence/m6-database-verification.json`: direct SQL rows and version, restricted application grants, zero duplicate idempotency groups, actual outage 500 responses and refused startup without MySQL.
- `evidence/m6-mysql-commerce.txt`: **30/30** production browser checks using the restricted MySQL account. Includes four viewport widths, keyboard field/error focus, lost/malformed-response retry and duplicate-offering alias rejection.
- `evidence/m6-routes-tests.txt`: **27/27** route, metadata, local-link, fallback, emulated touch and landscape checks.
- `evidence/m6-gate-tests.txt`, `m6-papers-tests.txt`, `m6-movement-tests.txt`: entry, selection, raycast papers, focus restoration, collision and reduced motion.
- `evidence/m6-performance.json` and `m6-build.txt`: explicitly local/headless measurements and build sizes; not real-device frame rate or deployment measurements.
- `evidence/README.md`: indexed full-page screenshots; images prove UI state, not database persistence by themselves.

## Assessment decisions still open

- Game studios are not in the approved category list: obtain tutor acceptance or supply an approved framing.
- Voluntary support is not automatically a qualifying sale; confirm whether a genuinely supplied fixed-price product is required.
- Confirm simulated checkout, placeholder content, the expected framework count and local versus public demonstration requirements.
- Reconcile Part 2 when supplied. Express is a backend framework; it cannot satisfy a requirement for a second frontend framework. Three.js is a rendering library, and any assessment counting rule needs confirmation.
- Write the final referenced report. Screen-reader, physical-device, cross-browser and deployed-operation evidence is still absent and must not be implied.
