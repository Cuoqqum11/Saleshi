import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { createRepository } from './repository.js'
import { InputError, createOrderReference, quoteCart, validateCustomer } from './commerce.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const app = express()
const repository = createRepository()
const port = Number(process.env.PORT ?? 5173)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production')

app.disable('x-powered-by')
app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (request, response) => {
  response.json({ ok: true, databaseDriver: repository.driver, checkoutMode: 'simulated' })
})

app.post('/api/cart/quote', async (request, response, next) => {
  try {
    response.json(await quoteCart(repository, request.body?.lines))
  } catch (error) { next(error) }
})

app.post('/api/orders', async (request, response, next) => {
  try {
    const customer = validateCustomer(request.body?.customer)
    const quote = await quoteCart(repository, request.body?.lines)
    const order = await repository.createOrder({
      reference: createOrderReference(),
      customerName: customer.name,
      customerEmail: customer.email,
      currency: quote.currency,
      total: quote.total,
      lines: quote.lines,
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
  console.error(error)
  if (response.headersSent) return next(error)
  const status = error instanceof InputError ? error.status : 500
  response.status(status).json({
    error: status === 500 ? 'The server could not complete this request.' : error.message,
  })
})

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Saleshi ${isProduction ? 'production' : 'development'} server: http://127.0.0.1:${port}`)
  console.log(`Database driver: ${repository.driver}; checkout: simulated`)
})

async function shutdown() {
  server.close()
  await repository.close()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
