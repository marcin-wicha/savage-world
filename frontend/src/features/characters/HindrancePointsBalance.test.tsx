import { render, screen } from '@testing-library/react'
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
})
