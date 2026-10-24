import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TooltipProvider } from '@/components/ui/tooltip'

import { DerivedStatistics } from './DerivedStatistics'

function renderStatistics() {
  return render(
    <TooltipProvider>
      <DerivedStatistics />
    </TooltipProvider>,
  )
}

describe('DerivedStatistics', () => {
  it('renders Pace, Parry, and Toughness with armor in parentheses', () => {
    renderStatistics()

    expect(screen.getByRole('region', { name: /derived statistics/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pace: 6/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parry: 2/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toughness: 4\(0\)/i })).toBeInTheDocument()
  })

  it('explains the mechanic and contribution breakdown on hover', async () => {
    const user = userEvent.setup()
    renderStatistics()

    await user.hover(screen.getByRole('button', { name: /toughness: 4\(0\)/i }))

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).not.toHaveTextContent('Derived from')
    expect(tooltip).toHaveTextContent(
      'Toughness is the target number an attack must meet to cause a wound.',
    )
    expect(tooltip).toHaveTextContent('Base Toughness')
    expect(tooltip).toHaveTextContent('Half Vigor (d4)')
    expect(tooltip).toHaveTextContent('Armor is included in the total and shown in parentheses.')
  })
})
