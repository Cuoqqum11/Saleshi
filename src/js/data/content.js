/**
 * The studio's own words — M8 WP2.
 *
 * Two texts are read as physical papers in the room and as ordinary HTML everywhere else: the letter
 * pinned on the west wall and the instruction note pinned beside the computer. They live here as data
 * so that a sentence cannot exist in one place and contradict another. `scripts/static-content.mjs`
 * prints them into the page at build time, and `src/js/ui/paperView.js` clones the page's own copy —
 * which is how the room shows words without baking them into a texture (M8 §3.3).
 *
 * Voice (M8 §9): a person talking about their own work. So no "we are a passionate team of", no
 * invented history, and nothing about the studio that the studio has not said. Where a fact is
 * missing, the paragraph says the fact is missing; `gap` is what prints the labelled marker, so a
 * reader can tell a deliberate blank from finished prose.
 */

/** The letter: what the site is, who is behind it (unknown, stated), and what a visitor can do. */
export const studioLetter = {
  id: 'studio-intro',
  title: 'A note from the studio',
  heading: 'A note from the studio',
  paragraphs: [
    {
      text: 'Hello. This is the website for {name}, and the room you are standing in is how the studio '
        + 'chose to show its work: games sit on the shelf as cassettes, the computer on the desk tells '
        + 'you what each one is and what you can actually do with it, and papers pinned to the walls '
        + 'carry the words that would otherwise be an about page.',
    },
    {
      text: 'There is one game here so far — The Last Witness, a small deduction game about reading '
        + 'records carefully and not concluding more than they support. A demo of it runs in your '
        + 'browser, and a Windows build can be downloaded. Both are free, and neither needs an account.',
    },
    {
      text: 'Who makes these games, and how that person would like to be described, has not been '
        + 'written down for this site yet. Rather than invent a biography or a studio history, this '
        + 'paragraph says plainly that the information is missing.',
      gap: 'biography not supplied',
    },
    {
      text: 'The name {name} is the working name the project has always used. It is not confirmed as '
        + 'the studio\'s final name, so it is labelled wherever it appears until the person who owns '
        + 'the work says otherwise. There is no logo, no email address and no social account, because '
        + 'none of those exist yet either.',
      gap: 'name not final',
    },
    {
      text: 'What you can do here: take a cassette off the shelf and the screen shows that game. Read '
        + 'the pinned notes. Play the browser demo, download the desktop build, or add a voluntary '
        + 'contribution to the cart. Nothing on this site is a store in the usual sense — there is no '
        + 'price for the game, the support amounts are offered rather than charged, and the checkout '
        + 'is simulated, so no card details are asked for and no payment is taken.',
    },
    {
      text: 'Everything the room contains is also written as ordinary text on this page and in the '
        + 'catalogue, so the room is a way of moving around the information, not the only way to reach '
        + 'it. If any part of it does not work on your device, the text is the same information and it '
        + 'does not need WebGL.',
    },
    {
      excludeFromPaper: true,
      link: { to: '#games', label: 'Or skip the room and read the list of games.' },
    },
  ],
}

/**
 * The instruction note. Every sentence here is checked against the code, not against the older docs:
 * M8 §3.2 forbids describing a control that does not exist, and the previous version of this note
 * lived alongside two hints that did exactly that.
 */
export const howToNote = {
  id: 'how-to',
  title: 'How to explore this room',
  heading: 'How to explore this room',
  paragraphs: [
    {
      text: 'Looking around: press and drag anywhere inside the room — with a mouse or with one finger '
        + 'on a touchscreen — and the view turns. Nothing else turns it: the mouse wheel and a pinch '
        + 'gesture do nothing here, because there is no zoom in this room.',
    },
    {
      text: 'Moving: the two buttons under the room, {kbd:Cassette shelf} and {kbd:The computer}, take '
        + 'you to those two spots. While the room has focus, {kbd:Left arrow} and {kbd:Right arrow} '
        + 'step between the same two views.',
    },
    {
      text: 'Walking, on a computer with a keyboard: press {kbd:Walk freely}, then {kbd:W} and '
        + '{kbd:S} or {kbd:Up arrow} and {kbd:Down arrow} walk forwards and back, {kbd:A} and {kbd:D} '
        + 'step sideways, and {kbd:Left arrow} and {kbd:Right arrow} turn around. {kbd:Stop walking} '
        + 'puts you back at the nearest spot. A phone or tablet gets no walk button: there is no '
        + 'on-screen movement control yet, so a control that could not work is not offered.',
    },
    {
      text: 'Choosing something: click or tap it. A drag is never mistaken for a click, so you can look '
        + 'around without picking anything up. With a keyboard, {kbd:Tab} reaches a labelled button for '
        + 'every object in the room and {kbd:Enter} or {kbd:Space} selects it.',
    },
    {
      text: 'Papers pinned to the walls are the studio\'s own words. Select one and it opens full size; '
        + 'close it and you are back where you were standing.',
    },
    {
      text: '{kbd:Escape} leaves the room altogether and returns you to the text version of this page. '
        + 'It does not stop walking — use {kbd:Stop walking} for that.',
    },
  ],
}

export const papers = [studioLetter, howToNote]

/**
 * The room's own instructional text, in one place because it said three different things (M8 §3.2).
 *
 * The launcher hint told visitors to "use the arrow buttons"; the buttons are text-labelled *Cassette
 * shelf* and *The computer*. The move hint said "Esc stops walking"; `startRoom.js:245` sends Escape
 * to `onLeave()`, which closes the room. The walk announcement said the arrow keys move you; only
 * up and down do — left and right turn. Each of those sentences is now written once here and read by
 * the HTML, by `main.js` on touch devices and by the live announcement, so a future change to the
 * controls has one place to be wrong in.
 *
 * Plain text, no markup: these strings are set as `textContent` into a live region.
 */
export const roomHints = {
  /** Before the room starts. */
  launcher: 'Drag to look around. The buttons under the room take you to the shelf or the computer, '
    + 'and selecting a cassette shows it on the screen. Keyboard and screen-reader access works the '
    + 'same way.',
  /** Under the room, on a device with a keyboard. */
  move: 'Drag inside the room to look around. Press Walk freely, then W and S or the up and down '
    + 'arrows to walk, A and D to step sideways, and the left and right arrows to turn. Stop walking '
    + 'returns you to a station. Select a cassette to see it on the computer, or a pinned note to '
    + 'read it. Escape leaves the room.',
  /** The same place, on a touch device, where walking is not offered. */
  moveTouch: 'Drag inside the room to look around. Use the buttons to move to the shelf or the '
    + 'computer. Tap a cassette to see it on the computer, or a pinned note to read it.',
  /** Spoken when walking starts. */
  walkStart: 'Walking freely. W and S or the up and down arrows walk forwards and back, A and D step '
    + 'sideways, and the left and right arrows turn. Drag to look around. Stop walking returns you '
    + 'to the nearest station.',
  /** Spoken when the paper dialog is opened. */
  paperOpen: 'Opened a readable note. Press Escape or use the close button to return to the room.',
}
