import './cartBadge.js'
import { getCartDetails, getCartLines, getCartTotal, removeFromCart, subscribeToCart, updateCartAmount } from '../store/cart.js'
import { formatMoney } from '../store/money.js'
import { requestJson } from '../store/api.js'

const container = document.getElementById('cart-content')
let quoteSequence = 0

function link(text, href, className = '') {
  const anchor = document.createElement('a')
  anchor.textContent = text
  anchor.href = href
  anchor.className = className
  return anchor
}

async function showServerQuote(status) {
  const sequence = ++quoteSequence
  try {
    const quote = await requestJson('/api/cart/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: getCartLines() }),
    })
    if (sequence !== quoteSequence) return
    status.textContent = `Server-checked total: ${formatMoney(quote.total, quote.currency)}. Checkout is simulated; no payment will be taken.`
  } catch (error) {
    if (sequence === quoteSequence) status.textContent = `The displayed total is ${formatMoney(getCartTotal())}. Server check unavailable: ${error.message}`
  }
}

function render() {
  const details = getCartDetails()
  container.replaceChildren()
  if (!details.length) {
    const heading = document.createElement('h2')
    heading.textContent = 'Your cart is empty'
    const text = document.createElement('p')
    text.textContent = 'No contribution has been added. The empty state is saved across reloads too.'
    const actions = document.createElement('p')
    actions.append(link('Browse creator support', '/store/', 'button'))
    container.append(heading, text, actions)
    return
  }

  for (const { offering, amount } of details) {
    const article = document.createElement('article')
    article.className = 'cart-line'
    article.dataset.offeringId = offering.id
    const information = document.createElement('div')
    const heading = document.createElement('h2')
    heading.textContent = offering.title
    const description = document.createElement('p')
    description.textContent = offering.description
    const terms = document.createElement('p')
    terms.textContent = offering.terms
    information.append(heading, description, terms)

    const controls = document.createElement('div')
    const form = document.createElement('form')
    const label = document.createElement('label')
    const inputId = `cart-amount-${offering.id}`
    label.htmlFor = inputId
    label.textContent = `Contribution (${offering.pricing.currency})`
    const row = document.createElement('div')
    row.className = 'form-row'
    const input = document.createElement('input')
    input.id = inputId
    input.name = 'amount'
    input.type = 'number'
    input.min = offering.pricing.minimum
    input.max = offering.pricing.maximum
    input.step = '0.01'
    input.value = amount
    input.required = true
    const update = document.createElement('button')
    update.className = 'button secondary'
    update.type = 'submit'
    update.textContent = 'Update amount'
    row.append(input, update)
    form.append(label, row)
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      try { updateCartAmount(offering.id, input.value) } catch (error) { window.alert(error.message) }
    })
    const remove = document.createElement('button')
    remove.className = 'button secondary'
    remove.type = 'button'
    remove.textContent = `Remove ${offering.title}`
    remove.addEventListener('click', () => removeFromCart(offering.id))
    controls.append(form, remove)
    article.append(information, controls)
    container.append(article)
  }

  const total = document.createElement('p')
  total.className = 'cart-total'
  total.textContent = `Browser display total: ${formatMoney(getCartTotal())}`
  const status = document.createElement('p')
  status.setAttribute('role', 'status')
  status.textContent = 'Checking the total with the server…'
  const actions = document.createElement('div')
  actions.className = 'cart-actions'
  actions.append(link('Continue to simulated checkout', '/checkout/', 'button'), link('Back to store', '/store/', 'button secondary'))
  container.append(total, status, actions)
  showServerQuote(status)
}

subscribeToCart(render)
