import { useRestQuery } from '@/lib/queries'

export type SessionUser = {
  id: number
  email_address: string
}

export type SessionResponse = {
  user: SessionUser | null
  csrf_token: string
}

export const sessionQueryKey = ['session'] as const

export function useSession(options: { enabled?: boolean } = {}) {
  return useRestQuery<SessionResponse>(sessionQueryKey, '/api/v1/session', options)
}
