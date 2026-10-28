import { subscribeToCart } from '../store/cart.js'

subscribeToCart(() => {
  for (const badge of document.querySelectorAll('[data-cart-count]')) badge.hidden = false
})
