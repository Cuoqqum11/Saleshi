/**
 * Commercial configuration, kept separate from the creative game records.
 *
 * An offering is one way to obtain or support a game, not a second copy of that game. The current
 * offering is voluntary pay-what-you-want creator support: it does not claim to include a premium
 * edition, exclusive content, a download or any other benefit that has not been supplied.
 *
 * Checkout is a simulation. No payment-provider credentials or live transaction flags belong here.
 */

export const commercial = {
  currency: 'GBP',
  locale: 'en-GB',
  checkoutMode: 'simulated',
}

export const offerings = [
  {
    id: 'studio-support',
    gameId: 'placeholder-slug',
    kind: 'pay-what-you-want-support',
    available: true,
    title: 'Voluntary studio support',
    shortLabel: 'Support the studio',
    description:
      'A voluntary contribution towards the studio making this game. This is creator support, not a separate game edition.',
    includes:
      'No premium edition, exclusive content, download or other paid benefit is included. Free distribution routes are listed separately when they exist.',
    terms:
      'This demonstration creates a simulated order only. No payment is taken and no automatic delivery is promised.',
    pricing: {
      model: 'pay-what-you-want',
      currency: 'GBP',
      minimum: 1,
      maximum: 100,
      defaultAmount: 5,
      suggestedAmounts: [3, 5, 10],
    },
  },
]

export const offeringById = (id) => offerings.find((offering) => offering.id === id) ?? null

export const offeringsForGame = (gameId) => offerings.filter((offering) => offering.gameId === gameId)
