import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'

import { clearAuthHint, hasAuthHint } from './auth-hint'
import { LogoutButton } from './LogoutButton'
import { sessionQueryKey } from './use-session'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      delete: vi.fn(),
    },
  }
})

const apiDeleteMock = vi.mocked(api.delete)

function renderLogout() {
  const queryClient = createQueryClient()
  queryClient.setQueryData(sessionQueryKey, {
    user: { id: 1, email_address: 'admin' },
    csrf_token: '',
  })
  document.cookie = 'sw_authenticated=1; path=/'

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/characters']}>
        <Routes>
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route path="/characters" element={<LogoutButton />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

describe('LogoutButton', () => {
  beforeEach(() => {
    clearAuthHint()
    vi.clearAllMocks()
  })

  it('signs out, clears the session, and redirects to login', async () => {
    const user = userEvent.setup()
    apiDeleteMock.mockResolvedValue(undefined as never)
    const queryClient = renderLogout()

    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/session')
    })

    expect(await screen.findByRole('heading', { name: /login page/i })).toBeInTheDocument()
    expect(hasAuthHint()).toBe(false)
    expect(queryClient.getQueryData(sessionQueryKey)).toEqual({
      user: null,
      csrf_token: '',
    })
  })

  it('clears local auth when the server session is already gone', async () => {
    const user = userEvent.setup()
    apiDeleteMock.mockRejectedValue(new ApiError('Authentication required', 401, null))
    renderLogout()

    await user.click(screen.getByRole('button', { name: /log out/i }))

    expect(await screen.findByRole('heading', { name: /login page/i })).toBeInTheDocument()
    expect(hasAuthHint()).toBe(false)
  })

  it('stays signed in when sign-out fails', async () => {
    const user = userEvent.setup()
    apiDeleteMock.mockRejectedValue(new ApiError('Server error', 500, null))
    renderLogout()

    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeEnabled()
    })
    expect(screen.queryByRole('heading', { name: /login page/i })).not.toBeInTheDocument()
    expect(hasAuthHint()).toBe(true)
  })
})
