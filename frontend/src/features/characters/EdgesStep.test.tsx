import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'

import { EdgesStep } from './EdgesStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'
import type { EdgeRequirementClause } from './edge-requirements'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn(),
  }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)

const requirement = (values: Partial<EdgeRequirementClause>): EdgeRequirementClause =>
  ({
    attribute: null,
    clauses: null,
    die: null,
    kind: 'special',
    skill: null,
    slug: null,
    ...values,
  }) as EdgeRequirementClause

const makeEdge = (
  id: string,
  values: {
    name: string
    slug: string
    category?: string
    minimum_rank?: string
    requirements?: EdgeRequirementClause[]
    requirements_text?: string
    repeatable?: boolean
  },
) => ({
  id,
  name: values.name,
  slug: values.slug,
  category: values.category ?? 'background',
  minimum_rank: values.minimum_rank ?? 'novice',
  requirements: values.requirements ?? [],
  requirements_text: values.requirements_text ?? '',
  repeatable: values.repeatable ?? false,
})

const edges = [
  makeEdge('1', { name: 'Alertness', slug: 'alertness' }),
  makeEdge('2', {
    name: 'Ace',
    slug: 'ace',
    category: 'professional',
    requirements: [requirement({ kind: 'attribute', attribute: 'agility', die: 8 })],
    requirements_text: 'Novice, Agility d8',
  }),
  makeEdge('3', {
    name: 'Artificer',
    slug: 'artificer',
    category: 'power',
    minimum_rank: 'seasoned',
    requirements: [requirement({ kind: 'arcane_background' })],
    requirements_text: 'Seasoned, Arcane Background',
  }),
  makeEdge('4', {
    name: 'Fervor',
    slug: 'fervor',
    category: 'combat',
    minimum_rank: 'veteran',
    requirements: [requirement({ kind: 'skill', skill: 'fighting', die: 10 })],
    requirements_text: 'Veteran, Fighting d10',
  }),
  makeEdge('5', {
    name: 'Weapon Master',
    slug: 'weapon-master',
    category: 'combat',
    minimum_rank: 'heroic',
    requirements: [requirement({ kind: 'edge', slug: 'fervor' })],
    requirements_text: 'Heroic, Fervor',
  }),
]

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

function Harness({ formRef }: { formRef: FormRef }) {
  const form = useForm<CharacterFormValues>({ defaultValues: characterFormDefaults })

  useEffect(() => {
    formRef.current = form
  }, [form, formRef])

  return (
    <FormProvider {...form}>
      <EdgesStep />
    </FormProvider>
  )
}

function renderStep() {
  const formRef: FormRef = { current: null }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <Harness formRef={formRef} />
    </QueryClientProvider>,
  )

  return formRef
}

async function revealEdges() {
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: /reveal edges traits/i }))

  return user
}

describe('EdgesStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      edges: {
        nodes: edges,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it('shows every edge and records the selection against hindrance points', async () => {
    const formRef = renderStep()
    const user = userEvent.setup()

    await screen.findByText('5 edges')

    await waitFor(() => {
      expect(formRef.current?.getValues('hindrance_points_earned')).toBe(0)
    })
    await user.click(screen.getByRole('button', { name: /reveal edges traits/i }))

    expect(screen.getByRole('button', { name: 'Alertness' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ace' })).toBeInTheDocument()
    expect(screen.getByText('Novice · Professional')).toBeInTheDocument()
    expect(screen.getByText('Novice, Agility d8')).toBeInTheDocument()
    expect(document.querySelector('img[src="/traits/edges/alertness.png"]')).toBeInTheDocument()

    await waitFor(() => {
      formRef.current?.setValue('hindrance_points_earned', 4)
    })
    expect(await screen.findByText('4 / 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ace' }))
    await waitFor(() => {
      expect(formRef.current?.getValues('edges')).toEqual(['2'])
      expect(formRef.current?.getValues('edge_hindrance_points_spent')).toBe(1)
      expect(formRef.current?.getValues('hindrance_points_spent')).toBe(1)
    })
    expect(screen.getByRole('button', { name: 'Ace' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('3 / 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ace' }))
    await waitFor(() => {
      expect(formRef.current?.getValues('edges')).toEqual([])
      expect(formRef.current?.getValues('edge_hindrance_points_spent')).toBe(0)
      expect(formRef.current?.getValues('hindrance_points_spent')).toBe(0)
    })
    expect(screen.getByText('4 / 4')).toBeInTheDocument()
  })

  it('filters edges by minimum rank', async () => {
    renderStep()
    const user = await revealEdges()

    await user.click(screen.getByRole('button', { name: 'Rank filter' }))
    await user.click(screen.getByRole('checkbox', { name: 'Veteran' }))

    expect(screen.getByText('1 edge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fervor' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ace' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Heroic' }))

    expect(screen.getByText('2 edges')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weapon Master' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Rank filter' }))

    expect(screen.getByText('5 edges')).toBeInTheDocument()
  })

  it('filters edges with unmet requirements until the character state satisfies them', async () => {
    const formRef = renderStep()
    const user = await revealEdges()

    await user.click(screen.getByRole('button', { name: 'Requirements met' }))

    expect(screen.getByText('1 edge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alertness' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ace' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Requirements met' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await waitFor(() => {
      formRef.current?.setValue('attributes', {
        agility: 'd8',
        smarts: 'd4',
        spirit: 'd4',
        strength: 'd4',
        vigor: 'd4',
      })
    })

    expect(screen.getByText('2 edges')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ace' })).toBeInTheDocument()

    await waitFor(() => {
      formRef.current?.setValue('edge_hindrance_points_spent', 0)
    })

    await user.click(screen.getByRole('button', { name: 'Requirements met' }))

    expect(screen.getByText('5 edges')).toBeInTheDocument()
  })

  it('filters edges by search and fills from autocomplete suggestions', async () => {
    const user = userEvent.setup()

    renderStep()

    const search = await screen.findByRole('combobox', { name: 'Search edges' })

    await user.type(search, 'art')
    await user.click(await screen.findByRole('option', { name: 'Artificer' }))

    expect(await screen.findByText('1 edge')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reveal edges traits/i }))

    expect(screen.getByRole('button', { name: 'Artificer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alertness' })).not.toBeInTheDocument()
  })

  it('disables edges without an available hindrance point', async () => {
    const formRef = renderStep()
    const user = await revealEdges()

    await waitFor(() => {
      formRef.current?.setValue('attribute_hindrance_points_spent', 2)
      formRef.current?.setValue('skill_hindrance_points_spent', 2)
      formRef.current?.setValue('hindrance_points_earned', 4)
    })

    await waitFor(() => {
      expect(formRef.current?.getValues('hindrance_points_spent')).toBe(4)
    })
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alertness' })).toBeDisabled()
    expect(screen.queryByText('Loading edges…')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Alertness' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('edges')).toEqual([])
    })
  })

  it('combines every page without exceeding the query complexity limit', async () => {
    graphqlRequestMock
      .mockResolvedValueOnce({
        edges: {
          nodes: edges.slice(0, 2),
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      })
      .mockResolvedValueOnce({
        edges: {
          nodes: edges.slice(2),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })

    renderStep()

    expect(await screen.findByText('5 edges')).toBeInTheDocument()
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { first: 15, after: null },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { first: 15, after: 'cursor-1' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows an error when edges cannot be loaded', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('Network error'))

    renderStep()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load edges.')
  })
})
