export async function requestJson(url, options) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? 'The server could not complete this request.')
  return data
}
