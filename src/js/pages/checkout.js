import './cartBadge.js'
import { clearCart, getCartLines } from '../store/cart.js'
import { formatMoney } from '../store/money.js'
import { requestJson } from '../store/api.js'

const review = document.getElementById('checkout-review')
const form = document.getElementById('checkout-form')
const errorBox = document.getElementById('checkout-error')
let quote = null

function showError(message) {
  errorBox.textContent = message
  errorBox.focus()
}

async function loadReview() {
  try {
    quote = await requestJson('/api/cart/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: getCartLines() }),
    })
    review.replaceChildren()
    const list = document.createElement('ul')
    for (const line of quote.lines) {
      const item = document.createElement('li')
      item.textContent = `${line.title}: ${formatMoney(line.lineTotal, line.currency)}`
      list.append(item)
    }
    const total = document.createElement('p')
    total.className = 'cart-total'
    total.textContent = `Server-confirmed total: ${formatMoney(quote.total, quote.currency)}`
    review.append(list, total)
  } catch (error) {
    form.hidden = true
    review.textContent = `${error.message} Return to the cart to review its contents.`
    const back = document.createElement('a')
    back.href = '/cart/'
    back.textContent = 'Return to cart'
    review.append(document.createElement('br'), back)
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  errorBox.textContent = ''
  const data = new FormData(form)
  if (String(data.get('name')).trim().length < 2 || !form.checkValidity()) {
    showError('Enter a name of at least two characters and a valid email address.')
    return
  }
  const submit = form.querySelector('button[type="submit"]')
  submit.disabled = true
  try {
    const result = await requestJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: String(data.get('name')).trim(), email: data.get('email') },
        lines: getCartLines(),
      }),
    })
    clearCart()
    window.location.assign(`/order/?reference=${encodeURIComponent(result.order.reference)}`)
  } catch (error) {
    showError(error.message)
    submit.disabled = false
  }
})

loadReview()
