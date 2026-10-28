<script setup>
/**
 * The studio computer: the room's main game-information and acquisition interface.
 * It is a Vue island because selection, contribution amounts and cart feedback are reactive;
 * the room itself remains plain Three.js. Every action is derived from the shared game/offering
 * records, and unavailable destinations are explanatory text rather than fake controls.
 */
import { computed, reactive, ref, watch } from 'vue'
import { offeringsForGame } from '../data/offerings.js'
import { addToCart } from '../store/cart.js'
import { formatMoney } from '../store/money.js'

const props = defineProps({
  game: { type: Object, default: null },
})

const amounts = reactive({})
const cartMessage = ref('')

const gameOfferings = computed(() => props.game ? offeringsForGame(props.game.id) : [])
const supportOfferings = computed(() => gameOfferings.value.filter((offering) => offering.available))

const actions = computed(() => {
  const game = props.game
  if (!game) return []
  const { details, browserDemo, download, itch } = game.availability
  return [
    details.available
      ? { id: 'details', label: 'View full game details', to: game.page, available: true }
      : { id: 'details', label: 'Full game details', available: false, reason: 'The game page has not been published.' },
    browserDemo.available
      ? { id: 'demo', label: 'Play the browser demo', to: browserDemo.url, available: true }
      : { id: 'demo', label: 'Play the browser demo', available: false, reason: browserDemo.reason },
    download.available
      ? { id: 'download', label: 'Download a game build', to: download.url, available: true }
      : { id: 'download', label: 'Download a game build', available: false, reason: download.reason },
    itch.available
      ? { id: 'itch', label: 'Get the free version on itch.io', to: itch.url, available: true }
      : { id: 'itch', label: 'Get the free version on itch.io', available: false, reason: itch.reason },
  ]
})

watch(() => props.game?.id, () => {
  cartMessage.value = ''
  for (const offering of supportOfferings.value) amounts[offering.id] = offering.pricing.defaultAmount
}, { immediate: true })

function addSupport(offering) {
  try {
    const line = addToCart(offering.id, amounts[offering.id])
    cartMessage.value = `${offering.title} added at ${formatMoney(line.amount, offering.pricing.currency)}. Your cart is saved in this browser.`
  } catch (error) {
    cartMessage.value = error.message
  }
}
</script>

<template>
  <div class="screen-inner">
    <p class="screen-cue">Studio computer · {{ game ? 'selected project' : 'standby' }}</p>

    <template v-if="!game">
      <h2>The screen is on standby</h2>
      <p>Pick a cassette from the shelf and this screen will show what it is and what you can do with it.</p>
      <p><a class="screen-link" href="/games/">Browse the conventional catalogue</a></p>
    </template>

    <template v-else>
      <h2>{{ game.title }}</h2>
      <p><span class="status-badge">{{ game.statusLabel }}</span></p>
      <p v-if="game.genre">Genre: {{ game.genre }}</p>
      <p>{{ game.summary }}</p>

      <figure v-if="game.cover" class="screen-media">
        <img :src="game.cover.url" :alt="game.cover.alt" />
      </figure>
      <p v-else class="screen-media-placeholder">Cover artwork has not been supplied.</p>

      <div v-if="game.screenshots.length" class="screen-screenshots">
        <img v-for="shot in game.screenshots" :key="shot.url" :src="shot.url" :alt="shot.alt" />
      </div>

      <h3 class="screen-subheading">Available actions</h3>
      <ul class="screen-actions">
        <li v-for="action in actions" :key="action.id">
          <a v-if="action.available" class="screen-link" :href="action.to">{{ action.label }}</a>
          <div v-else class="screen-unavailable">
            <strong>{{ action.label }}</strong>
            <span>Not available · {{ action.reason }}</span>
          </div>
        </li>
      </ul>

      <section v-for="offering in supportOfferings" :key="offering.id" class="screen-offering" :aria-label="offering.title">
        <h3 class="screen-subheading">{{ offering.title }}</h3>
        <p>{{ offering.description }}</p>
        <form @submit.prevent="addSupport(offering)">
          <label :for="`panel-amount-${offering.id}`">
            Contribution ({{ offering.pricing.currency }}, {{ formatMoney(offering.pricing.minimum) }}–{{ formatMoney(offering.pricing.maximum) }})
          </label>
          <div class="screen-offering-row">
            <input
              :id="`panel-amount-${offering.id}`"
              v-model="amounts[offering.id]"
              type="number"
              :min="offering.pricing.minimum"
              :max="offering.pricing.maximum"
              step="0.01"
              required
            />
            <button class="screen-link" type="submit">Add to cart</button>
          </div>
        </form>
        <p class="screen-terms">{{ offering.terms }}</p>
      </section>

      <p v-if="cartMessage" class="screen-cart-message" role="status">{{ cartMessage }}</p>
      <p v-if="supportOfferings.length"><a href="/cart/">Review cart and simulated checkout</a></p>
    </template>
  </div>
</template>
