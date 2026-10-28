import { NavLink, Outlet } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { useAuthHint } from '@/features/auth/auth-hint'
import { LogoutButton } from '@/features/auth/LogoutButton'
import { useSession } from '@/features/auth/use-session'
import { useLanguage } from '@/lib/i18n-context'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
    'px-3 text-[0.68rem] tracking-[0.18em] uppercase',
  )

export function AppShell() {
  const { language, setLanguage, t } = useLanguage()
  const authenticated = useAuthHint()
  const session = useSession({ enabled: authenticated })
  const isAdmin = session.data?.user?.role === 'admin'

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-background/95 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <NavLink to="/" className="text-foreground font-display text-2xl tracking-wide">
            {t('Savage Worlds Builder')}
          </NavLink>

          <nav aria-label={t('Primary')} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="language-selector">
              {t('Language')}
            </label>
            <select
              id="language-selector"
              value={language}
              onChange={(event) => setLanguage(event.target.value === 'pl' ? 'pl' : 'en')}
              className="border-border bg-background text-foreground focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-xs uppercase outline-none focus-visible:ring-3"
            >
              <option value="en">EN</option>
              <option value="pl">PL</option>
            </select>
            <NavLink to="/" end className={navLinkClass}>
              {t('Home')}
            </NavLink>
            {authenticated ? (
              <>
                <NavLink to="/characters" className={navLinkClass}>
                  {t('Characters')}
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin/reference-data" className={navLinkClass}>
                    {t('Admin')}
                  </NavLink>
                ) : null}
                <LogoutButton />
              </>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                {t('Login')}
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
