import './cartBadge.js'
import { offeringById } from '../data/offerings.js'
import { addToCart } from '../store/cart.js'
import { formatMoney } from '../store/money.js'

for (const form of document.querySelectorAll('[data-offering-form]')) {
  const offering = offeringById(form.dataset.offeringForm)
  const feedback = form.parentElement.querySelector('[data-offering-feedback]')
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const amount = new FormData(form).get('amount')
      const line = addToCart(offering.id, amount)
      feedback.dataset.state = 'success'
      feedback.textContent = `${offering.title} added at ${formatMoney(line.amount)}. Review your cart when ready.`
    } catch (error) {
      feedback.dataset.state = 'error'
      feedback.textContent = error.message
    }
  })
  form.hidden = false
}
