import { commercial } from '../data/offerings.js'

export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export function formatMoney(value, currency = commercial.currency) {
  return new Intl.NumberFormat(commercial.locale, { style: 'currency', currency }).format(value)
}
