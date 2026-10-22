import { env } from './env'

const CSRF_COOKIE = 'XSRF-TOKEN'

let pendingRequest: Promise<string | null> | null = null

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`))
    ?.slice(CSRF_COOKIE.length + 1)

  return cookie ? decodeURIComponent(cookie) : null
}

export async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfToken()
  if (existing) {
    return existing
  }

  if (!pendingRequest) {
    pendingRequest = fetch(`${env.apiBaseUrl}/api/v1/session`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? getCsrfToken() : null))
      .catch(() => null)
      .finally(() => {
        pendingRequest = null
      })
  }

  return pendingRequest
}
