# M8 studio identity: what is decided, what is a token, what is still the studio's call

This is the planning note M8 §2.3 asks for, and the record of how the identity is wired. It holds two
kinds of thing and keeps them visibly apart: **what the site already states as fact**, and **what the
studio has not decided**. The second group is not a backlog of design work I can finish by myself — a
studio name, a biography and a logo belong to the person who owns the work. Suggesting directions is
allowed; applying an unapproved name across the website is not, so nothing below marked "pending" has
been written into any page.

## 1. The rule the identity is built around

M8 §2.3 forbids creating a fake social account, domain, email address or commercial identity, and
forbids using an arbitrary generated name in the final logo. M8 §4.3 and §9 forbid inventing content
the studio has not supplied. An invented contact address is a dead link; an invented biography is a
false statement about a real person; an invented logo is artwork with no owner. So the site states
what is true and labels what is not:

- the working name is shown **as a name**, because it is the name in use in `package.json`, in every
  page title and in the approved roadmap — not as `[PLACEHOLDER]` scaffolding;
- beside it, one marker says the name is not final, and that marker is the only provisional signal in
  the brand;
- where a fact is missing, the page says the fact is missing, in the same place a reader would expect
  it (the letter on the wall does this with `gap: 'biography not supplied'`).

## 2. One source of truth

`src/js/data/studio.js` holds the entire identity: `name`, `nameIsFinal`, `nameMarker`, `kind`,
`summary`, `mark`, `contact`, `web`, `notSupplied`. Before M8 the same fact was written by hand into
eight HTML files and reached the reader three different ways — `[PLACEHOLDER]` in the document title,
"studio name not final" in the brand link, and a placeholder paragraph inside the letter. Now:

| Surface | How it gets the identity | Verified by |
| --- | --- | --- |
| Document title, every route | `titleSuffix` → `metadata.js` | `tests/metadata.test.mjs`, R11 per-route titles |
| Brand link in the header | `{{STUDIO_BRAND}}` → `scripts/static-content.mjs:42` prints the name plus `nameMarker` in a `.placeholder-flag` span | R25 (one marker per page, value taken from the record), R8 (no-JS homepage carries real shared content) |
| Plain name in prose and JSON-LD | `{{STUDIO_NAME}}`, escaped | R18, R19 |
| Search description and Open Graph | `studio.summary` through `metadata.js` | R18 |
| The wall letter | `studioLetter.paragraphs`, with `gap` markers | P-series (`tests/e2e/papers.mjs`) |
| The room's computer panel | the same records the pages render | R1c, R17 |
| Structured data | paths only; `og:url` and `og:image` withheld | R19 ("no origin, no unconfirmed property") |

`identityIsProvisional` (`studio.js:89`) is the single condition the UI branches on. Setting
`nameIsFinal: true` retires every provisional marker in one change; no markup, CSS or test selector is
name-dependent.

## 3. Decided, and why

| Item | Decision | Reason |
| --- | --- | --- |
| Display name | `Saleshi`, labelled not final | It is the name already in use everywhere in the project. Replacing it with an invented one is what §2.3 prohibits. |
| Logo | **none**, `mark: null` | No logo has been supplied and a generated stand-in would be an unapproved mark. The brand is set in type until the studio supplies one. |
| Wordmark asset | none, same reason | The name has to be readable text, not baked into an image (§3.3), so it is styled in CSS. |
| Email, postal address, social accounts | all `null` / `[]` | None supplied. Omitted from every surface rather than rendered as a dead link. |
| itch.io / distribution URL | `web.itchio: null` | The record of the studio's presence elsewhere cannot be invented. |
| Canonical base URL | `web.canonicalBaseUrl: null` | Hosting is M9, and the base is not chosen yet. The consequence is deliberate: no `<link rel="canonical">`, no `sameAs`, and `og:url`/`og:image` withheld (ADR-015). |
| One-line description | `studio.summary` | It states what the site contains — one playable game, a browser demo, a download, optional support — all of which is true and checkable. It says nothing about the studio's character, because that has not been supplied. |
| Favicon | absent | A favicon is a mark; see "Logo" above. |

## 4. Naming directions (a planning note only — none applied)

Offered so the studio has something to react to, not so the site can quietly adopt one. Judged against
what the project actually is: a room you walk around to find a game on a shelf.

