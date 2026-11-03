import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireAdmin } from './RequireAdmin'
import { useSession } from './use-session'

vi.mock('./use-session', () => ({
  useSession: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

function renderGuard(path = '/admin/reference-data') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin/reference-data" element={<h1>Admin editor</h1>} />
          <Route path="/admin/approvals" element={<h1>Approvals page</h1>} />
        </Route>
        <Route path="/characters" element={<h1>Characters page</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    useSessionMock.mockReset()
  })

  it('waits for the session before rendering protected content', () => {
    useSessionMock.mockReturnValue({ isPending: true } as never)

    renderGuard()

    expect(screen.getByRole('status')).toHaveTextContent(/checking admin access/i)
    expect(screen.queryByRole('heading', { name: /admin editor/i })).not.toBeInTheDocument()
  })

  it('redirects authenticated users without the admin role', async () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: 1, email_address: 'player', role: 'user' }, csrf_token: '' },
    } as never)

    renderGuard()

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /admin editor/i })).not.toBeInTheDocument()
  })

  it('blocks non-admin users from approvals', async () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: 1, email_address: 'player', role: 'user' }, csrf_token: '' },
    } as never)

    renderGuard('/admin/approvals')

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /approvals page/i })).not.toBeInTheDocument()
  })

  it('renders the editor for an admin session', () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: 1, email_address: 'admin', role: 'admin' }, csrf_token: '' },
    } as never)

    renderGuard()

    expect(screen.getByRole('heading', { name: /admin editor/i })).toBeInTheDocument()
  })

  it('allows an admin to view approvals', () => {
    useSessionMock.mockReturnValue({
      isPending: false,
      data: { user: { id: 1, email_address: 'admin', role: 'admin' }, csrf_token: '' },
    } as never)

    renderGuard('/admin/approvals')

    expect(screen.getByRole('heading', { name: /approvals page/i })).toBeInTheDocument()
  })
})
