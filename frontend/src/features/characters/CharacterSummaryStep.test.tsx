import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'

import { TooltipProvider } from '@/components/ui/tooltip'

import { CharacterSummaryStep } from './CharacterSummaryStep'
import { characterFormDefaults, type CharacterFormValues } from './character-form'

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

function renderSummaryWithDescriptions() {
  render(
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
      }}
    />,
  )
}

describe('CharacterSummaryStep', () => {
  it('shows the selected character details', () => {
    render(
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
    render(
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
