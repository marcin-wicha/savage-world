import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { clearAuthHint, refreshAuthHint } from '@/features/auth/auth-hint'
import { createQueryClient } from '@/lib/query-client'

import { AppShell } from './AppShell'

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
