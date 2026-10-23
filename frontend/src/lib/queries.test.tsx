import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { parse } from 'graphql'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api, graphqlRequest } from './api-client'
import { createQueryClient } from './query-client'
import { useGraphqlInfiniteQuery, useGraphqlQuery, useRestMutation, useRestQuery } from './queries'

vi.mock('./api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  graphqlRequest: vi.fn(),
}))

const apiMock = vi.mocked(api)
const graphqlRequestMock = vi.mocked(graphqlRequest)

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
}

describe('query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches REST queries through the API client', async () => {
    apiMock.get.mockResolvedValue({ id: 1 } as never)

    const { result } = renderHook(
      () => useRestQuery<{ id: number }>(['character', 1], '/api/v1/characters/1'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ id: 1 })
    expect(apiMock.get).toHaveBeenCalledWith(
      '/api/v1/characters/1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('sends REST mutations with the configured method', async () => {
    apiMock.put.mockResolvedValue({ id: 1 } as never)

    const { result } = renderHook(
      () =>
        useRestMutation<{ id: number }, { name: string }>({
          path: '/api/v1/characters/1',
          method: 'PUT',
        }),
      { wrapper },
    )

    await act(async () => {
      await result.current.mutateAsync({ name: 'Aria' })
    })

    expect(apiMock.put).toHaveBeenCalledWith('/api/v1/characters/1', { name: 'Aria' })
  })

  it('fetches GraphQL queries with the supplied document and variables', async () => {
    const document = parse('query Viewer { viewer { id } }')
    graphqlRequestMock.mockResolvedValue({ viewer: { id: '1' } } as never)

    const { result } = renderHook(
      () => useGraphqlQuery<{ viewer: { id: string } }>(['viewer'], document, { first: 1 }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({ viewer: { id: '1' } })
    expect(graphqlRequestMock).toHaveBeenCalledWith(
      document,
      { first: 1 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('fetches GraphQL infinite queries page by page', async () => {
    const document = parse('query Pages { pages { hasNextPage endCursor } }')
    graphqlRequestMock
      .mockResolvedValueOnce({
        pages: { hasNextPage: true, endCursor: 'cursor-1' },
      })
      .mockResolvedValueOnce({
        pages: { hasNextPage: false, endCursor: null },
      })

    const { result } = renderHook(
      () =>
        useGraphqlInfiniteQuery<{
          pages: { hasNextPage: boolean; endCursor: string | null }
        }>(
          ['pages'],
          document,
          (after) => ({ first: 25, after }),
          (page) => (page.pages.hasNextPage ? page.pages.endCursor : null),
        ),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages).toHaveLength(1)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      1,
      document,
      { first: 25, after: null },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      2,
      document,
      { first: 25, after: 'cursor-1' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
