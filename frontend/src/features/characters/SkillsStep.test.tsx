import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'

import { graphqlRequest } from '@/lib/api-client'

import { SkillsStep } from './SkillsStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()

  return {
    ...actual,
    graphqlRequest: vi.fn(),
  }
})

const graphqlRequestMock = vi.mocked(graphqlRequest)

const skills = [
  {
    id: '1',
    name: 'Athletics',
    slug: 'athletics',
    attribute: 'agility',
    core: true,
    source_book: 'SWADE',
    source_page: 29,
  },
  {
    id: '2',
    name: 'Academics',
    slug: 'academics',
    attribute: 'smarts',
    core: false,
    source_book: 'SWADE',
    source_page: 29,
  },
  {
    id: '3',
    name: 'Faith',
    slug: 'faith',
    attribute: 'spirit',
    core: true,
    source_book: 'SWADE',
    source_page: 31,
  },
]

const manySkills = [
  ...skills,
  ...Array.from({ length: 10 }, (_, index) => ({
    ...skills[1],
    id: String(index + 4),
    name: `Skill ${index + 4}`,
    slug: `skill-${index + 4}`,
  })),
]

type FormRef = { current: UseFormReturn<CharacterFormValues> | null }

function Harness({
  formRef,
  overrides,
}: {
  formRef: FormRef
  overrides: Partial<CharacterFormValues>
}) {
  const form = useForm<CharacterFormValues>({
    defaultValues: { ...characterFormDefaults, ...overrides },
  })

  useEffect(() => {
    formRef.current = form
  }, [form, formRef])

  return (
    <FormProvider {...form}>
      <SkillsStep />
    </FormProvider>
  )
}

function renderStep(overrides: Partial<CharacterFormValues> = {}) {
  const formRef: FormRef = { current: null }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <Harness formRef={formRef} overrides={overrides} />
    </QueryClientProvider>,
  )

  return formRef
}

async function revealSkills() {
  const user = userEvent.setup()

  await user.click(await screen.findByRole('button', { name: /reveal skills traits/i }))

  return user
}

describe('SkillsStep', () => {
  beforeEach(() => {
    graphqlRequestMock.mockReset()
    graphqlRequestMock.mockResolvedValue({
      skills: {
        nodes: skills,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
  })

  it('renders skill cards with their linked attribute badges', async () => {
    renderStep()
    const user = await revealSkills()

    expect(screen.getByText('3 skills')).toBeInTheDocument()
    expect(screen.getByText('12 / 12')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="trait-card-stack-row"]')).toHaveStyle({
      gridTemplateColumns: 'repeat(3, 224px)',
      gridTemplateRows: 'repeat(2, 314px)',
    })
    expect(screen.getByText('0 / 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Athletics' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Academics' })).toBeInTheDocument()
    expect(document.querySelector('img[src="/traits/skills/athletics.png"]')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Athletics' }).closest('[data-slot="trait-card"]'),
    ).not.toHaveClass('opacity-50')
    expect(screen.getByText('Agility')).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Athletics die' })).getByRole('button', {
        name: 'Toggle d4',
      }),
    ).toBeDisabled()
    expect(
      within(screen.getByRole('group', { name: 'Athletics die' })).getByRole('button', {
        name: 'Toggle d6',
      }),
    ).toBeEnabled()
    expect(
      within(screen.getByRole('group', { name: 'Athletics die' })).getByRole('button', {
        name: 'Toggle d6',
      }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(screen.getByRole('group', { name: 'Academics die' })).getByRole('button', {
        name: 'Toggle d4',
      }),
    ).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Athletics' }))

    expect(screen.getByText('11 / 12')).toBeInTheDocument()
  })

  it('disables unselected cards and their dice when the total pool is spent', async () => {
    graphqlRequestMock.mockResolvedValue({
      skills: {
        nodes: manySkills,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })

    renderStep({ skills: manySkills.slice(0, 12).map((skill) => skill.id) })
    const user = await revealSkills()

    await user.click(screen.getByRole('button', { name: 'Next trait' }))
    await user.click(screen.getByRole('button', { name: 'Next trait' }))

    expect(screen.getByRole('button', { name: 'Skill 13' })).toBeDisabled()
    expect(
      within(screen.getByRole('group', { name: 'Skill 13 die' })).getByRole('button', {
        name: 'Toggle d4',
      }),
    ).toBeDisabled()
    expect(
      within(screen.getByRole('group', { name: 'Skill 13 die' })).getByRole('button', {
        name: 'Toggle d6',
      }),
    ).toBeDisabled()
  })

  it('searches skills and stores selected skills in the form', async () => {
    const formRef = renderStep()
    const user = userEvent.setup()
    const search = await screen.findByRole('combobox', { name: 'Search skills' })

    await user.type(search, 'aca')
    await user.click(await screen.findByRole('option', { name: 'Academics' }))
    await user.click(screen.getByRole('button', { name: /reveal skills traits/i }))
    await user.click(screen.getByRole('button', { name: 'Academics' }))

    await waitFor(() => {
      expect(formRef.current?.getValues('skills')).toEqual(['2'])
      expect(formRef.current?.getValues('skill_dice')).toEqual({ '2': 'd4' })
      expect(formRef.current?.getValues('skill_hindrance_points_spent')).toBe(0)
    })
    expect(screen.getByRole('button', { name: 'Academics' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
