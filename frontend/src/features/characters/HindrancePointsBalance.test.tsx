import { render, screen, within } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'

import { characterFormDefaults, type CharacterFormValues } from './character-form'
import { HindrancePointsBalance } from './HindrancePointsBalance'

function renderBalance(overrides: Partial<CharacterFormValues> = {}) {
  function Harness() {
    const form = useForm<CharacterFormValues>({
      defaultValues: { ...characterFormDefaults, ...overrides },
    })

    return (
      <FormProvider {...form}>
        <HindrancePointsBalance />
      </FormProvider>
    )
  }

  return render(<Harness />)
}

describe('HindrancePointsBalance', () => {
  it('shows earned points as an available balance', () => {
    renderBalance({ hindrance_points_earned: 4 })

    expect(screen.getByText('Hindrance points')).toBeInTheDocument()
    expect(screen.getByText('4 / 4')).toBeInTheDocument()
  })

  it('subtracts points consumed by later steps', () => {
    renderBalance({ hindrance_points_earned: 4, hindrance_points_spent: 1 })

    expect(screen.getByText('3 / 4')).toBeInTheDocument()
  })

  it('explains which steps the points can be spent on and how much each step used', () => {
    renderBalance({
      hindrance_points_earned: 4,
      hindrance_points_spent: 3,
      attribute_hindrance_points_spent: 1,
      skill_hindrance_points_spent: 2,
    })

    const uses = screen.getByRole('list', { name: 'Ways to spend hindrance points' })
    const items = within(uses).getAllByRole('listitem')

    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(
      'Attributes · 1 point raises an attribute one die typespent: 1',
    )
    expect(items[1]).toHaveTextContent('Skills · 1 point buys an extra skill pointspent: 2')
    expect(items[2]).toHaveTextContent('Edges · 2 points buy one edgespent: 0')
  })
})
