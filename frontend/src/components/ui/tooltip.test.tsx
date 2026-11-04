import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

it('opens a tooltip by tap and dismisses it with Escape on a touch viewport', async () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true })
  const user = userEvent.setup()

  render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button">Toughness</button>
        </TooltipTrigger>
        <TooltipContent>Half Vigor plus two</TooltipContent>
      </Tooltip>
      <button type="button">Outside</button>
    </TooltipProvider>,
  )

  await user.click(screen.getByRole('button', { name: 'Toughness' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent('Half Vigor plus two')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Toughness' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Outside' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
