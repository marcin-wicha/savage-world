import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'

import { LoginRoute } from './LoginRoute'
import { sessionQueryKey } from './use-session'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      post: vi.fn(),
    },
  }
})

const apiPostMock = vi.mocked(api.post)

function renderLogin() {
  const queryClient = createQueryClient()

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/characters" element={<h1>Characters page</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

describe('LoginRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits credentials and redirects to characters', async () => {
    const user = userEvent.setup()
    apiPostMock.mockResolvedValue({
      user: { id: 1, email_address: 'admin' },
    } as never)

    const queryClient = renderLogin()

    await user.type(screen.getByLabelText(/login/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'admin')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/v1/session', {
        email_address: 'admin',
        password: 'admin',
      })
    })

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(queryClient.getQueryData(sessionQueryKey)).toEqual({
      user: { id: 1, email_address: 'admin' },
      csrf_token: '',
    })
  })

  it('shows required field errors without submitting', async () => {
    const user = userEvent.setup()

    renderLogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Login is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('shows an error for invalid credentials', async () => {
    const user = userEvent.setup()
    apiPostMock.mockRejectedValue(new ApiError('Invalid email address or password', 401, null))

    renderLogin()

    await user.type(screen.getByLabelText(/login/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login or password.')
    expect(screen.getByLabelText(/login/i)).toHaveValue('admin')
  })
})
