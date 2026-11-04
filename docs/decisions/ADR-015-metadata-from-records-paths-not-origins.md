# ADR-015 — Public metadata is generated from records and states paths, not origins

**Status:** accepted (Milestone 8)

## Context

M8 §11 asks the site to prepare accurate public metadata: a distinct page title per route (§11.1),
meaningful descriptions for the homepage, catalogue, game, demo and store (§11.2), sharing metadata
using *real approved images* (§11.3), and structured data for the game presentation that "only include
properties supported by confirmed information" and never invents a price, rating, availability or
release date (§11.4). §11.5 adds that the room must not be the only source of the site's information.

The same milestone forbids the short cuts that make such metadata look normal. §2.3 forbids a fake
domain, email address, social account or commercial identity; §9 forbids invented reviews, figures,
awards and release history; §19 forbids placeholder content that could be read as genuine material.
And no host exists yet — M9 decides that — so any absolute URL a search engine or a crawler would need
would have to be made up first.

A second problem is specific to this project: metadata is machine-readable, so a value invented in a
record stops being only a sentence on a page and becomes a claim a crawler will repeat. That argues for
generating metadata from the records rather than writing it into eight HTML heads by hand — the same
reason `brandHtml()` exists (M8 WP1).

## Decision

`src/js/data/metadata.js` is the only place that decides what the site asserts about itself, and
`scripts/static-content.mjs` renders it into `<head>` from the tokens `{{JSONLD_STUDIO}}`,
`{{JSONLD_WEBSITE}}`, `{{JSONLD_LIST}}`, `{{JSONLD_GAME}}` and `{{SOCIAL_META}}`. The existing build
guard fails the build on an unfilled token, so a page that asks for metadata no renderer supports
cannot ship.

- **Confirmed values only, structurally.** `defined()` removes any property whose value is absent
  before serialising, so an unconfirmed field cannot reach a validator as an empty string or an empty
  array — which is what a validator reads as an assertion.
- **Paths, not origins.** `absoluteHost()` is `null` while `studio.web.canonicalBaseUrl` is `null`, and
  every structured-data URL is then a plain path; JSON-LD resolves a path against the document that
  carries it, so it stays correct on whatever host the site later gets. The two properties that
  genuinely require an absolute URL — `og:url` and `og:image` — are not emitted at all rather than
  emitted as a half-truth. Setting that one field in M9 makes every URL absolute and releases `og:url`;
  the code already handles both states.
- **No Twitter card.** Twitter's summary cards require `twitter:image`. Declaring a card whose required
  image is withheld is a broken preview, not an honest absence, so the tag is left out until both the
  host and an approved image exist.
- **`og:image` waits on approval as well as on a host.** §11.3 says *approved* images, and the studio
  has not yet approved the three captured frames as published artwork. `cover.shareApproved` is that
  decision expressed in data, so it is a field to flip rather than a code change to make.
- **The sharing block cannot drift from the page.** `og:title` and `og:description` are read out of the
  `<head>` being transformed, not restated in a data module, so a shared link cannot show a title or a
  description the page itself does not display.
- **Structured data where an entity actually exists.** The homepage describes the studio
  (`Organization`, `WebSite`), the catalogue is the list it is (`ItemList`, one `ListItem` per record in
  shelf order), the game page is the one document that asserts the game (`VideoGame`). The demo and
  store pages carry sharing tags only; the cart, checkout and confirmation routes carry neither, because
  a conversation state is not something to advertise and an `Offer`-shaped block would be an invention.
- **No `offers`, and no canonical link.** The site has one offering, and `offerings.js` states that
  nothing is unlocked by it, so the game document says `isAccessibleForFree: true` instead of pricing
  anything. `<link rel="canonical">` would name an origin, so it appears in M9.

## Consequences

- The machine-readable layer is thinner than a typical store page and may earn no rich result. That is
  the intended trade: §11.5's real requirement — information present in HTML without the 3D — was met
  in M5/M7, and §11.5 explicitly forbids promising better rankings merely because metadata was added.
- Because relative `url` values are legal JSON-LD but uncommon, a strict validator may warn about them.
  Recorded as an M9 item rather than solved by inventing a domain now.
- Fabricated record values now propagate further than a paragraph of prose, so the tests check the
  *rules* rather than a snapshot of the output. `npm run test:metadata`
  (`tests/metadata.test.mjs`, 12 cases) pins the permitted key set per `@type`, the forbidden
  properties, `defined()`'s removal behaviour, the host gate in both states, and each stated image
  dimension against that PNG's own header. `tests/e2e/routes.mjs` R18 and R19 then parse the built
  documents in a browser, compare them with the same modules, and prove that no built page points at an
  origin or carries a canonical link.
- Two gates now need studio input rather than engineering: `studio.web.canonicalBaseUrl` (M9) and
  `cover.shareApproved` (§11.3). Both are named in the decisions list.
- The image records gained `width`/`height`, so the `<img>` attributes are built from the files instead
  of from a literal that a future frame could contradict. The stated size is what reserves layout space
  before a picture arrives, which makes it a correctness fact and not a style choice.