| Direction | Reading | For | Against |
| --- | --- | --- | --- |
| Keep `Saleshi` | the project's existing name | zero churn: it is already in the roadmap, `package.json`, the records and every title | reads as a shrink of "sales" + "hi"; it names the *shop*, not the work, and it collides with the word the site uses for creator support |
| Name after the room | e.g. *Shelf and Screen*, *The Lit Desk* | matches the metaphor a visitor actually experiences | commits the studio to one conceit; hard to keep if a second game is nothing like the first |
| Name after the method | e.g. *Careful Evidence*, *Read the Record* | true to the only finished game, which is about not over-concluding | describes one game's ethic as if it were the whole studio's |
| A personal name / handle | the developer's own name or pen name | honest for a one-person studio, and it is the one option no outsider can choose wrongly | needs a decision about how visible the developer wants to be — see §6 |
| A coined word | an invented, ownable short word | best for search and for a later logo | the option most likely to be picked arbitrarily, which is exactly what §2.3 rules out |

Recommendation: the decision is the studio's, and the cheapest moment to make it is before M9, because
the canonical base URL, a favicon and any logo all hang off the name. If no decision arrives, the site
stays as it is — labelled, coherent, and making no claim it cannot support.

## 5. What the pipeline is *not* allowed to do

Three guardrails are enforced by tests, not by intention:

- **No invented identity.** `test:metadata` and R19 fail if structured data contains an origin, an
  email, a social account, a price, a rating or a release date the records do not hold.
- **No unlabelled provisional brand.** R25 reads `nameIsFinal`, `nameMarker` and the letter's `gap` labels
  out of the records and checks that all eight served pages carry the name with exactly one marker and
  no unedited placeholder copy; R14a/R14b check that provisional artwork says what it is. (Before R25
  this row cited R8, which only counts catalogue cards — `tests/test-plan.md` records the correction.)
- **No dead link.** R15 fails any page that links to an origin the suite cannot verify, which is why
  the contact fields are omitted rather than rendered empty.

## 6. Pending — the decisions only the studio can make (§20.9)

Each row lists the single change that closes it. Everything downstream is already wired.

| # | Decision | Exact change | What updates automatically |
| --- | --- | --- | --- |
| 1 | Is **Saleshi** the final studio name? | `studio.nameIsFinal = true` (and `name` if it changes) | every page title, brand link, JSON-LD `publisher`, the letter's `{name}`; the `.placeholder-flag` disappears from eight routes |
| 2 | Who makes the games, and how do they want to be credited? | replace the `gap: 'biography not supplied'` paragraph in `studioLetter` with the studio's own words | the wall letter, its readable HTML copy, `docs/content-architecture.md` provenance line |
| 3 | A logo or wordmark | supply a file; add `studio.mark` + `/public` asset | brand link, og:image candidate, favicon |
| 4 | A contact email | `studio.contact.email` | the store page and the panel gain a real link; structured data can then carry `contactPoint` |
| 5 | Where the studio is based | `studio.contact.postalAddress` (if it is to be public at all) | the letter; `Organization.address` in JSON-LD |
| 6 | Any social or distribution account (itch.io included) | `studio.contact.social[]`, `studio.web.itchio` | the store page, `sameAs` in structured data |
| 7 | A release date for *The Last Witness* | the game record's `releaseDate` | game page status line, `DatePublished`, download panel copy |
| 8 | Is "the empty shift" a stage or an epilogue? | the record's stage list wording | game page, the case J-card, the demo's own copy |
| 9 | Approve or replace the three captured frames as published artwork | `cover.shareApproved` in `games.js` | og:image (once #10 also exists); the provisional-cover label can then be retired |
| 10 | The hosted base URL | `studio.web.canonicalBaseUrl` | `og:url`, `og:image` become absolute, `<link rel="canonical">` is emitted, `sameAs` can be validated — this is M9's gate |
| 11 | A release history / previous projects, if any | `studio.notSupplied` entry removed once supplied | the letter, `AboutPage` structured data |

Items 1–9 need words or files from the studio. Item 10 needs a hosting decision, which M8 §19 puts
outside this milestone's cost limit (no paid hosting, no domain).

## 7. Consequence for the rest of the project

The identity is a data module with one boolean, not a theme. So a branding decision never becomes a
redesign: it becomes a commit to `studio.js` plus a re-run of `test:metadata` and the routes suite.
That is the property M8 §21 asked for — a finished presentation that can still be corrected honestly
when the studio answers.
