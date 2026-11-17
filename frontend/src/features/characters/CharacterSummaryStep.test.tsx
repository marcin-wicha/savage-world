import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'

import { TooltipProvider } from '@/components/ui/tooltip'
import { graphqlRequest } from '@/lib/api-client'

import { CharacterSummaryStep } from './CharacterSummaryStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return { ...actual, graphqlRequest: vi.fn() }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)
const emptyPage = { hasNextPage: false, endCursor: null }

function SummaryHarness({ values }: { values: CharacterFormValues }) {
  const form = useForm<CharacterFormValues>({ defaultValues: values })

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <CharacterSummaryStep />
      </FormProvider>
    </TooltipProvider>
  )
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function renderSummaryWithDescriptions() {
  renderWithQueryClient(
    <SummaryHarness
      values={{
        ...characterFormDefaults,
        concept: { name: 'Katarina Voss', description: '' },
        hindrances: ['2'],
        hindrance_names: { '2': 'Bloodthirsty' },
        hindrance_descriptions: { '2': 'A dangerous hunger for violence.' },
        skills: ['3'],
        skill_names: { '3': 'Fighting' },
        skill_dice: { '3': 'd8' },
        skill_descriptions: { '3': 'The ability to fight in close combat.' },
        edges: ['4'],
        edge_names: { '4': 'Alertness' },
        edge_descriptions: { '4': 'Notice danger before it catches you unaware.' },
        edge_effects: { '4': [] },
      }}
    />,
  )
}

describe('CharacterSummaryStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      hindrances: {
        nodes: [
          {
            id: '2',
            name: 'Bloodthirsty',
            slug: 'bloodthirsty',
            severity: 'major',
            requirements_text: '',
            description: 'A dangerous hunger for violence.',
          },
        ],
        pageInfo: emptyPage,
      },
      skills: {
        nodes: [
          {
            id: '3',
            name: 'Fighting',
            slug: 'fighting',
            attribute: 'agility',
            core: false,
            description: 'The ability to fight in close combat.',
          },
        ],
        pageInfo: emptyPage,
      },
      edges: {
        nodes: [
          {
            id: '4',
            name: 'Alertness',
            slug: 'alertness',
            requirements: [],
            requirements_text: '',
            effects: [{ kind: 'trait_modifier', target: 'skill', trait: 'fighting', modifier: 2 }],
            description: 'Notice danger before it catches you unaware.',
          },
        ],
        pageInfo: emptyPage,
      },
    })
  })

  it('resolves selections that only have IDs from the reference catalogs', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(
      <SummaryHarness
        values={{
          ...characterFormDefaults,
          hindrances: ['2'],
          skills: ['3'],
          skill_dice: { '3': 'd6' },
          edges: ['4'],
        }}
      />,
    )

    expect(await screen.findByRole('button', { name: 'Bloodthirsty (major)' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Fighting die: d6+2' })).toBeInTheDocument()
    expect(screen.getByText('Alertness: Fighting +2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\d+/ })).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: 'Alertness' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Notice danger before it catches you unaware.',
    )
    expect(screen.queryByText('No description available.')).not.toBeInTheDocument()
  })

  it('does not fetch reference catalogs when selections already carry their details', () => {
    renderSummaryWithDescriptions()

    expect(graphqlRequestMock).not.toHaveBeenCalled()
  })

  it('shows the selected character details', () => {
    renderWithQueryClient(
      <SummaryHarness
        values={{
          ...characterFormDefaults,
          concept: { name: 'Katarina Voss', description: 'A relentless monster hunter.' },
          origin: '1',
          origin_name: 'Dunestriders',
          attributes: { ...characterFormDefaults.attributes, vigor: 'd8' },
          hindrances: ['2'],
          hindrance_names: { '2': 'Bloodthirsty' },
          hindrance_slugs: { '2': 'bloodthirsty' },
          hindrance_descriptions: { '2': 'A dangerous hunger for violence.' },
          hindrance_severities: { '2': 'major' },
          skills: ['3'],
          skill_names: { '3': 'Fighting' },
          skill_slugs: { '3': 'fighting' },
          skill_descriptions: { '3': 'The ability to fight in close combat.' },
          skill_dice: { '3': 'd8' },
          edges: ['4'],
          edge_names: { '4': 'Alertness' },
          edge_slugs: { '4': 'alertness' },
          edge_descriptions: { '4': 'Notice danger before it catches you unaware.' },
          gear: { '5': 2 },
          gear_names: { '5': 'Torch' },
          hindrance_points_earned: 2,
          hindrance_points_spent: 2,
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: /review your character/i })).toBeInTheDocument()
    expect(screen.getByText('Katarina Voss')).toBeInTheDocument()
    expect(screen.getByText('Dunestriders')).toBeInTheDocument()
    expect(screen.getByText('Bloodthirsty (major)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fighting die: d8' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="skill-die-readonly"]')).toBeInTheDocument()
    expect(screen.getByText('Alertness')).toBeInTheDocument()
    expect(screen.getByText('Torch × 2')).toBeInTheDocument()
    expect(screen.getByText('All hindrance points have been spent.')).toBeInTheDocument()
  })

  it('shows edge-adjusted trait dice and modifiers in the sheet summary', () => {
    renderWithQueryClient(
      <SummaryHarness
        values={{
          ...characterFormDefaults,
          skills: ['7'],
          skill_names: { '7': 'Notice' },
          skill_slugs: { '7': 'notice' },
          skill_dice: { '7': 'd6' },
          edges: ['8'],
          edge_names: { '8': 'Alertness' },
          edge_effects: {
            '8': [
              { kind: 'trait_modifier', target: 'skill', trait: 'notice', modifier: 2 },
              { kind: 'trait_modifier', target: 'damage', trait: 'all', modifier: 1 },
            ],
          },
        }}
      />,
    )

    expect(screen.getByRole('img', { name: 'Notice die: d6+2' })).toBeInTheDocument()
    expect(screen.getByText('Alertness: Notice +2')).toBeInTheDocument()
    expect(screen.getByText('Alertness: Damage +1')).toBeInTheDocument()
  })

  it.each([
    ['Bloodthirsty (minor)', 'A dangerous hunger for violence.'],
    ['Fighting', 'The ability to fight in close combat.'],
    ['Alertness', 'Notice danger before it catches you unaware.'],
  ])('shows %s description in a tooltip on hover', async (triggerName, description) => {
    const user = userEvent.setup()

    renderSummaryWithDescriptions()

    await user.hover(screen.getByRole('button', { name: triggerName }))
    expect(await screen.findByText(description)).toBeInTheDocument()
  })

  it('warns when hindrance points remain', () => {
    renderWithQueryClient(
      <SummaryHarness
        values={{
          ...characterFormDefaults,
          concept: { name: 'Katarina Voss', description: '' },
          hindrance_points_earned: 2,
          hindrance_points_spent: 0,
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Spend all 2 remaining hindrance points before saving.',
    )
  })
})
