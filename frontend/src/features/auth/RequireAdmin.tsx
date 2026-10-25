import { Navigate, Outlet } from 'react-router-dom'

import { useSession } from './use-session'

export function RequireAdmin() {
  const session = useSession({ enabled: true })

  if (session.isPending) {
    return (
      <p className="text-muted-foreground" role="status">
        Checking admin access…
      </p>
    )
  }

  if (session.data?.user?.role !== 'admin') {
    return <Navigate to="/characters" replace />
  }

  return <Outlet />
}
