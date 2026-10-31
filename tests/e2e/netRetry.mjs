/**
 * Navigation retry for suites run on a shared development machine.
 *
 * Windows picks a client's local port from the dynamic range, and when that port is already held by
 * another application's listener the connect() fails with WSAEACCES, which Chromium reports as
 * net::ERR_NETWORK_ACCESS_DENIED. That is a property of the machine, not of the site, so only the
 * transport failure is retried. A page that loads and then fails an assertion still fails, and a
 * 404 or a 500 is never retried because Playwright reports those as responses, not errors.
 *
 * The second pattern below is the same fault observed from the other side: the network process
 * abandons the document mid-navigation, so Playwright reports an interruption rather than an error
 * code, and the tab is left on chrome-error:// or on a repeat of the same address.
 */
const TRANSPORT_FAILURE = /net::ERR_(NETWORK_ACCESS_DENIED|CONNECTION_REFUSED|ADDRESS_UNREACHABLE|NO_NETWORK|SOCKET_NOT_CONNECTED|TIMED_OUT)|EACCES|ECONNREFUSED|EHOSTUNREACH|interrupted by another navigation/i

export async function goto (target, url, options = {}, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await target.goto(url, options)
    } catch (error) {
      lastError = error
      if (!TRANSPORT_FAILURE.test(String(error?.message ?? error))) throw error
      if (attempt < attempts) {
        // An abandoned navigation can still be holding the tab, so let it settle before reissuing it.
        await target.waitForLoadState('load', { timeout: 2000 }).catch(() => {})
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      }
    }
  }
  throw new Error(`${String(lastError.message).split('\n')[0]} — still unreachable after ${attempts} navigation attempts`)
}

/**
 * Same rule for API-style requests, which are used to check that a link or a build file resolves.
 * Accepts a browser context or an already-created request context (`page.request`).
 */
export async function request (target, url, options = {}, attempts = 4) {
  const fetch = target.request?.fetch.bind(target.request) ?? target.fetch.bind(target)
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error
      if (!TRANSPORT_FAILURE.test(String(error?.message ?? error))) throw error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
    }
  }
  throw new Error(`${String(lastError.message).split('\n')[0]} — still unreachable after ${attempts} requests`)
}
