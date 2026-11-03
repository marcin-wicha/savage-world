import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'

import { clearAuthHint, hasAuthHint } from './auth-hint'
import { LoginRoute } from './LoginRoute'
import { RegisterRoute } from './RegisterRoute'
import { RequireAuth } from './RequireAuth'
import { sessionQueryKey } from './use-session'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, api: { ...actual.api, post: vi.fn() } }
})

const postMock = vi.mocked(api.post)

function renderRegistration(initialPath = '/register') {
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/login"
            element={
              <>
                <LoginRoute />
                <Link to="/characters">Try characters</Link>
              </>
            }
          />
          <Route path="/register" element={<RegisterRoute />} />
          <Route element={<RequireAuth />}>
            <Route path="/characters" element={<h1>Characters page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

async function fillRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /email address/i }), 'new@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret123')
  await user.type(screen.getByLabelText('Confirm password'), 'secret123')
}

describe('RegisterRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthHint()
  })

  it('links from login to registration', async () => {
    const user = userEvent.setup()
    renderRegistration('/login')

    await user.click(screen.getByRole('link', { name: 'Register' }))

    expect(
      screen.getByText('Register', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument()
  })

  it('submits registration without signing in or granting protected access', async () => {
    const user = userEvent.setup()
    postMock.mockResolvedValue({ user: { id: 2 } } as never)
    const client = renderRegistration()

    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('status')).toHaveTextContent('An admin must approve')
    expect(postMock).toHaveBeenCalledWith('/api/v1/registrations', {
      user: {
        email_address: 'new@example.com',
        password: 'secret123',
        password_confirmation: 'secret123',
      },
    })
    expect(hasAuthHint()).toBe(false)
    expect(client.getQueryData(sessionQueryKey)).toBeUndefined()
    await user.click(screen.getByRole('link', { name: 'Back to sign in' }))
    expect(
      screen.getByText('Sign in', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Try characters' }))
    expect(
      await screen.findByText('Sign in', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Characters page' })).not.toBeInTheDocument()
  })

  it('accepts a message response without signing in', async () => {
    const user = userEvent.setup()
    postMock.mockResolvedValue({ message: 'Registration pending approval' } as never)
    const client = renderRegistration()

    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('status')).toHaveTextContent('An admin must approve')
    expect(client.getQueryData(sessionQueryKey)).toBeUndefined()
    expect(hasAuthHint()).toBe(false)
  })

  it('validates input and password confirmation before submitting', async () => {
    const user = userEvent.setup()
    renderRegistration()

    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    await fillRegistration(user)
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('disables submission while loading and shows the API validation error', async () => {
    const user = userEvent.setup()
    let rejectRequest: (error: Error) => void = () => undefined
    postMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject
        }) as never,
    )
    renderRegistration()
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByRole('button', { name: 'Registering...' })).toBeDisabled()
    rejectRequest(
      new ApiError('Email address has already been taken', 422, {
        error: 'Email address has already been taken',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email address has already been taken',
    )
    expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled()
    expect(screen.getByLabelText('Password')).toHaveValue('secret123')
  })

  it('shows a fallback error for a network failure', async () => {
    const user = userEvent.setup()
    postMock.mockRejectedValue(new Error('Network failure'))
    renderRegistration()
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to register. Please try again.',
    )
    await waitFor(() => expect(hasAuthHint()).toBe(false))
  })
})
