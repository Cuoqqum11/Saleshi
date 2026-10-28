<script setup>
/**
 * The computer screen.
 *
 * This is the one place the room has genuinely reactive interface state: which project is
 * selected, which of its actions really exist, and what to say about the ones that do not.
 * It is a Vue island mounted into existing HTML, so the page stays a page and the room stays
 * plain Three.js.
 */
import { computed } from 'vue'

const props = defineProps({
  game: { type: Object, default: null },
})

const actions = computed(() => {
  const game = props.game
  if (!game) return []

  const list = [
    game.availability.details.available
      ? { id: 'details', label: 'Open the game page', to: game.page, available: true }
      : { id: 'details', label: 'Game page', available: false, reason: 'Not published yet.' },
    game.availability.browserDemo.available
      ? { id: 'demo', label: 'Play the browser demo', to: '/play/', available: true }
      : { id: 'demo', label: 'Play the browser demo', available: false, reason: game.availability.browserDemo.reason },
    game.availability.download.available
      ? { id: 'download', label: 'Download the build', to: game.availability.download.url, available: true }
      : { id: 'download', label: 'Download a build', available: false, reason: game.availability.download.reason },
  ]

  for (const offering of game.offerings) {
    list.push(
      offering.available
        ? { id: offering.id, label: offering.label, to: offering.url ?? `/store/?offering=${offering.id}`, available: true }
        : { id: offering.id, label: offering.label, available: false, reason: offering.reason },
    )
  }

  return list
})

const activeCount = computed(() => actions.value.filter((action) => action.available).length)
</script>

<template>
  <div class="screen-inner">
    <p class="screen-cue">{{ game ? 'selected project' : 'standby' }}</p>

    <template v-if="!game">
      <h2>The screen is on standby</h2>
      <p>Pick a cassette from the shelf and this screen will show what it is and what you can do with it.</p>
    </template>

    <template v-else>
      <h2>{{ game.title }}</h2>
      <p>Status: {{ game.statusLabel }}<template v-if="game.genre"> · Genre: {{ game.genre }}</template></p>
      <p>{{ game.summary }}</p>
      <ul class="screen-actions">
        <li v-for="action in actions" :key="action.id">
          <a v-if="action.available" class="screen-link" :href="action.to">{{ action.label }}</a>
          <div v-else class="screen-unavailable">
            <strong>{{ action.label }}</strong>
            <span>Not available · {{ action.reason }}</span>
          </div>
        </li>
      </ul>
      <p class="screen-cue">{{ activeCount }} of {{ actions.length }} actions live</p>
    </template>
  </div>
</template>
