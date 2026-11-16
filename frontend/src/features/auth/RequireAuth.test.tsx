import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/lib/query-client'

import { clearAuthHint, hasAuthHint, refreshAuthHint, wasSignedOutByUser } from './auth-hint'
import { RequireAuth } from './RequireAuth'
import { useSession } from './use-session'

vi.mock('./use-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./use-session')>()),
  useSession: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

function setAuthHint() {
  document.cookie = 'sw_authenticated=1; path=/'
}

function LoginProbe() {
  const from = (useLocation().state as { from?: string } | null)?.from

  return <h1>Login page{from ? ` (return to ${from})` : ''}</h1>
}

function renderGuard() {
  const queryClient = createQueryClient()
  queryClient.setQueryData(['characters'], { characters: [{ id: 1, name: 'Old hero' }] })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/characters']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/characters" element={<h1>Characters page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useSessionMock.mockReset()
    clearAuthHint()
  })

  it('redirects signed-out users without waiting for the session request', async () => {
    useSessionMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isSuccess: false,
    } as never)

    renderGuard()

    expect(useSessionMock).toHaveBeenCalledWith({ enabled: false })
    expect(await screen.findByRole('heading', { name: /login page/i })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders signed-in users immediately while the session is validated', async () => {
    setAuthHint()
    useSessionMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isSuccess: false,
    } as never)

    renderGuard()

    expect(useSessionMock).toHaveBeenCalledWith({ enabled: true })
    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders the guarded route for a validated session', async () => {
    setAuthHint()
    useSessionMock.mockReturnValue({
      data: {
        user: { id: 1, email_address: 'admin' },
        csrf_token: '',
      },
      isPending: false,
      isSuccess: true,
    } as never)

    renderGuard()

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })

  it('clears a stale hint and redirects when the session is gone', async () => {
    setAuthHint()
    useSessionMock.mockReturnValue({
      data: { user: null, csrf_token: '' },
      isPending: false,
      isSuccess: true,
    } as never)

    const queryClient = renderGuard()

    expect(await screen.findByRole('heading', { name: /login page/i })).toBeInTheDocument()
    await waitFor(() => expect(hasAuthHint()).toBe(false))
    expect(queryClient.getQueryData(['characters'])).toBeUndefined()
  })

  describe('return path', () => {
    beforeEach(() => {
      useSessionMock.mockReturnValue({
        data: undefined,
        isPending: true,
        isSuccess: false,
      } as never)
    })

    it('keeps the requested page when the user was not signed out on purpose', async () => {
      renderGuard()

      expect(await screen.findByRole('heading', { name: /login page/i })).toHaveTextContent(
        'Login page (return to /characters)',
      )
    })

    it('drops the requested page after an explicit logout', async () => {
      clearAuthHint({ signedOutByUser: true })

      renderGuard()

      expect(await screen.findByRole('heading', { name: /login page/i })).toHaveTextContent(
        /^Login page$/,
      )
    })

    it('forgets the explicit logout once the user signs in again', () => {
      clearAuthHint({ signedOutByUser: true })
      refreshAuthHint()

      expect(wasSignedOutByUser()).toBe(false)
    })
  })
})
