import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api-client'

import { NewCharacterRoute } from './NewCharacterRoute'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), put: vi.fn() },
    graphqlRequest: vi.fn().mockResolvedValue({
      origins: {
        nodes: [{ id: '1', name: 'Dunestriders', slug: 'dunestriders', description: '' }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      hindrances: {
        nodes: [
          {
            id: '7',
            name: 'Hard of Hearing',
            slug: 'hard-of-hearing',
            severity: 'minor_or_major',
            requirements_text: '',
            description: 'Partial or total deafness.',
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      skills: {
        nodes: [
          {
            id: '8',
            name: 'Athletics',
            slug: 'athletics',
            attribute: 'agility',
            core: true,
            description: 'Run, jump, climb, and swim.',
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      edges: {
        nodes: [
          {
            id: '9',
            name: 'Alertness',
            slug: 'alertness',
            category: 'background',
            minimum_rank: 'novice',
            requirements: [],
            requirements_text: '',
            repeatable: false,
            effects: [],
            description: 'Notice danger.',
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      gear: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
    }),
  }
})

const apiGetMock = vi.mocked(api.get)
const apiPutMock = vi.mocked(api.put)

const savedCharacter = {
  id: 5,
  name: 'Katarina Voss',
  description: 'A relentless monster hunter.',
  rank: 'novice',
  origin_id: 1,
  origin_name: 'Dunestriders',
  edge_ids: [9],
  hindrance_ids: [7],
  hindrance_severities: { '7': 'major' },
  hindrance_points_earned: 2,
  skill_ids: [8],
  skills: [{ id: 8, core: true, die: 'd6' }],
  attributes: { agility: 'd6', smarts: 'd6', spirit: 'd6', strength: 'd6', vigor: 'd6' },
  skill_dice: { '8': 'd6' },
  gear: [],
  effective_traits: { attributes: {}, skills: {} },
}

function renderEditRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/characters/5/edit']}>
          <Routes>
            <Route path="/characters/:id/edit" element={<NewCharacterRoute />} />
            <Route path="/characters" element={<h1>Characters page</h1>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('NewCharacterRoute when editing', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue({ character: savedCharacter })
    apiPutMock.mockReset()
    apiPutMock.mockResolvedValue({ character: { id: 5 } })
  })

  it('restores the saved description, severities, and hindrance points', async () => {
    const user = userEvent.setup()

    renderEditRoute()

    expect(await screen.findByDisplayValue('A relentless monster hunter.')).toBeInTheDocument()

    for (let step = 0; step < 7; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    expect(
      await screen.findByRole('heading', { name: /review your character/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hard of Hearing (major)' })).toBeInTheDocument()
    expect(screen.getByText('All hindrance points have been spent.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(apiPutMock).toHaveBeenCalledWith(
      '/api/v1/characters/5',
      expect.objectContaining({
        character: expect.objectContaining({
          description: 'A relentless monster hunter.',
          hindrance_ids: [7],
          hindrance_severities: { '7': 'major' },
          hindrance_points_earned: 2,
          hindrance_points_spent: 2,
        }),
      }),
    )
    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })
})
