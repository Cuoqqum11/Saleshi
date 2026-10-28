import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { staticContentPlugin } from './scripts/static-content.mjs'

const page = (path) => fileURLToPath(new URL(path, import.meta.url))

// Multi-page on purpose: every route is real HTML at a real URL, so the site is
// crawlable and readable without JavaScript, and Three.js is only fetched by
// visitors who actually enter the room.
export default defineConfig({
  base: '/',
  plugins: [vue(), staticContentPlugin()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        room: page('index.html'),
        catalogue: page('games/index.html'),
        featuredGame: page('games/placeholder-slug/index.html'),
        store: page('store/index.html'),
        cart: page('cart/index.html'),
        checkout: page('checkout/index.html'),
        order: page('order/index.html'),
      },
    },
  },
})
