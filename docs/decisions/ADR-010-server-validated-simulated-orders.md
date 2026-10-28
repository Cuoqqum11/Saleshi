# ADR-010 — Server-validated simulated orders, no payment processing

**Status:** accepted (Milestone 5)

## Context

The sales workflow needs to demonstrate catalogue, cart, checkout, validation and database persistence without collecting card details or claiming a financial transaction. Browser storage and totals cannot be authoritative because a visitor can modify both.

## Decision

Use a persistent browser cart for offering identifiers and contribution amounts only. Express reloads and validates every offering through a repository, recomputes totals and creates an order plus lines. MySQL is the default repository and uses parameterised transactional writes. An in-memory repository is available only through explicit `DB_DRIVER=memory` for local tests. Confirmation uses a random 128-bit reference and excludes customer fields.

## Consequences

- The complete demonstration works without a payment provider and every confirmation says no payment was taken.
- Tampered prices, totals, amounts and offering identifiers are rejected or replaced by authoritative server values.
- MySQL work is separated from HTTP and browser code, but must still be exercised against a real server before being reported as verified.
- Memory-adapter order persistence survives page reloads, not server restarts; this limitation is stated in setup and evidence.
- Real payment processing remains disabled and would require separate approval and a new security/design review.
