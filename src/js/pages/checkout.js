import './cartBadge.js'
import { clearCart, getCartLines } from '../store/cart.js'
import { formatMoney } from '../store/money.js'
import { requestJson } from '../store/api.js'

const review = document.getElementById('checkout-review')
const form = document.getElementById('checkout-form')
const errorBox = document.getElementById('checkout-error')
const checkoutId = crypto.randomUUID()
const fields = {
  name: document.getElementById('customer-name'),
  email: document.getElementById('customer-email'),
}
let quote = null

function showError(message, field) {
  if (!field || !fields[field]) {
    errorBox.textContent = message
    errorBox.focus()
    return
  }
  const input = fields[field]
  input.setAttribute('aria-invalid', 'true')
  document.getElementById(`customer-${field}-error`).textContent = message
  input.focus()
}

function clearErrors() {
  errorBox.textContent = ''
  for (const [field, input] of Object.entries(fields)) {
    input.removeAttribute('aria-invalid')
    document.getElementById(`customer-${field}-error`).textContent = ''
  }
}

for (const [field, input] of Object.entries(fields)) {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid')
    document.getElementById(`customer-${field}-error`).textContent = ''
  })
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
    form.hidden = false
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
  clearErrors()
  const data = new FormData(form)
  const name = String(data.get('name')).trim()
  if (name.length < 2 || !fields.name.validity.valid) {
    showError('Enter a name between 2 and 100 characters.', 'name')
    return
  }
  if (!fields.email.validity.valid) {
    showError('Enter a valid email address for this demonstration order.', 'email')
    return
  }
  const submit = form.querySelector('button[type="submit"]')
  submit.disabled = true
  try {
    const result = await requestJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutId },
      body: JSON.stringify({
        customer: { name, email: data.get('email') },
        lines: getCartLines(),
      }),
    })
    const reference = result?.order?.reference
    if (typeof reference !== 'string' || !/^SAL-[A-F0-9]{32}$/.test(reference)) {
      throw new Error('The server did not return an order reference. Please try again.')
    }
    clearCart()
    window.location.assign(`/order/?reference=${encodeURIComponent(reference)}`)
  } catch (error) {
    showError(error.message, error.field)
    submit.disabled = false
  }
})

loadReview()
