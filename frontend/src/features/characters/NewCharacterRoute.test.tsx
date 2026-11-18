import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api-client'

import { NewCharacterRoute } from './NewCharacterRoute'
import type { CharacterResponse } from './character-draft'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      post: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
    graphqlRequest: vi.fn().mockResolvedValue({
      origins: {
        nodes: [
          {
            id: '1',
            name: 'Dunestriders',
            slug: 'dunestriders',
            description: 'Keepers of the Old Faith.',
            created_at: '',
            updated_at: '',
          },
          {
            id: '2',
            name: 'Greenbloods',
            slug: 'greenbloods',
            description: 'People of the venomous jungle.',
            created_at: '',
            updated_at: '',
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      hindrances: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      skills: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      gear: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
    }),
  }
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderRoute(
  path = '/characters/new',
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/characters/new" element={<NewCharacterRoute />} />
            <Route path="/characters/:id/edit" element={<NewCharacterRoute />} />
            <Route path="/characters" element={<h1>Characters page</h1>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const apiPostMock = vi.mocked(api.post)
const apiPutMock = vi.mocked(api.put)
const apiGetMock = vi.mocked(api.get)
const apiDeleteMock = vi.mocked(api.delete)

const storedCharacter = (
  overrides: Partial<CharacterResponse['character']> = {},
): CharacterResponse['character'] => ({
  id: 9,
  name: null,
  status: 'draft',
  updated_at: '2026-11-18T10:00:00Z',
  concept: null,
  creation_step: 0,
  avatar_url: null,
  rank: 'novice',
  origin_id: null,
  origin_name: null,
  edge_ids: [],
  hindrance_ids: [],
  skill_ids: [],
  attributes: { agility: 'd4', smarts: 'd4', spirit: 'd4', strength: 'd4', vigor: 'd4' },
  skill_dice: {},
  gear: [],
  creation_points: { earned: 0, spent: { attributes: 0, skills: 0, edges: 0 } },
  ...overrides,
})

const finalizeCalls = () =>
  apiPostMock.mock.calls.filter(([path]) => String(path).endsWith('/finalize'))
const createCalls = () => apiPostMock.mock.calls.filter(([path]) => path === '/api/v1/characters')

const dieSides = (die: string) => Number(die.replace('d', ''))

function previewFor(body: unknown) {
  const character =
    body && typeof body === 'object' && 'character' in body
      ? (body.character as { attributes?: Record<string, string> })
      : {}
  const vigorBonus = dieSides(character.attributes?.vigor ?? 'd4') / 2

  return {
    derived: {
      pace: { value: 6, contributions: [{ label: 'Base Pace', value: 6 }] },
      parry: { value: 2, contributions: [{ label: 'Base Parry', value: 2 }] },
      toughness: {
        value: 2 + vigorBonus,
        armor: 0,
        contributions: [
          { label: 'Base Toughness', value: 2 },
          { label: 'Half Vigor', value: vigorBonus },
        ],
      },
    },
  }
}

function mockApi({ stored }: { stored?: CharacterResponse['character'] } = {}) {
  apiPostMock.mockImplementation((path: string, body?: unknown) => {
    if (path === '/api/v1/characters/derived_preview') return Promise.resolve(previewFor(body))
    if (path === '/api/v1/characters') return Promise.resolve({ character: storedCharacter() })
    if (path.endsWith('/finalize')) {
      return Promise.resolve({ character: storedCharacter({ status: 'alive' }) })
    }
    if (path.endsWith('/avatar')) {
      return Promise.resolve({ avatar_url: '/api/v1/characters/9/avatar/abc' })
    }
    return Promise.reject(new Error(`Unexpected POST ${path}`))
  })
  apiPutMock.mockImplementation(() => Promise.resolve({ character: storedCharacter() }))
  apiDeleteMock.mockResolvedValue(null)
  apiGetMock.mockImplementation((path: string) =>
    stored && path === `/api/v1/characters/${stored.id}`
      ? Promise.resolve({ character: stored })
      : Promise.reject(new Error(`Unexpected GET ${path}`)),
  )
}

async function waitForAutosave() {
  await waitFor(() => expect(screen.getByText('Draft saved.')).toBeInTheDocument(), {
    timeout: 3000,
  })
}

describe('NewCharacterRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })

  it('renders every creation step and starts on the concept step', () => {
    renderRoute()

    for (const title of [
      'Concept',
      'Origin',
      'Hindrances',
      'Attributes',
      'Skills',
      'Edges',
      'Gear',
      'Summary',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(title, 'i') })).toBeInTheDocument()
    }

    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^concept$/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Character concept' })).toBeInTheDocument()
    expect(screen.getByText(/this step has no rules effects/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    expect(document.querySelector('[data-slot="multi-step-flow-footer"]')).toHaveClass(
      'sticky',
      'bottom-0',
    )
  })

  it('blocks advancing until the concept step is valid', async () => {
    const user = userEvent.setup()

    renderRoute()

    const next = screen.getByRole('button', { name: /next/i })
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    expect(next).toBeEnabled()
    await user.type(screen.getByLabelText(/^concept$/i), 'A'.repeat(501))
    expect(next).toBeDisabled()
    await user.clear(screen.getByLabelText(/^concept$/i))
    expect(next).toBeEnabled()
    await user.click(next)

    expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /derived statistics/i })).toBeInTheDocument()
  })

  it('blocks advancing until an origin is selected', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    expect(screen.getByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('heading', { name: /take hindrances/i })).toBeInTheDocument()
  })

  it('keeps the hindrance point balance visible after the Hindrances step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('heading', { name: /assign attributes/i })).toBeInTheDocument()
    expect(screen.getByText('Hindrance points')).toBeInTheDocument()
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
  })

  it('recalculates Toughness when Vigor changes on the Attributes step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('heading', { name: /assign attributes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toughness: 4\(0\)/i })).toBeInTheDocument()

    const vigorGroup = screen.getByRole('group', { name: /vigor die/i })
    await user.click(within(vigorGroup).getByRole('button', { name: /d6/i }))

    expect(await screen.findByRole('button', { name: /toughness: 5\(0\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /toughness: 4\(0\)/i })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/v1/characters/derived_preview', {
        character: expect.objectContaining({
          attributes: expect.objectContaining({ vigor: 'd6' }),
        }),
      })
    })
  })

  it('shows the server-calculated Parry with every contribution', async () => {
    const user = userEvent.setup()
    const preview = previewFor({})
    apiPostMock.mockImplementation((path: string) =>
      path === '/api/v1/characters/derived_preview'
        ? Promise.resolve({
            derived: {
              ...preview.derived,
              parry: {
                value: 11,
                contributions: [
                  { label: 'Base Parry', value: 2 },
                  { label: 'Half Fighting (d12)', value: 6 },
                  { label: 'Medium Shield', value: 2 },
                  { label: 'Block', value: 1 },
                ],
              },
            },
          })
        : Promise.resolve({ character: storedCharacter() }),
    )

    renderRoute()
    await user.type(screen.getByLabelText(/character name/i), 'Radagast')
    await user.click(screen.getByRole('button', { name: /next/i }))

    const parry = await screen.findByRole('button', { name: 'Parry: 11' })
    await user.hover(parry)

    const tooltip = await screen.findByTestId('parry-tooltip')
    for (const text of ['Half Fighting (d12)', '+6', 'Medium Shield', 'Block', '+1']) {
      expect(within(tooltip).getByText(text)).toBeInTheDocument()
    }
  })

  it('starts a saved character from its stored statistics', async () => {
    mockApi({
      stored: storedCharacter({
        name: 'Radagast',
        status: 'alive',
        origin_id: 1,
        derived: {
          pace: { value: 6, contributions: [{ label: 'Base Pace', value: 6 }] },
          parry: { value: 12, contributions: [{ label: 'Base Parry', value: 12 }] },
          toughness: { value: 7, armor: 2, contributions: [{ label: 'Armor', value: 2 }] },
        },
      }),
    })

    renderRoute('/characters/9/edit')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /next/i }))

    expect(screen.getByRole('button', { name: 'Parry: 12' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toughness: 7(2)' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(apiPostMock).not.toHaveBeenCalledWith(
      '/api/v1/characters/derived_preview',
      expect.anything(),
    )
  })

  it('returns to the roster from the first step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })

  async function completeFlow(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))
    for (let step = 0; step < 6; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    await user.click(await screen.findByRole('button', { name: /save character/i }))
  }

  it('finalizes the draft with the full character and returns to the roster', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await completeFlow(user)

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(finalizeCalls()).toEqual([
      [
        '/api/v1/characters/9/finalize',
        {
          character: {
            name: 'Katarina Voss',
            concept: '',
            rank: 'novice',
            origin_id: 1,
            edge_ids: [],
            hindrance_ids: [],
            skill_ids: [],
            attributes: { agility: 'd4', smarts: 'd4', spirit: 'd4', strength: 'd4', vigor: 'd4' },
            skill_dice: {},
            hindrance_severities: {},
            gear: {},
            equipped_gear_ids: [],
          },
        },
      ],
    ])
    expect(createCalls()).toHaveLength(1)
  })

  it('refreshes a cached roster before returning to it so the draft is gone', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let rosterStatus: 'draft' | 'alive' = 'draft'
    apiGetMock.mockImplementation((path: string) =>
      path === '/api/v1/characters'
        ? Promise.resolve({
            characters: [storedCharacter({ name: 'Katarina Voss', status: rosterStatus })],
          })
        : Promise.reject(new Error(`Unexpected GET ${path}`)),
    )
    await queryClient.fetchQuery({
      queryKey: ['characters'],
      queryFn: () => api.get('/api/v1/characters'),
    })
    apiPostMock.mockImplementation((path: string) => {
      if (path.endsWith('/finalize')) rosterStatus = 'alive'
      return Promise.resolve({
        character: storedCharacter({ status: path.endsWith('/finalize') ? 'alive' : 'draft' }),
      })
    })

    renderRoute('/characters/new', queryClient)

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await completeFlow(user)

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(queryClient.getQueryData(['characters'])).toEqual({
      characters: [expect.objectContaining({ status: 'alive' })],
    })
  })

  it('shows the server reason when finalizing fails and keeps the draft editable', async () => {
    const user = userEvent.setup()
    const { ApiError } =
      await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client')
    apiPostMock.mockImplementation((path: string) =>
      path.endsWith('/finalize')
        ? Promise.reject(
            new ApiError('Validation failed', 422, {
              details: { hindrance_points_spent: ['must spend all earned hindrance points'] },
            }),
          )
        : Promise.resolve({ character: storedCharacter() }),
    )

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await completeFlow(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'must spend all earned hindrance points',
    )
    expect(screen.getByRole('heading', { name: /review your character/i })).toBeInTheDocument()
  })

  it('previews an avatar on the concept step and uploads it after saving', async () => {
    const user = userEvent.setup()

    renderRoute()

    const avatar = new File(['png'], 'portrait.png', { type: 'image/png' })
    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.upload(screen.getByLabelText('Avatar'), avatar)

    expect(await screen.findByRole('img', { name: 'Avatar preview' })).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/png/),
    )

    await completeFlow(user)

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(apiPostMock).toHaveBeenLastCalledWith(
      '/api/v1/characters/9/avatar',
      expect.any(FormData),
    )
    const body = apiPostMock.mock.calls.at(-1)?.[1]
    expect(body instanceof FormData ? body.get('file') : null).toBe(avatar)
  })

  it('lets the player remove a chosen avatar before saving', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.upload(
      screen.getByLabelText('Avatar'),
      new File(['png'], 'portrait.png', { type: 'image/png' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Remove avatar' }))

    expect(screen.queryByRole('img', { name: 'Avatar preview' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove avatar' })).not.toBeInTheDocument()
  })

  it('rejects unsupported avatar files on the concept step', async () => {
    const user = userEvent.setup({ applyAccept: false })

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.upload(
      screen.getByLabelText('Avatar'),
      new File(['<svg/>'], 'portrait.svg', { type: 'image/svg+xml' }),
    )

    expect(await screen.findByText('Choose a PNG, JPEG, GIF, or WebP image.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('opens the finished character for editing when the avatar upload fails', async () => {
    const user = userEvent.setup()
    mockApi({ stored: storedCharacter({ name: 'Katarina Voss', status: 'alive', origin_id: 1 }) })
    apiPostMock.mockImplementation((path: string) =>
      path.endsWith('/avatar')
        ? Promise.reject(new Error('Image content does not match its type'))
        : Promise.resolve({
            character: storedCharacter({ status: path.endsWith('/finalize') ? 'alive' : 'draft' }),
          }),
    )

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.upload(
      screen.getByLabelText('Avatar'),
      new File(['png'], 'portrait.png', { type: 'image/png' }),
    )
    await completeFlow(user)

    expect(await screen.findByRole('heading', { name: 'Edit character' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/characters/9/edit')
    expect(screen.getByText(/the avatar could not be uploaded/i)).toBeInTheDocument()
  })

  it('saves changes to a finished character without draft autosave', async () => {
    const user = userEvent.setup()
    mockApi({
      stored: storedCharacter({
        name: 'Katarina Voss',
        status: 'alive',
        avatar_url: '/api/v1/characters/9/avatar/abc',
        origin_id: 1,
        origin_name: 'Dunestriders',
      }),
    })

    renderRoute('/characters/9/edit')

    expect(await screen.findByRole('img', { name: 'Avatar preview' })).toHaveAttribute(
      'src',
      '/api/v1/characters/9/avatar/abc',
    )
    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove avatar' }))
    for (let step = 0; step < 7; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    await user.click(await screen.findByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(apiPutMock).toHaveBeenCalledTimes(1)
    expect(apiPutMock).toHaveBeenCalledWith(
      '/api/v1/characters/9',
      expect.objectContaining({
        character: expect.objectContaining({ name: 'Katarina Voss', hindrance_points_spent: 0 }),
      }),
    )
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/9/avatar')
    expect(createCalls()).toHaveLength(0)
    expect(finalizeCalls()).toHaveLength(0)
  })

  describe('step navigation', () => {
    it('lets a new character jump to any step without marking skipped steps complete', async () => {
      const user = userEvent.setup()

      renderRoute()

      const header = screen.getByRole('navigation', { name: /progress/i })
      await user.click(within(header).getByRole('button', { name: /gear/i }))

      expect(
        await screen.findByRole('heading', { name: /visit the gear shop/i }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /completed/i })).not.toBeInTheDocument()
    })

    it('marks steps completed once the player moves past them', async () => {
      const user = userEvent.setup()

      renderRoute()

      await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
      await user.click(screen.getByRole('button', { name: /next/i }))
      const header = screen.getByRole('navigation', { name: /progress/i })
      await user.click(within(header).getByRole('button', { name: /completed.*concept/i }))

      expect(screen.getByLabelText(/character name/i)).toHaveValue('Katarina Voss')
      expect(within(header).getByRole('button', { name: /concept/i })).toHaveAttribute(
        'aria-current',
        'step',
      )

      await user.click(within(header).getByRole('button', { name: /skills/i }))
      expect(await screen.findByRole('heading', { name: /choose skills/i })).toBeInTheDocument()
      expect(within(header).getAllByRole('button', { name: /completed/i })).toHaveLength(1)
    })

    it.each([
      ['a draft', storedCharacter({ name: 'Mira', creation_step: 2 })],
      ['a finished character', storedCharacter({ name: 'Mira', status: 'alive', origin_id: 1 })],
    ])('shows every other step as completed when opening %s', async (_label, stored) => {
      const user = userEvent.setup()
      mockApi({ stored })

      renderRoute('/characters/9/edit')

      const header = await screen.findByRole('navigation', { name: /progress/i })
      const completed = within(header).getAllByRole('button', { name: /completed/i })
      expect(completed).toHaveLength(7)
      completed.forEach((button) => expect(button).toBeEnabled())

      await user.click(within(header).getByRole('button', { name: /summary/i }))
      expect(
        await screen.findByRole('heading', { name: /review your character/i }),
      ).toBeInTheDocument()
    })
  })

  describe('drafts', () => {
    it('does not create a draft before anything is entered', async () => {
      renderRoute()

      expect(screen.getByText('Your progress is saved as a draft as you go.')).toBeInTheDocument()
      await new Promise((resolve) => setTimeout(resolve, 900))
      expect(createCalls()).toHaveLength(0)
    })

    it('creates a draft character as the player works and keeps updating it', async () => {
      const user = userEvent.setup()

      renderRoute()

      await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
      await waitForAutosave()

      expect(createCalls()).toEqual([
        [
          '/api/v1/characters',
          {
            character: expect.objectContaining({ name: 'Katarina Voss', creation_step: 0 }),
          },
        ],
      ])
      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/characters/9/edit')
      })
      expect(screen.getByLabelText(/character name/i)).toHaveValue('Katarina Voss')

      await user.click(screen.getByRole('button', { name: /next/i }))
      expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()

      await waitFor(
        () => {
          expect(apiPutMock).toHaveBeenCalledWith('/api/v1/characters/9', {
            character: expect.objectContaining({ creation_step: 1 }),
          })
        },
        { timeout: 3000 },
      )
      expect(createCalls()).toHaveLength(1)
      expect(apiGetMock).not.toHaveBeenCalled()
    })

    it('resumes a draft character on its saved step', async () => {
      const user = userEvent.setup()
      mockApi({
        stored: storedCharacter({ name: 'Mira', concept: 'Desert scout', creation_step: 1 }),
      })

      renderRoute('/characters/9/edit')

      expect(screen.getByText('Loading character…')).toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Create a character' })).toBeInTheDocument()
      expect(screen.getByText(/draft restored from/i)).toBeInTheDocument()
      await new Promise((resolve) => setTimeout(resolve, 900))
      expect(apiPutMock).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: /back/i }))
      expect(screen.getByLabelText(/character name/i)).toHaveValue('Mira')
      expect(screen.getByLabelText(/^concept$/i)).toHaveValue('Desert scout')
      await waitFor(
        () => {
          expect(apiPutMock).toHaveBeenCalledWith('/api/v1/characters/9', {
            character: expect.objectContaining({ creation_step: 0 }),
          })
        },
        { timeout: 3000 },
      )
    })

    it('explains when a character cannot be loaded', async () => {
      renderRoute('/characters/99/edit')

      expect(await screen.findByText('Could not load character. Try again.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to characters' })).toHaveAttribute(
        'href',
        '/characters',
      )
    })

    it('starts over by deleting the draft character', async () => {
      const user = userEvent.setup()
      mockApi({ stored: storedCharacter({ name: 'Mira' }) })

      renderRoute('/characters/9/edit')

      await user.click(await screen.findByRole('button', { name: 'Start over' }))

      await waitFor(() => {
        expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/9')
      })
      expect(screen.getByLabelText(/character name/i)).toHaveValue('')
      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent('/characters/new')
      })
      expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument()
    })

    it('finalizes a resumed draft instead of creating another character', async () => {
      const user = userEvent.setup()
      mockApi({ stored: storedCharacter({ name: 'Katarina Voss', origin_id: 1 }) })

      renderRoute('/characters/9/edit')
      expect(await screen.findByLabelText(/character name/i)).toHaveValue('Katarina Voss')
      await completeFlow(user)

      expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
      expect(finalizeCalls()).toHaveLength(1)
      expect(createCalls()).toHaveLength(0)
    })
  })
})
