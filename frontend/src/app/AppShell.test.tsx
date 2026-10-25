import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthHint, refreshAuthHint } from '@/features/auth/auth-hint'
import { useSession } from '@/features/auth/use-session'
import { createQueryClient } from '@/lib/query-client'

import { AppShell } from './AppShell'

vi.mock('@/features/auth/use-session', () => ({
  useSession: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

function renderShell() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    clearAuthHint()
    useSessionMock.mockReturnValue({
      data: { user: null, csrf_token: '' },
      isPending: false,
    } as never)
  })

  it('hides guarded navigation for signed-out users', () => {
    renderShell()

    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /characters/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument()
  })

  it('shows guarded navigation for signed-in users', () => {
    document.cookie = 'sw_authenticated=1; path=/'

    renderShell()

    expect(screen.getByRole('link', { name: /characters/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument()
  })

  it('shows the admin navigation for an admin session', () => {
    document.cookie = 'sw_authenticated=1; path=/'
    useSessionMock.mockReturnValue({
      data: { user: { id: 1, email_address: 'admin', role: 'admin' }, csrf_token: '' },
      isPending: false,
    } as never)

    renderShell()

    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('updates navigation when the auth state changes', () => {
    renderShell()

    act(() => {
      document.cookie = 'sw_authenticated=1; path=/'
      refreshAuthHint()
    })

    expect(screen.getByRole('link', { name: /characters/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})
