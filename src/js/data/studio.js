/**
 * The studio's own identity — M8 WP1.
 *
 * The M8 brief states that a final studio name has not been decided. That used to be carried by
 * hand-written strings in eight HTML files, which is why the same fact reached the page three
 * different ways: "[PLACEHOLDER]" in the document title, "studio name not final" in the brand link
 * and a placeholder paragraph inside the letter. This module makes it one value plus one flag. Every
 * page derives its brand link, title and marker from here, so setting `nameIsFinal` to `true`
 * retires every provisional marker across the site in one change and nothing else has to move.
 *
 * What is deliberately *absent* is as important as what is present. There is no logo file, no
 * generated wordmark, no domain, no email address and no social account, because none has been
 * supplied and an invented one is either a broken link or a false claim about a commercial identity.
 * `mark: null` and the empty `contact` fields are what the acceptance check reads to prove the site
 * makes no claim it cannot support.
 */

export const studio = {
  /**
   * The working name the project has used since M1 — in `package.json`, in every page title, in the
   * README and in the roadmap the studio approved. It is a provisional name in use, not a placeholder
   * awaiting one, so it is displayed as a name and labelled as unconfirmed rather than shown as
   * bracketed scaffolding.
   */
  name: 'Saleshi',

  /** The only flag to change when the studio confirms the name. Nothing else is name-dependent. */
  nameIsFinal: false,

  /** Rendered beside the name in the brand link while `nameIsFinal` is false. */
  nameMarker: 'studio name not final',

  /** What the studio is, which the project itself establishes: one developer, small experimental games. */
  kind: 'indie game studio',

  /**
   * The one line that describes the studio to a search engine or a link preview. It states what the
   * site contains rather than what the studio feels like, because a claim about character has not
   * been supplied and cannot be checked.
   */
  summary: 'Saleshi is an independent game studio. Its current project, The Last Witness, is playable '
    + 'in a browser or downloadable as a desktop demo, and the studio can be supported directly.',

  /** No logo, wordmark or icon asset has been supplied. The brand is therefore set in type, not drawn. */
  mark: null,

  /**
   * Contact and distribution routes. Every field is `null` or empty because none was supplied; the
   * room, the store page and the structured data all omit them instead of offering a dead link.
   */
  contact: {
    email: null,
    postalAddress: null,
    social: [],
  },

  /**
   * Hosted location. `null` until M9 chooses hosting. Nothing invents an address: the site emits no
   * `<link rel="canonical">` and no `sameAs`, and `metadata.js` withholds the two properties that
   * have to be absolute — `og:url` and `og:image` — so structured data carries only paths, which
   * resolve correctly on whatever host the site later gets (M8 §11.3, §11.4).
   *
   * Setting this one field is the whole change: every structured-data URL and both withheld social
   * properties become absolute at once, and the sharing image then waits only on `cover.shareApproved`.
   */
  web: {
    canonicalBaseUrl: null,
    itchio: null,
  },

  /**
   * Facts a reader would expect on an "about" page that the studio has not provided. Listed here so
   * they are stated as unknown in one place instead of being quietly omitted or guessed. The
   * matching decisions are recorded in `docs/branding.md`.
   */
  notSupplied: [
    'whether "Saleshi" is the final studio name',
    'who makes the games, and how they would like to be credited',
    'why the studio exists, or what it calls itself in its own words',
    'a logo or wordmark',
    'a contact email address',
    'where the studio is based',
    'any social or distribution account',
    'a release history or previous projects',
  ],
}

/** True while any part of the identity is still provisional — the single condition the UI branches on. */
export const identityIsProvisional = !studio.nameIsFinal

/** The suffix every page title uses, so the site reads as one studio rather than eight unrelated routes. */
export const titleSuffix = studio.name
