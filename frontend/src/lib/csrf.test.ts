import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureCsrfToken, getCsrfToken } from './csrf'

function clearCookies() {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

describe('csrf', () => {
  beforeEach(() => {
    clearCookies()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearCookies()
    vi.unstubAllGlobals()
  })

  it('reads the token from the CSRF cookie', () => {
    document.cookie = 'XSRF-TOKEN=token%2Bvalue; path=/'

    expect(getCsrfToken()).toBe('token+value')
  })

  it('returns the existing token without a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=existing; path=/'

    await expect(ensureCsrfToken()).resolves.toBe('existing')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a token when the cookie is missing', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      document.cookie = 'XSRF-TOKEN=from-response; path=/'
      return { ok: true }
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(ensureCsrfToken()).resolves.toBe('from-response')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/session', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  })

  it('returns null when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(ensureCsrfToken()).resolves.toBeNull()
  })
})
