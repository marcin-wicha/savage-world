import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAt } from '@/features/parties/test-utils'
import { api, ApiError } from '@/lib/api-client'

import { NewBattleRoute } from './NewBattleRoute'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } }
})

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)

const party = {
  id: 3,
  name: 'The Crew',
  description: null,
  led_by_me: true,
  member_count: 1,
  my_status: 'accepted',
  members: [
    {
      membership_id: 1,
      status: 'accepted',
      owned_by_me: true,
      owner_id: 1,
      character: { id: 1, name: 'Valeria', rank: 'novice', origin_name: null },
    },
  ],
}

const goblin = {
  id: 9,
  name: 'Goblin',
  description: null,
  wild_card: false,
  attribute_dice: { agility: 'd8', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' },
  skills: { fighting: 'd6' },
  pace: 6,
  parry: 5,
  toughness: 6,
  armor: 1,
  size: -1,
  bennies: 0,
  weapons: [],
  edge_slugs: [],
  abilities: [],
}

function mockGets(templates: unknown[] = [goblin]) {
  apiGetMock.mockImplementation(
    (path: string) =>
      Promise.resolve(
        path === '/api/v1/enemy_templates' ? { enemy_templates: templates } : { party },
      ) as never,
  )
}

function renderRoute() {
  return renderAt('/parties/3/battles/new', '/parties/:id/battles/new', <NewBattleRoute />)
}

describe('NewBattleRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
  })

  it('lists the party and validates the enemy selection', async () => {
    const user = userEvent.setup()
    mockGets()
    renderRoute()

    expect(await screen.findByText('Valeria')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /Goblin · Parry 5 · Toughness 6 \(1\)/ }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run simulation' }))

    expect(await screen.findByText('Choose an enemy.')).toBeInTheDocument()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('submits enemies, settings, and seed', async () => {
    const user = userEvent.setup()
    mockGets()
    apiPostMock.mockResolvedValue({ battle: { id: 77 } })
    renderRoute()

    await user.selectOptions(await screen.findByLabelText('Enemy 1'), '9')
    await user.clear(screen.getByLabelText('Count 1'))
    await user.type(screen.getByLabelText('Count 1'), '4')
    await user.selectOptions(screen.getByLabelText('Illumination'), 'dark')
    await user.selectOptions(screen.getByLabelText('Cover against ranged attacks'), 'light')
    await user.clear(screen.getByLabelText('Simulations'))
    await user.type(screen.getByLabelText('Simulations'), '20')
    await user.type(screen.getByLabelText('Seed (optional)'), '1234')
    await user.click(screen.getByLabelText('Morale: Extras may flee when half of them are down'))
    await user.click(screen.getByRole('button', { name: 'Run simulation' }))

    await waitFor(() => expect(apiPostMock).toHaveBeenCalled())
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/parties/3/battles', {
      battle: {
        enemies: [{ enemy_template_id: 9, count: 4 }],
        runs: 20,
        seed: 1234,
        settings: {
          starting_distance: 12,
          max_rounds: 20,
          illumination: 'dark',
          cover: 'light',
          morale: true,
        },
      },
    })
  })

  it('shows server errors', async () => {
    const user = userEvent.setup()
    mockGets()
    apiPostMock.mockRejectedValue(
      new ApiError('Validation failed', 422, {
        error: 'Validation failed',
        details: { party: ['has no accepted characters'] },
      }),
    )
    renderRoute()

    await user.selectOptions(await screen.findByLabelText('Enemy 1'), '9')
    await user.click(screen.getByRole('button', { name: 'Run simulation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('party has no accepted characters')
  })

  it('points to the bestiary when it is empty', async () => {
    mockGets([])
    renderRoute()

    expect(
      await screen.findByRole('link', { name: 'Add enemies to the bestiary' }),
    ).toHaveAttribute('href', '/bestiary')
    expect(screen.queryByRole('button', { name: 'Run simulation' })).not.toBeInTheDocument()
  })
})
