/**
 * The room suites have to read the scene's own state, and screenshot evidence needs a readable
 * drawing buffer. Neither belongs in the bundle a visitor downloads, so both are switched on by a
 * development origin or by `npm run build:qa`.
 *
 * The QA build exists for a practical reason as well: a development origin asks the browser for
 * several hundred module requests before the room can start, and a single-chunk production-shaped
 * bundle removes that whole class of failure from the run. It is not what gets deployed —
 * `npm run build` compiles these constants to false.
 */
export const TEST_HOOKS = import.meta.env.DEV || import.meta.env.VITE_ROOM_HOOKS === '1'
