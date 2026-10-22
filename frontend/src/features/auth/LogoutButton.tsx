import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { useRestMutation } from '@/lib/queries'

import { clearAuthHint } from './auth-hint'
import { type SessionResponse, sessionQueryKey } from './use-session'

export function LogoutButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const clearSession = () => {
    queryClient.setQueryData<SessionResponse>(sessionQueryKey, (current) => ({
      user: null,
      csrf_token: current?.csrf_token ?? '',
    }))
    clearAuthHint()
    navigate('/login', { replace: true })
  }

  const logoutMutation = useRestMutation<void, void>(
    { path: '/api/v1/session', method: 'DELETE' },
    {
      onSuccess: clearSession,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
        }
      },
    },
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="px-3 text-[0.68rem] tracking-[0.18em] uppercase"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
    >
      {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
    </Button>
  )
}
