import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'

import { HindrancesStep } from './HindrancesStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn(),
  }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)

const hindrances = [
  {
    id: '1',
    name: 'Bad Eyes',
    slug: 'bad-eyes',
    severity: 'minor',
    requirements_text: '',
    description: 'Vision becomes a serious liability.',
  },
  {
    id: '2',
    name: 'Bloodthirsty',
    slug: 'bloodthirsty',
    severity: 'major',
    requirements_text: '',
  },
  { id: '3', name: 'Clumsy', slug: 'clumsy', severity: 'minor', requirements_text: '' },
  {
    id: '4',
    name: 'Hard of Hearing',
    slug: 'hard-of-hearing',
    severity: 'minor_or_major',
    requirements_text: '',
  },
  {
    id: '5',
    name: 'Yellow',
    slug: 'yellow',
    severity: 'major',
    requirements_text: 'Spirit d4',
  },
]

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

function Harness({ formRef }: { formRef: FormRef }) {
  const form = useForm<CharacterFormValues>({ defaultValues: characterFormDefaults })

  useEffect(() => {
    formRef.current = form
  }, [form, formRef])

  return (
    <FormProvider {...form}>
      <HindrancesStep />
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

async function revealHindrances() {
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: /reveal hindrances traits/i }))

  return user
}

describe('HindrancesStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      hindrances: {
        nodes: hindrances,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it('shows every hindrance when no severity is selected and filters by severity', async () => {
    renderStep()
    const user = await revealHindrances()

    expect(screen.getByText('5 hindrances')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bad Eyes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloodthirsty' })).toBeInTheDocument()
    expect(document.querySelector('img[src="/traits/hindrances/bad-eyes.png"]')).toBeInTheDocument()
    expect(screen.getByText('Vision becomes a serious liability.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Severity filter' }))
    await user.click(screen.getByRole('checkbox', { name: 'Minor' }))

    expect(screen.getByText('3 hindrances')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bad Eyes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hard of Hearing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bloodthirsty' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Major' }))

    expect(screen.getByText('5 hindrances')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloodthirsty' })).toBeInTheDocument()
  })

  it('selects and deselects a hindrance in the form', async () => {
    const formRef = renderStep()
    const user = await revealHindrances()

    await user.click(screen.getByRole('button', { name: 'Bad Eyes' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('hindrances')).toEqual(['1'])
    })
    expect(screen.getByRole('button', { name: 'Bad Eyes' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Bad Eyes' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('hindrances')).toEqual([])
    })
    expect(screen.getByRole('button', { name: 'Bad Eyes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('filters hindrances by search and fills from autocomplete suggestions', async () => {
    const user = userEvent.setup()

    renderStep()

    const search = await screen.findByRole('combobox', { name: 'Search hindrances' })

    await user.type(search, 'blo')
    await user.click(await screen.findByRole('option', { name: 'Bloodthirsty' }))

    expect(await screen.findByText('1 hindrance')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reveal hindrances traits/i }))

    expect(screen.getByRole('button', { name: 'Bloodthirsty' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bad Eyes' })).not.toBeInTheDocument()
  })

  it('shows an empty state when the filter excludes every hindrance', async () => {
    graphqlRequestMock.mockResolvedValue({
      hindrances: {
        nodes: [hindrances[0]],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })

    const user = userEvent.setup()

    renderStep()

    await user.click(await screen.findByRole('button', { name: 'Severity filter' }))
    await user.click(screen.getByRole('checkbox', { name: 'Major' }))

    expect(screen.getByText('0 hindrances')).toBeInTheDocument()
    expect(screen.getByText('No hindrances match the selected filters.')).toBeInTheDocument()
  })

  it('loads and combines every page without exceeding the query complexity limit', async () => {
    graphqlRequestMock
      .mockResolvedValueOnce({
        hindrances: {
          nodes: hindrances.slice(0, 2),
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      })
      .mockResolvedValueOnce({
        hindrances: {
          nodes: hindrances.slice(2),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })

    renderStep()

    expect(await screen.findByText('5 hindrances')).toBeInTheDocument()
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { first: 40, after: null },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(graphqlRequestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { first: 40, after: 'cursor-1' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows an error when hindrances cannot be loaded', async () => {
    graphqlRequestMock.mockRejectedValue(new Error('Network error'))

    renderStep()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load hindrances.')
  })
})
