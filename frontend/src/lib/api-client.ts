import { print, type DocumentNode } from 'graphql'

import { ensureCsrfToken } from './csrf'
import { env } from './env'

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

type ApiRequestInit = Omit<ApiRequestOptions, 'body' | 'method'>

type GraphQLErrorPayload = {
  message: string
  extensions?: Record<string, unknown>
  path?: (string | number)[]
}

type GraphQLResponse<TData> = {
  data?: TData | null
  errors?: GraphQLErrorPayload[]
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const languageStorageKey = 'savage-worlds-language'

function selectedLanguage(): string {
  try {
    return typeof window === 'undefined'
      ? 'en'
      : window.localStorage.getItem(languageStorageKey) === 'pl'
        ? 'pl'
        : 'en'
  } catch {
    return 'en'
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export class GraphQLRequestError extends Error {
  readonly errors: GraphQLErrorPayload[]

  constructor(errors: GraphQLErrorPayload[]) {
    super(errors.map((error) => error.message).join('; ') || 'GraphQL request failed')
    this.name = 'GraphQLRequestError'
    this.errors = errors
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }

  return fallback
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }

  return response.text().catch(() => null)
}

export async function request<TData>(
  path: string,
  { body, headers, ...init }: ApiRequestOptions = {},
): Promise<TData> {
  const method = (init.method ?? 'GET').toUpperCase()
  const csrfToken = UNSAFE_METHODS.has(method) ? await ensureCsrfToken() : null
  const requestHeaders = new Headers(headers)

  requestHeaders.set('Accept', 'application/json')
  requestHeaders.set('X-Language', selectedLanguage())

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (csrfToken) {
    requestHeaders.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    method,
    credentials: 'include',
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(
      errorMessage(payload, response.statusText || 'Request failed'),
      response.status,
      payload,
    )
  }

  return payload as TData
}

export const api = {
  get: <TData>(path: string, init?: ApiRequestInit) =>
    request<TData>(path, { ...init, method: 'GET' }),
  post: <TData>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<TData>(path, { ...init, method: 'POST', body }),
  put: <TData>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<TData>(path, { ...init, method: 'PUT', body }),
  patch: <TData>(path: string, body?: unknown, init?: ApiRequestInit) =>
    request<TData>(path, { ...init, method: 'PATCH', body }),
  delete: <TData>(path: string, init?: ApiRequestInit) =>
    request<TData>(path, { ...init, method: 'DELETE' }),
}

export async function graphqlRequest<
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(document: DocumentNode, variables?: TVariables, init?: { signal?: AbortSignal }): Promise<TData> {
  const response = await request<GraphQLResponse<TData>>('/graphql', {
    method: 'POST',
    body: { query: print(document), variables },
    signal: init?.signal,
  })

  if (response.errors?.length) {
    throw new GraphQLRequestError(response.errors)
  }

  if (response.data == null) {
    throw new GraphQLRequestError([{ message: 'GraphQL response did not include data' }])
  }

  return response.data
}
