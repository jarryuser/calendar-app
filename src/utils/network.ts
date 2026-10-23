export async function fetchWithRetry(url: string, options: RequestInit = {}, attempts = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20_000)
    const abort = () => controller.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      if (response.status < 500 || attempt >= attempts - 1) return response
      await response.body?.cancel()
    } catch (error) {
      if (options.signal?.aborted || attempt >= attempts - 1) throw error
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', abort)
    }
    await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt))
  }
}

export function validateRemoteUrl(value: string, allowQuery = false): string {
  const url = new URL(value, typeof location === 'undefined' ? 'http://localhost' : location.href)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Use HTTPS or a local development server')
  }
  if (url.username || url.password || (!allowQuery && (url.search || url.hash))) throw new Error('Invalid server URL')
  return url.href.replace(/\/$/, '')
}
