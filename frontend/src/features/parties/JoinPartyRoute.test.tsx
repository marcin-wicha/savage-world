import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiError, api } from '@/lib/api-client'

import { JoinPartyRoute } from './JoinPartyRoute'
import { renderAt } from './test-utils'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)

function mockInvite(myMemberships: { character_id: number; status: string }[] = []) {
  apiGetMock.mockImplementation((path: string) =>
    Promise.resolve(
      path === '/api/v1/characters'
        ? {
            characters: [
              { id: 1, name: 'Katarina', status: 'alive' },
              { id: 2, name: 'Vex', status: 'alive' },
              { id: 3, name: null, status: 'draft' },
              { id: 4, name: 'Fallen', status: 'dead' },
            ],
          }
        : {
            party: {
              id: 5,
              name: 'The Crew',
              description: null,
              member_count: 2,
              led_by_me: false,
            },
            my_memberships: myMemberships,
          },
    ),
  )
}

function renderRoute() {
  renderAt('/parties/join/abc', '/parties/join/:code', <JoinPartyRoute />)
}

describe('JoinPartyRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('requests to join with a chosen character', async () => {
    const user = userEvent.setup()
    mockInvite([{ character_id: 2, status: 'pending' }])
    apiPostMock.mockResolvedValue({ membership: { status: 'pending' } })

    renderRoute()

    expect(await screen.findByText('The Crew')).toBeInTheDocument()
    const select = await screen.findByLabelText('Character')
    expect(screen.queryByRole('option', { name: 'Vex' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Fallen' })).not.toBeInTheDocument()
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).not.toContain('')

    await user.selectOptions(select, '1')
    await user.click(screen.getByRole('button', { name: 'Request to join' }))

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/party_invites/abc/memberships', {
      character_id: 1,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Request sent')
  })

  it('explains a duplicate request', async () => {
    const user = userEvent.setup()
    mockInvite()
    apiPostMock.mockRejectedValue(new ApiError('Validation failed', 422, {}))

    renderRoute()

    await user.selectOptions(await screen.findByLabelText('Character'), '1')
    await user.click(screen.getByRole('button', { name: 'Request to join' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already in the party')
  })

  it('shows an invalid invite', async () => {
    apiGetMock.mockRejectedValue(new ApiError('Not found', 404, {}))

    renderRoute()

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
  })
})
