import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const page = (path) => fileURLToPath(new URL(path, import.meta.url))

// Multi-page on purpose: every route is real HTML at a real URL, so the site is
// crawlable and readable without JavaScript, and Three.js is only fetched by
// visitors who actually enter the room.
export default defineConfig({
  base: '/',
  plugins: [vue()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        room: page('index.html'),
        featuredGame: page('games/placeholder-slug/index.html'),
      },
    },
  },
})
