import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'

import { OriginStep } from './OriginStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn(),
  }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)

const origins = [
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
]

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

function Harness({ formRef }: { formRef: FormRef }) {
  const form = useForm<CharacterFormValues>({ defaultValues: characterFormDefaults })

  useEffect(() => {
    formRef.current = form
  }, [form, formRef])

  return (
    <FormProvider {...form}>
      <OriginStep />
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

describe('OriginStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      origins: {
        nodes: origins,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it('renders origins as separate cards in a grid', async () => {
    renderStep()

    expect(await screen.findByRole('button', { name: 'Dunestriders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Greenbloods' })).toBeInTheDocument()
    expect(screen.getByText('Keepers of the Old Faith.')).toBeInTheDocument()
    expect(document.querySelector('img[src="/origins/dunestriders.webp"]')).toBeInTheDocument()
    expect(
      document.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reveal origins traits/i })).not.toBeInTheDocument()
  })

  it('selects one origin and replaces it when another is chosen', async () => {
    const formRef = renderStep()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Dunestriders' }))
    await waitFor(() => expect(formRef.current?.getValues('origin')).toBe('1'))
    expect(screen.getByRole('button', { name: 'Dunestriders' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Greenbloods' }))
    await waitFor(() => expect(formRef.current?.getValues('origin')).toBe('2'))
    expect(screen.getByRole('button', { name: 'Dunestriders' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Greenbloods' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows loading and error states', async () => {
    graphqlRequestMock.mockImplementation(() => new Promise(() => undefined))
    renderStep()
    expect(screen.getByText('Loading origins…')).toBeInTheDocument()

    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockRejectedValue(new Error('Network error'))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <Harness formRef={{ current: null }} />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load origins.')
  })
})
