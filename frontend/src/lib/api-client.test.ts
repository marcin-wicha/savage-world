import { parse } from 'graphql'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, graphqlRequest, GraphQLRequestError, request } from './api-client'
import { ensureCsrfToken } from './csrf'

vi.mock('./csrf', () => ({
  ensureCsrfToken: vi.fn(),
}))

const ensureCsrfTokenMock = vi.mocked(ensureCsrfToken)

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

describe('api-client', () => {
  beforeEach(() => {
    ensureCsrfTokenMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends GET requests with credentials and without a CSRF token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/api/v1/characters/1')).resolves.toEqual({ id: 1 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers

    expect(url).toBe('/api/v1/characters/1')
    expect(init.credentials).toBe('include')
    expect(init.method).toBe('GET')
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('X-Language')).toBe('en')
    expect(headers.get('X-CSRF-Token')).toBeNull()
    expect(ensureCsrfTokenMock).not.toHaveBeenCalled()
  })

  it('sends the persisted Polish language preference', async () => {
    window.localStorage.setItem('savage-worlds-language', 'pl')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/v1/characters')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Headers).get('X-Language')).toBe('pl')
  })

  it('sends JSON bodies and the CSRF token for unsafe methods', async () => {
    ensureCsrfTokenMock.mockResolvedValue('csrf-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/api/v1/characters', { name: 'Aria' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers

    expect(url).toBe('/api/v1/characters')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'Aria' }))
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token')
  })

  it('returns null for empty responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/api/v1/session', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('throws an ApiError with the backend message for failed requests', async () => {
    ensureCsrfTokenMock.mockResolvedValue('csrf-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'Invalid authenticity token' }, { status: 422 }))
    vi.stubGlobal('fetch', fetchMock)

    const requestPromise = api.post('/api/v1/characters', { name: 'Aria' })

    await expect(requestPromise).rejects.toBeInstanceOf(ApiError)
    await expect(requestPromise).rejects.toMatchObject({
      status: 422,
      message: 'Invalid authenticity token',
      payload: { error: 'Invalid authenticity token' },
    })
  })

  it('posts printed GraphQL documents and returns their data', async () => {
    ensureCsrfTokenMock.mockResolvedValue('csrf-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { viewer: { id: '1' } } }))
    vi.stubGlobal('fetch', fetchMock)
    const document = parse('query Viewer { viewer { id } }')

    await expect(graphqlRequest(document, { first: 1 })).resolves.toEqual({
      viewer: { id: '1' },
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as {
      query: string
      variables: Record<string, unknown>
    }

    expect(url).toBe('/graphql')
    expect(init.method).toBe('POST')
    expect(body.query).toContain('query Viewer')
    expect(body.variables).toEqual({ first: 1 })
  })

  it('throws a GraphQLRequestError when the response contains errors', async () => {
    ensureCsrfTokenMock.mockResolvedValue('csrf-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errors: [{ message: 'Nope' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const requestPromise = graphqlRequest(parse('query Viewer { viewer { id } }'))

    await expect(requestPromise).rejects.toBeInstanceOf(GraphQLRequestError)
    await expect(requestPromise).rejects.toMatchObject({
      message: 'Nope',
      errors: [{ message: 'Nope' }],
    })
  })
})
