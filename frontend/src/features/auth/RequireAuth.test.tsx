import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthHint, hasAuthHint } from './auth-hint'
import { RequireAuth } from './RequireAuth'
import { useSession } from './use-session'

vi.mock('./use-session', () => ({
  useSession: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

function setAuthHint() {
  document.cookie = 'sw_authenticated=1; path=/'
}

function renderGuard() {
  render(
    <MemoryRouter initialEntries={['/characters']}>
      <Routes>
        <Route path="/login" element={<h1>Login page</h1>} />
        <Route element={<RequireAuth />}>
          <Route path="/characters" element={<h1>Characters page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
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

    renderGuard()

    expect(await screen.findByRole('heading', { name: /login page/i })).toBeInTheDocument()
    await waitFor(() => expect(hasAuthHint()).toBe(false))
  })
})
