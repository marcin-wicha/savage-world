import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api-client'

import { NewCharacterRoute } from './NewCharacterRoute'
import { loadCharacterDraft, saveCharacterDraft } from './character-draft'
import { characterFormDefaults } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: {
      ...actual.api,
      post: vi.fn().mockResolvedValue({ character: { id: 1 } }),
      put: vi.fn().mockResolvedValue({ character: { id: 9 } }),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(null),
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

function renderRoute(path = '/characters/new') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/characters/new" element={<NewCharacterRoute />} />
            <Route path="/characters" element={<h1>Characters page</h1>} />
            <Route
              path="/characters/:id/edit"
              element={path === '/characters/new' ? <h1>Edit page</h1> : <NewCharacterRoute />}
            />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const apiPostMock = vi.mocked(api.post)
const apiGetMock = vi.mocked(api.get)
const apiDeleteMock = vi.mocked(api.delete)

describe('NewCharacterRoute', () => {
  beforeEach(() => {
    apiPostMock.mockClear()
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

    expect(screen.getByRole('button', { name: /toughness: 5\(0\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /toughness: 4\(0\)/i })).not.toBeInTheDocument()
  })

  it('returns to the roster from the first step', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByRole('heading', { name: /characters page/i })).toBeInTheDocument()
  })

  it('moves through the flow and completes back to the roster', async () => {
    const user = userEvent.setup()

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))

    for (let step = 0; step < 6; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    expect(
      await screen.findByRole('heading', { name: /review your character/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save character/i }))

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/characters', {
      character: {
        name: 'Katarina Voss',
        rank: 'novice',
        origin_id: 1,
        edge_ids: [],
        hindrance_ids: [],
        skill_ids: [],
        attributes: {
          agility: 'd4',
          smarts: 'd4',
          spirit: 'd4',
          strength: 'd4',
          vigor: 'd4',
        },
        skill_dice: {},
        hindrance_severities: {},
        hindrance_points_earned: 0,
        hindrance_points_spent: 0,
        gear: {},
        equipped_gear_ids: [],
      },
    })
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

  it('previews an avatar on the concept step and uploads it after saving', async () => {
    const user = userEvent.setup()
    apiPostMock
      .mockResolvedValueOnce({ character: { id: 9 } })
      .mockResolvedValueOnce({ avatar_url: '/api/v1/characters/9/avatar/abc' })

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

  it('opens the saved character for editing when the avatar upload fails', async () => {
    const user = userEvent.setup()
    apiPostMock
      .mockResolvedValueOnce({ character: { id: 9 } })
      .mockRejectedValueOnce(new Error('Image content does not match its type'))

    renderRoute()

    await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
    await user.upload(
      screen.getByLabelText('Avatar'),
      new File(['png'], 'portrait.png', { type: 'image/png' }),
    )
    await completeFlow(user)

    expect(await screen.findByRole('heading', { name: /edit page/i })).toBeInTheDocument()
    expect(apiPostMock).toHaveBeenCalledTimes(2)
  })

  it('removes an existing avatar when saving an edited character', async () => {
    const user = userEvent.setup()
    apiGetMock.mockResolvedValue({
      character: {
        id: 9,
        name: 'Katarina Voss',
        avatar_url: '/api/v1/characters/9/avatar/abc',
        rank: 'novice',
        origin_id: 1,
        origin_name: 'Dunestriders',
        edge_ids: [],
        hindrance_ids: [],
        skill_ids: [],
        attributes: { agility: 'd4', smarts: 'd4', spirit: 'd4', strength: 'd4', vigor: 'd4' },
        skill_dice: {},
        gear: [],
        effective_traits: { attributes: {}, skills: {} },
      },
    })

    renderRoute('/characters/9/edit')

    expect(await screen.findByRole('img', { name: 'Avatar preview' })).toHaveAttribute(
      'src',
      '/api/v1/characters/9/avatar/abc',
    )
    await user.click(screen.getByRole('button', { name: 'Remove avatar' }))
    for (let step = 0; step < 7; step += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    await user.click(await screen.findByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/characters/9/avatar')
  })

  describe('drafts', () => {
    beforeEach(() => {
      window.localStorage.clear()
      apiGetMock.mockImplementation((path: string) =>
        Promise.resolve(
          path === '/api/v1/session'
            ? {
                user: { id: 7, email_address: 'player@example.com', role: 'user' },
                csrf_token: 'token',
              }
            : undefined,
        ),
      )
    })

    afterEach(() => {
      apiGetMock.mockReset()
      window.localStorage.clear()
    })

    it('autosaves progress and resumes on the saved step', async () => {
      const user = userEvent.setup()

      renderRoute()
      expect(
        await screen.findByText('Your progress is saved as a draft on this device.'),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
      await user.click(screen.getByRole('button', { name: /next/i }))
      expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()

      await waitFor(() => {
        expect(loadCharacterDraft(7)).toMatchObject({
          step: 1,
          values: { concept: { name: 'Katarina Voss' } },
        })
      })

      cleanup()
      renderRoute()

      expect(await screen.findByRole('heading', { name: /choose an origin/i })).toBeInTheDocument()
      expect(screen.getByText(/draft restored from/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /back/i }))
      expect(screen.getByLabelText(/character name/i)).toHaveValue('Katarina Voss')
    })

    it('starts over from a blank character and clears the draft', async () => {
      const user = userEvent.setup()
      saveCharacterDraft(
        7,
        { ...characterFormDefaults, concept: { name: 'Mira', description: '' } },
        0,
      )

      renderRoute()

      await user.click(await screen.findByRole('button', { name: 'Start over' }))

      expect(screen.getByLabelText(/character name/i)).toHaveValue('')
      expect(loadCharacterDraft(7)).toBeNull()
    })

    it('removes the draft once the character is saved', async () => {
      const user = userEvent.setup()

      renderRoute()
      expect(
        await screen.findByText('Your progress is saved as a draft on this device.'),
      ).toBeInTheDocument()
      await user.type(screen.getByLabelText(/character name/i), 'Katarina Voss')
      await completeFlow(user)

      expect(await screen.findByRole('heading', { name: /characters page/i })).toBeInTheDocument()
      expect(loadCharacterDraft(7)).toBeNull()
    })

    it('does not use drafts when editing an existing character', async () => {
      saveCharacterDraft(
        7,
        { ...characterFormDefaults, concept: { name: 'Mira', description: '' } },
        2,
      )
      apiGetMock.mockImplementation((path: string) =>
        Promise.resolve(
          path === '/api/v1/session'
            ? { user: { id: 7, email_address: 'p@example.com', role: 'user' }, csrf_token: 't' }
            : {
                character: {
                  id: 9,
                  name: 'Katarina Voss',
                  avatar_url: null,
                  rank: 'novice',
                  origin_id: 1,
                  origin_name: 'Dunestriders',
                  edge_ids: [],
                  hindrance_ids: [],
                  skill_ids: [],
                  attributes: characterFormDefaults.attributes,
                  skill_dice: {},
                  effective_traits: { attributes: {}, skills: {} },
                },
              },
        ),
      )

      renderRoute('/characters/9/edit')

      expect(await screen.findByLabelText(/character name/i)).toHaveValue('Katarina Voss')
      expect(screen.queryByText(/draft/i)).not.toBeInTheDocument()
      expect(loadCharacterDraft(7)?.values.concept.name).toBe('Mira')
    })
  })
})
