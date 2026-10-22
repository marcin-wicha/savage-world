import { NavLink, Outlet } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
    'px-3 text-[0.68rem] tracking-[0.18em] uppercase',
  )

export function AppShell() {
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
            <NavLink to="/characters" className={navLinkClass}>
              Characters
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
