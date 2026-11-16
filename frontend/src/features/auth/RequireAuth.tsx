import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { clearAuthHint, hasAuthHint } from './auth-hint'
import { clearAccountQueries, useSession } from './use-session'

export function RequireAuth() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const hinted = hasAuthHint()
  const session = useSession({ enabled: hinted })
  const signedOut = hinted && session.isSuccess && !session.data?.user

  useEffect(() => {
    if (signedOut) {
      clearAccountQueries(queryClient)
      clearAuthHint()
    }
  }, [signedOut, queryClient])

  if (!hinted || signedOut) {
    const from = `${location.pathname}${location.search}${location.hash}`

    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
