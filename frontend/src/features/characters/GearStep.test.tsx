import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'
import { LanguageProvider } from '@/lib/i18n'

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
    artwork_url: 'https://cdn.example.com/unrelated/lantern.jpg',
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
      <LanguageProvider>
        <Harness formRef={formRef} />
      </LanguageProvider>
    </QueryClientProvider>,
  )

  return formRef
}

describe('GearStep', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

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

  it('keeps the pack accessible and pages a large catalog', async () => {
    const user = userEvent.setup()
    graphqlRequestMock.mockResolvedValue({
      gear: {
        nodes: Array.from({ length: 25 }, (_, index) => ({
          ...gear[0],
          id: String(index + 1),
          name: `Item ${index + 1}`,
        })),
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })

    renderStep()
    expect(await screen.findByText('25 items')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="gear-shop-item"]')).toHaveLength(12)
    expect(screen.getByRole('button', { name: 'Show more (12 of 25)' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="gear-pack"]')).toHaveClass('order-1')

    await user.click(screen.getByRole('button', { name: 'Show more (12 of 25)' }))
    expect(document.querySelectorAll('[data-slot="gear-shop-item"]')).toHaveLength(24)
    await user.click(screen.getByRole('button', { name: 'Show more (24 of 25)' }))
    expect(document.querySelectorAll('[data-slot="gear-shop-item"]')).toHaveLength(25)
  })

  it('uses server artwork without a slug fallback for null URLs', async () => {
    renderStep()

    await screen.findByText('2 items')

    const artwork = document.querySelectorAll('[data-slot="gear-artwork"]')

    expect(artwork).toHaveLength(2)
    expect(artwork[0]).toHaveAttribute('src', 'https://cdn.example.com/unrelated/lantern.jpg')
    expect(artwork[1]).toHaveAttribute('src', 'https://cdn.example.com/unrelated/lantern.jpg')
    expect(document.querySelector('img[src="/gear/sword-long.webp"]')).toBeNull()
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

  it('translates categories, rule tags, and badges into Polish', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('savage-worlds-language', 'pl')
    graphqlRequestMock.mockResolvedValue({
      gear: {
        nodes: [
          gear[0],
          {
            ...gear[1],
            requirements: [{ kind: 'strength', value: 'd8' }],
            effects: { damage: 'Str+d8', minimum_strength: 'd6', ap: 1, two_hands: true },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })

    renderStep()

    expect(await screen.findByText('2 przedmioty')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sprzęt ogólny' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Broń do walki wręcz' })).toBeInTheDocument()
    expect(screen.getAllByText('Promień światła:')).toHaveLength(2)
    expect(screen.getAllByText('4 cale')).toHaveLength(2)
    expect(screen.getAllByText('1 godzina')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Pokaż szczegóły: Long Sword' }))

    const details = document.querySelector('[data-slot="gear-details"]')
    expect(details).toHaveTextContent('Broń do walki wręcz')
    expect(details).toHaveTextContent('Siła: d8')
    expect(details).toHaveTextContent('Obrażenia:')
    expect(details).toHaveTextContent('Minimalna Siła:')
    expect(details).toHaveTextContent('PP: 1')
    expect(details).toHaveTextContent('Oburęczna: Tak')
    expect(screen.getByText('+1 więcej')).toBeInTheDocument()
    expect(screen.queryByText('Melee weapons')).not.toBeInTheDocument()
  })
})
