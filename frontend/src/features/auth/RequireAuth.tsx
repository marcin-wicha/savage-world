import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { clearAuthHint, hasAuthHint } from './auth-hint'
import { useSession } from './use-session'

export function RequireAuth() {
  const location = useLocation()
  const hinted = hasAuthHint()
  const session = useSession({ enabled: hinted })
  const signedOut = hinted && session.isSuccess && !session.data?.user

  useEffect(() => {
    if (signedOut) {
      clearAuthHint()
    }
  }, [signedOut])

  if (!hinted || signedOut) {
    const from = `${location.pathname}${location.search}${location.hash}`

    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
