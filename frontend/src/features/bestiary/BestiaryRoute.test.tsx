import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAt } from '@/features/parties/test-utils'
import { api, ApiError } from '@/lib/api-client'

import { BestiaryRoute } from './BestiaryRoute'
import type { EnemyTemplate } from './enemy-types'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }
})

const apiGetMock = vi.mocked(api.get)
const apiPostMock = vi.mocked(api.post)
const apiPatchMock = vi.mocked(api.patch)
const apiDeleteMock = vi.mocked(api.delete)

const orc: EnemyTemplate = {
  id: 7,
  read_only: false,
  name: 'Orc Chieftain',
  description: 'Leads the warband.',
  wild_card: true,
  attribute_dice: { agility: 'd6', smarts: 'd6', spirit: 'd8', strength: 'd12+1', vigor: 'd10' },
  skills: { fighting: 'd10', intimidation: 'd8' },
  pace: 6,
  parry: 7,
  toughness: 11,
  armor: 3,
  size: 1,
  bennies: 2,
  weapons: [{ name: 'Great Axe', damage: 'Str+d10', ap: 3 }],
  edge_slugs: ['sweep'],
  abilities: ['hardy'],
}

function renderRoute() {
  return renderAt('/bestiary', '/bestiary', <BestiaryRoute />)
}

describe('BestiaryRoute', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiPatchMock.mockReset()
    apiDeleteMock.mockReset()
    apiGetMock.mockResolvedValue({ enemy_templates: [orc] })
  })

  it('shows stat blocks', async () => {
    renderRoute()

    expect(await screen.findByText('Orc Chieftain')).toBeInTheDocument()
    expect(screen.getByText('Wild Card', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(screen.getByText(/Strength d12\+1/)).toBeInTheDocument()
    expect(screen.getByText(/Fighting d10 · Intimidation d8/)).toBeInTheDocument()
    expect(screen.getByText(/Great Axe Str\+d10 AP 3/)).toBeInTheDocument()
    expect(screen.getByText('11 (3)', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Sweep · Hardy/)).toBeInTheDocument()
  })

  it('shows seeded entries without edit or delete controls', async () => {
    apiGetMock.mockResolvedValueOnce({ enemy_templates: [{ ...orc, read_only: true }] })
    renderRoute()

    expect(await screen.findByText('Orc Chieftain')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Orc Chieftain' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Orc Chieftain' })).not.toBeInTheDocument()
  })

  it('shows the empty and error states', async () => {
    apiGetMock.mockResolvedValueOnce({ enemy_templates: [] })
    const { unmount } = renderRoute()
    expect(await screen.findByText('No enemies yet.')).toBeInTheDocument()
    unmount()

    apiGetMock.mockRejectedValueOnce(new Error('boom'))
    renderRoute()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the bestiary.')
  })

  it('validates and creates an enemy', async () => {
    const user = userEvent.setup()
    apiPostMock.mockResolvedValue({ enemy_template: { ...orc, id: 8, name: 'Goblin' } })
    renderRoute()
    await screen.findByText('Orc Chieftain')

    const form = screen.getByRole('button', { name: 'Add enemy' }).closest('form')
    if (!form) throw new Error('form not found')
    await user.clear(within(form).getByLabelText('Damage'))
    await user.type(within(form).getByLabelText('Damage'), 'lots')
    await user.click(within(form).getByRole('button', { name: 'Add enemy' }))

    expect(await within(form).findByText('Name is required.')).toBeInTheDocument()
    expect(within(form).getByText('Use damage such as Str+d6 or 2d6.')).toBeInTheDocument()
    expect(apiPostMock).not.toHaveBeenCalled()

    await user.type(within(form).getByLabelText('Name'), 'Goblin')
    await user.clear(within(form).getByLabelText('Damage'))
    await user.type(within(form).getByLabelText('Damage'), 'Str + d4')
    await user.clear(within(form).getByLabelText('Range'))
    await user.type(within(form).getByLabelText('Range'), '3/6/12')
    await user.click(within(form).getByLabelText('Fearless'))
    await user.click(within(form).getByRole('button', { name: 'Add enemy' }))

    await waitFor(() => expect(apiPostMock).toHaveBeenCalled())
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/enemy_templates', {
      enemy_template: expect.objectContaining({
        name: 'Goblin',
        wild_card: false,
        skills: { fighting: 'd6', notice: 'd6' },
        weapons: [{ name: 'Short Sword', damage: 'Str+d4', range: '3/6/12' }],
        edge_slugs: [],
        abilities: ['fearless'],
      }),
    })
  })

  it('shows server validation errors', async () => {
    const user = userEvent.setup()
    apiPostMock.mockRejectedValue(
      new ApiError('Validation failed', 422, {
        error: 'Validation failed',
        details: { edge_slugs: ['contains unknown edges: laser-eyes'] },
      }),
    )
    renderRoute()
    await screen.findByText('Orc Chieftain')

    await user.type(screen.getByLabelText('Name'), 'Goblin')
    await user.click(screen.getByRole('button', { name: 'Add enemy' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'edge slugs contains unknown edges: laser-eyes',
    )
  })

  it('edits an existing enemy', async () => {
    const user = userEvent.setup()
    apiPatchMock.mockResolvedValue({ enemy_template: orc })
    renderRoute()

    await user.click(await screen.findByRole('button', { name: 'Edit Orc Chieftain' }))
    expect(screen.getByText('Edit Orc Chieftain')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Orc Chieftain')
    expect(screen.getByLabelText('Edges')).toHaveValue('sweep')

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Orc Warlord')
    await user.click(screen.getByRole('button', { name: 'Save enemy' }))

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalled())
    expect(apiPatchMock).toHaveBeenCalledWith(
      '/api/v1/enemy_templates/7',
      expect.objectContaining({
        enemy_template: expect.objectContaining({ name: 'Orc Warlord', abilities: ['hardy'] }),
      }),
    )
  })

  it('deletes an enemy after confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiDeleteMock.mockResolvedValue(undefined)
    renderRoute()

    await user.click(await screen.findByRole('button', { name: 'Delete Orc Chieftain' }))

    expect(confirm).toHaveBeenCalledWith('Delete Orc Chieftain from the bestiary?')
    await waitFor(() => expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/enemy_templates/7'))
    confirm.mockRestore()
  })
})
