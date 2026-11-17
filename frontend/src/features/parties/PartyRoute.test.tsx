import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { api } from '@/lib/api-client'

import { PartyRoute } from './PartyRoute'
import type { PartyDetail, PartyMember } from './party-types'
import { renderAt } from './test-utils'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

const apiGetMock = vi.mocked(api.get)
const apiPatchMock = vi.mocked(api.patch)
const apiDeleteMock = vi.mocked(api.delete)
const apiPostMock = vi.mocked(api.post)

function member(overrides: Partial<PartyMember> & { name: string }): PartyMember {
  const { name, ...rest } = overrides
  return {
    membership_id: 1,
    status: 'accepted',
    owned_by_me: false,
    owner_id: 10,
    character: { id: 1, name, avatar_url: null, rank: 'novice', origin_name: null },
    ...rest,
  }
}

const members: PartyMember[] = [
  member({ membership_id: 1, owner_id: 10, name: 'Katarina' }),
  member({ membership_id: 2, owner_id: 11, name: 'Rook', status: 'pending' }),
]

function renderParty(party: Partial<PartyDetail>) {
  apiGetMock.mockResolvedValue({
    party: {
      id: 5,
      name: 'The Crew',
      description: 'Treasure hunters',
      led_by_me: false,
      member_count: 1,
      my_status: 'accepted',
      members,
      ...party,
    },
  })
  renderAt('/parties/5', '/parties/:id', <PartyRoute />)
}

describe('PartyRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    apiGetMock.mockReset()
    apiPatchMock.mockReset().mockResolvedValue({})
    apiDeleteMock.mockReset().mockResolvedValue(null)
    apiPostMock.mockReset().mockResolvedValue({})
  })

  it('gives the leader management controls', async () => {
    const user = userEvent.setup()
    renderParty({ led_by_me: true, invite_code: 'abc123' })

    expect(await screen.findByRole('heading', { name: 'The Crew' })).toBeInTheDocument()
    expect(screen.getByLabelText('Invite link')).toHaveValue(
      `${window.location.origin}/parties/join/abc123`,
    )

    await user.click(screen.getByRole('button', { name: 'Accept Rook' }))
    expect(apiPatchMock).toHaveBeenCalledWith('/api/v1/parties/5/memberships/2/accept', {
      membershipId: 2,
    })

    await user.click(screen.getByRole('button', { name: 'Reject Rook' }))
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/parties/5/memberships/2')

    await user.click(screen.getByRole('button', { name: 'Create new link' }))
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/parties/5/invite_code', undefined)
  })

  it('lets the leader transfer leadership and disband the party', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderParty({ led_by_me: true, invite_code: 'abc123' })

    const select = await screen.findByLabelText('New leader')
    expect(within(select).getAllByRole('option')).toHaveLength(2)
    await user.selectOptions(select, '10')
    await user.click(screen.getByRole('button', { name: 'Transfer leadership' }))
    expect(apiPatchMock).toHaveBeenCalledWith('/api/v1/parties/5', {
      party: { leader_id: 10 },
    })

    await user.click(screen.getByRole('button', { name: 'Disband party' }))
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/parties/5')
    expect(await screen.findByText('Parties index')).toBeInTheDocument()
  })

  it('only lets participants leave with their own characters', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderParty({
      members: [
        member({ membership_id: 1, name: 'Katarina' }),
        member({ membership_id: 3, owned_by_me: true, name: 'Vex' }),
      ],
    })

    expect(await screen.findByText('Katarina')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Katarina/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Invite link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disband party' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Party name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Leave Vex' }))
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/parties/5/memberships/3')
    expect(await screen.findByText('Parties index')).toBeInTheDocument()
  })

  it('shows member names with their avatars', async () => {
    renderParty({
      members: [
        member({
          membership_id: 1,
          name: 'Katarina',
          character: {
            id: 1,
            name: 'Katarina',
            avatar_url: '/api/v1/characters/1/avatar/abc',
            rank: 'novice',
            origin_name: null,
          },
        }),
        member({ membership_id: 3, name: 'Vex Morrow' }),
      ],
    })

    expect(await screen.findByRole('img', { name: 'Katarina' })).toHaveAttribute(
      'src',
      '/api/v1/characters/1/avatar/abc',
    )
    expect(screen.getByText('Vex Morrow')).toBeInTheDocument()
    expect(screen.getByText('VM')).toBeInTheDocument()
  })

  it('shows an error when the party cannot be loaded', async () => {
    apiGetMock.mockRejectedValue(new Error('forbidden'))
    renderAt('/parties/5', '/parties/:id', <PartyRoute />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the party')
  })
})
