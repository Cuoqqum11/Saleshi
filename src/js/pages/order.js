import './cartBadge.js'
import { formatMoney } from '../store/money.js'
import { requestJson } from '../store/api.js'

const main = document.getElementById('order-confirmation')
const reference = new URLSearchParams(window.location.search).get('reference')

async function loadOrder() {
  if (!reference) {
    main.textContent = 'No order reference was supplied. Simulated confirmations are available immediately after checkout.'
    return
  }
  try {
    const { order } = await requestJson(`/api/orders/${encodeURIComponent(reference)}`)
    main.replaceChildren()
    const heading = document.createElement('h1')
    heading.textContent = 'Simulated order confirmed'
    const notice = document.createElement('p')
    notice.className = 'unavailable-note'
    notice.textContent = 'Checkout was simulated. No payment was taken, no financial transaction occurred and no automatic delivery is promised.'
    const id = document.createElement('p')
    id.textContent = `Order reference: ${order.reference}`
    const list = document.createElement('ul')
    for (const line of order.lines) {
      const item = document.createElement('li')
      item.textContent = `${line.title}: ${formatMoney(line.lineTotal, order.currency)}`
      list.append(item)
    }
    const total = document.createElement('p')
    total.className = 'cart-total'
    total.textContent = `Simulated order total: ${formatMoney(order.total, order.currency)}`
    const status = document.createElement('p')
    status.textContent = `Status: ${order.status}. Created: ${new Date(order.createdAt).toLocaleString('en-GB')}.`
    const back = document.createElement('a')
    back.className = 'button secondary'
    back.href = '/games/'
    back.textContent = 'Return to the catalogue'
    main.append(heading, notice, id, list, total, status, back)
  } catch (error) {
    main.textContent = `${error.message} Check the reference or return to the store.`
    const back = document.createElement('a')
    back.href = '/store/'
    back.textContent = 'Return to the store'
    main.append(document.createElement('br'), back)
  }
}

loadOrder()
