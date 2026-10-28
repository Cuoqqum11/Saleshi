import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { createRepository } from './repository.js'
import {
  InputError,
  createOrderFingerprint,
  createOrderReference,
  quoteCart,
  validateCustomer,
  validateIdempotencyKey,
} from './commerce.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const app = express()
const repository = createRepository()
const port = Number(process.env.PORT ?? 5173)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production')

await repository.ping()

app.disable('x-powered-by')
app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '20kb' }))

app.get('/api/health', async (request, response, next) => {
  try {
    await repository.ping()
    response.json({ ok: true, databaseDriver: repository.driver, checkoutMode: 'simulated' })
  } catch (error) { next(error) }
})

app.post('/api/cart/quote', async (request, response, next) => {
  try {
    response.json(await quoteCart(repository, request.body?.lines))
  } catch (error) { next(error) }
})

app.post('/api/orders', async (request, response, next) => {
  try {
    const idempotencyKey = validateIdempotencyKey(request.get('Idempotency-Key'))
    const customer = validateCustomer(request.body?.customer)
    const quote = await quoteCart(repository, request.body?.lines)
    const order = await repository.createOrder({
      reference: createOrderReference(),
      customerName: customer.name,
      customerEmail: customer.email,
      currency: quote.currency,
      total: quote.total,
      lines: quote.lines,
      idempotencyKey,
      requestHash: createOrderFingerprint(customer, quote),
    })
    response.status(201).json({ order, message: 'Simulated order created. No payment was taken.' })
  } catch (error) { next(error) }
})

app.get('/api/orders/:reference', async (request, response, next) => {
  try {
    if (!/^SAL-[A-F0-9]{32}$/.test(request.params.reference)) {
      return response.status(404).json({ error: 'Order not found.' })
    }
    const order = await repository.findOrder(request.params.reference)
    if (!order) return response.status(404).json({ error: 'Order not found.' })
    response.json({ order })
  } catch (error) { next(error) }
})

app.use('/api', (request, response) => response.status(404).json({ error: 'API route not found.' }))

if (isProduction) {
  app.use(express.static(path.resolve('dist')))
  app.use((request, response) => response.status(404).send('Page not found.'))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'mpa' })
  app.use(vite.middlewares)
}

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error)
  const status = error instanceof InputError || error.type === 'entity.parse.failed'
    ? 400
    : error.type === 'entity.too.large'
      ? 413
      : error.status === 409
        ? 409
        : 500
  if (status === 500) console.error('API request failed', { code: error.code ?? 'INTERNAL_ERROR' })
  const message = status === 500
    ? 'The server could not complete this request.'
    : error.type === 'entity.parse.failed'
      ? 'Request body must be valid JSON.'
      : error.type === 'entity.too.large'
        ? 'Request body must be 20 KB or smaller.'
        : error.message
  response.status(status).json({ error: message, ...(error.field ? { field: error.field } : {}) })
})

const server = app.listen(port, '127.0.0.1', (error) => {
  if (error) {
    console.error(`Server could not listen: ${error.code}`)
    repository.close().finally(() => process.exit(1))
    return
  }
  console.log(`Saleshi ${isProduction ? 'production' : 'development'} server: http://127.0.0.1:${server.address().port}`)
  console.log(`Database driver: ${repository.driver}; checkout: simulated`)
})

async function shutdown() {
  server.close()
  await repository.close()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
