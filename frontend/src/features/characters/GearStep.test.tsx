import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'

import { GearStep } from './GearStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn(),
  }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

const gear = [
  {
    id: '1',
    name: 'Torch',
    slug: 'torch',
    category: 'general' as const,
    cost: 0.25,
    cost_text: '0.25',
    requirements: [],
    effects: { light_radius: '4 inches', duration: '1 hour' },
    description: 'Provides light in a 4-inch radius for one hour.',
    artwork_url: null,
    source_book: 'Fantasy Companion',
    source_page: 49,
  },
  {
    id: '2',
    name: 'Long Sword',
    slug: 'sword-long',
    category: 'melee_weapon' as const,
    cost: 15,
    cost_text: '15',
    requirements: [],
    effects: { damage: 'Str+d8', minimum_strength: 'd6' },
    description: 'A reliable sword for close combat.',
    artwork_url: null,
    source_book: 'Fantasy Companion',
    source_page: 57,
  },
]

function Harness({ formRef }: { formRef: FormRef }) {
  const form = useForm<CharacterFormValues>({ defaultValues: characterFormDefaults })

  useEffect(() => {
    formRef.current = form
  }, [form, formRef])

  return (
    <FormProvider {...form}>
      <GearStep />
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

describe('GearStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      gear: {
        nodes: gear,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it('shows the money tracker, categories, descriptions, and rules', async () => {
    renderStep()

    expect(await screen.findByText('2 items')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('$300')
    expect(screen.getByRole('tab', { name: 'Melee weapons' })).toBeInTheDocument()
    expect(screen.getAllByText('Provides light in a 4-inch radius for one hour.')).toHaveLength(2)
    expect(screen.getAllByText('Light Radius:', { exact: false })).toHaveLength(2)
  })

  it('uses local slug artwork when the API does not provide artwork', async () => {
    renderStep()

    await screen.findByText('2 items')

    const artwork = document.querySelectorAll('[data-slot="gear-artwork"]')

    expect(artwork).toHaveLength(3)
    expect(artwork[0]).toHaveAttribute('src', '/gear/torch.webp')
    expect(artwork[1]).toHaveAttribute('src', '/gear/sword-long.webp')
  })

  it('filters by category and search', async () => {
    const user = userEvent.setup()
    renderStep()

    await screen.findByText('2 items')
    await user.click(screen.getByRole('tab', { name: 'Melee weapons' }))

    expect(screen.getByText('1 item')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View details for Long Sword' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View details for Torch' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'All gear' }))
    const search = screen.getByRole('combobox', { name: 'Search gear' })
    await user.type(search, 'torch')
    await user.click(screen.getByRole('option', { name: 'Torch' }))

    expect(screen.getByText('1 item')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View details for Torch' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'View details for Long Sword' }),
    ).not.toBeInTheDocument()
  })

  it('adds, increments, and removes gear while tracking remaining money', async () => {
    const user = userEvent.setup()
    const formRef = renderStep()

    await screen.findByText('2 items')
    await user.click(screen.getByRole('button', { name: 'Add Torch to pack' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('gear')).toEqual({ '1': 1 })
    })
    expect(screen.getByRole('status')).toHaveTextContent('$299.75')
    expect(screen.getByText('1 in pack')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add one Torch' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('gear')).toEqual({ '1': 2 })
    })
    expect(screen.getByRole('status')).toHaveTextContent('$299.50')

    await user.click(screen.getByRole('button', { name: 'Remove Torch' }))
    await waitFor(() => {
      expect(formRef.current?.getValues('gear')).toEqual({})
    })
    expect(screen.getByRole('status')).toHaveTextContent('$300')
  })
})
