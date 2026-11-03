import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'

import { AdminApprovalsRoute } from './AdminApprovalsRoute'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn() } }
})

const getMock = vi.mocked(api.get)
const patchMock = vi.mocked(api.patch)
const pending = { id: 12, email_address: 'new@example.com' }

function renderApprovals() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <AdminApprovalsRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminApprovalsRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading and pending users', async () => {
    let resolveList: (value: { users: (typeof pending)[] }) => void = () => undefined
    getMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }) as never,
    )
    renderApprovals()
    expect(screen.getByRole('status')).toHaveTextContent('Loading registrations')
    await act(async () => resolveList({ users: [pending] }))
    expect(await screen.findByText(pending.email_address)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Approve ${pending.email_address}` })).toBeEnabled()
    expect(getMock).toHaveBeenCalledWith('/api/v1/admin/users', { signal: expect.any(AbortSignal) })
  })

  it('shows an empty message if there are no pending users', async () => {
    getMock.mockResolvedValue({ users: [] } as never)
    renderApprovals()
    expect(await screen.findByText('No pending registrations.')).toBeInTheDocument()
  })

  it('shows a loading failure without approving anyone', async () => {
    getMock.mockRejectedValue(new ApiError('Forbidden', 403, { error: 'Forbidden' }))
    renderApprovals()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load registrations')
    expect(patchMock).not.toHaveBeenCalled()
  })

  it('approves a user, disables duplicate actions, and refreshes the list', async () => {
    const user = userEvent.setup()
    let resolveApproval: (value: { user: typeof pending }) => void = () => undefined
    getMock
      .mockResolvedValueOnce({ users: [pending] } as never)
      .mockResolvedValue({ users: [] } as never)
    patchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApproval = resolve
        }) as never,
    )
    renderApprovals()
    const approve = await screen.findByRole('button', { name: `Approve ${pending.email_address}` })
    await user.click(approve)
    expect(
      screen.getByRole('button', { name: `Approving... ${pending.email_address}` }),
    ).toBeDisabled()
    expect(patchMock).toHaveBeenCalledWith('/api/v1/admin/users/12/approve', { id: 12 })
    await act(async () => resolveApproval({ user: pending }))
    expect(await screen.findByText('No pending registrations.')).toBeInTheDocument()
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
  })

  it('keeps the user visible and displays approval errors for retry', async () => {
    const user = userEvent.setup()
    getMock
      .mockResolvedValueOnce({ users: [pending] } as never)
      .mockResolvedValue({ users: [] } as never)
    patchMock
      .mockRejectedValueOnce(new ApiError('Approval failed', 422, { error: 'Approval failed' }))
      .mockResolvedValue({ user: pending } as never)
    renderApprovals()
    const row = await screen.findByRole('listitem')
    await user.click(within(row).getByRole('button', { name: `Approve ${pending.email_address}` }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Approval failed')
    expect(within(row).getByText(pending.email_address)).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: `Approve ${pending.email_address}` }))
    expect(await screen.findByText('No pending registrations.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
