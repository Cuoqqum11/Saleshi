/**
 * Builds the site into dist-qa with the room test hooks and the readable drawing buffer switched on.
 *
 * The deployed bundle is `npm run build`; this one exists only so the Playwright suites can drive
 * and photograph the room. It is a production-shaped build — minified, one chunk per entry — which
 * makes it a better stand-in for what a visitor receives than the development server, whose several
 * hundred module requests per room start are what a loaded machine drops first.
 */
import { build } from 'vite'

process.env.VITE_ROOM_HOOKS = '1'

await build({ mode: 'qa', logLevel: 'warn', build: { outDir: 'dist-qa', emptyOutDir: true } })

console.log('QA build written to dist-qa (room test hooks ON). Serve it with: DIST_DIR=dist-qa node server/index.js --production')
console.log('Deployable build is separate: npm run build → dist/ (hooks compiled away).')
