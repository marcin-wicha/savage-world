import { NavLink, Outlet } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { useAuthHint } from '@/features/auth/auth-hint'
import { LogoutButton } from '@/features/auth/LogoutButton'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
    'px-3 text-[0.68rem] tracking-[0.18em] uppercase',
  )

export function AppShell() {
  const authenticated = useAuthHint()
  const session = useSession({ enabled: authenticated })
  const isAdmin = session.data?.user?.role === 'admin'

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-background/95 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="text-foreground font-display text-2xl tracking-wide">
            Savage Worlds Builder
          </NavLink>

          <nav aria-label="Primary" className="flex items-center gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            {authenticated ? (
              <>
                <NavLink to="/characters" className={navLinkClass}>
                  Characters
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin/reference-data" className={navLinkClass}>
                    Admin
                  </NavLink>
                ) : null}
                <LogoutButton />
              </>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
