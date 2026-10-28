# Catalogue, cart and simulated checkout

## Data model

Games and offerings are deliberately separate. A game describes creative work and its availability; an offering describes a way to acquire or support that work. The current offering is voluntary pay-what-you-want studio support associated with the placeholder game. It includes no premium edition, exclusive content, download or automatic delivery.

- Browser/shared records: `src/js/data/games.js` and `src/js/data/offerings.js`.
- Build-time HTML: `scripts/static-content.mjs` renders homepage cards, catalogue cards, game details and store offerings in development and production.
- Browser cart: `src/js/store/cart.js`, key `saleshi-cart-v1`, one line per offering and no support quantity.
- Server validation: `server/commerce.js` rejects empty/duplicate/unknown lines, unavailable offerings, invalid amounts and excessive decimal precision. Fixed prices, if configured later, come from the server record rather than the submitted amount.
- Persistence boundary: `server/repository.js` selects MySQL by default or memory only when `DB_DRIVER=memory` is explicit.

## Database tables

`server/schema.sql` defines `games`, `offerings`, `orders` and `order_lines`. `server/seed.js` inserts the shared game and offering records through parameterised statements, avoiding a second hand-written price configuration. Orders store the minimal demonstration customer name/email, currency, server-computed total and `simulated` status. Lines snapshot the offering title, unit amount and line total. MySQL order creation uses a transaction and rolls back on failure. All values are passed through parameterised queries.

The memory adapter has the same repository operations for automated tests but no restart persistence. Its use does not establish that MySQL works; MySQL integration is currently **unverified**.

## HTTP API

| Method and route | Behaviour |
| --- | --- |
| `GET /api/health` | Reports the selected database driver and simulated checkout mode |
| `POST /api/cart/quote` | Validates submitted lines and returns authoritative line/total information |
| `POST /api/orders` | Revalidates customer and cart data, creates one order and its lines, returns a safe reference |
| `GET /api/orders/:reference` | Returns a non-customer confirmation projection for a valid high-entropy reference |

The browser never submits an authoritative total. The API ignores any extra total field and computes from validated lines. Order references use 16 random bytes (`SAL-` plus 32 uppercase hexadecimal characters), making sequential enumeration impractical. Confirmation responses omit customer name and email.

## Workflow and honest limits

1. Add support in the room or store; the browser saves the line.
2. Edit/remove it in `/cart/`; reload restores valid saved lines.
3. `/checkout/` requests a server quote and displays that total.
4. Submit name and email only. Client checks provide immediate feedback; the server repeats validation.
5. The API creates a simulated order, the cart clears, and `/order/` retrieves its confirmation.

Every stage states that checkout is simulated, no payment is taken and no automatic delivery is promised. There are no card fields or payment-provider credentials. Whether voluntary support satisfies the assignment's sales category remains a tutor decision; the implementation does not claim that it does.
