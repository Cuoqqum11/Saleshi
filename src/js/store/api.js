export async function requestJson(url, options) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => {
    throw new Error('The server returned an unreadable response. Please try again.')
  })
  if (!response.ok) {
    const error = new Error(data.error ?? 'The server could not complete this request.')
    error.field = data.field
    throw error
  }
  return data
}
