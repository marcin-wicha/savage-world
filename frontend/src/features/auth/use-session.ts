import type { QueryClient } from '@tanstack/react-query'

import { useRestQuery } from '@/lib/queries'

export type SessionUser = {
  id: number
  email_address: string
  role: 'user' | 'admin'
}

export type SessionResponse = {
  user: SessionUser | null
  csrf_token: string
}

export const sessionQueryKey = ['session'] as const

export function useSession(options: { enabled?: boolean } = {}) {
  return useRestQuery<SessionResponse>(sessionQueryKey, '/api/v1/session', options)
}

export function clearAccountQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== sessionQueryKey[0],
  })
}
