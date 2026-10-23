import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { AutocompleteInput, type AutocompleteInputOption } from './autocomplete-input'

const options: AutocompleteInputOption[] = [
  { value: 'bad-eyes', label: 'Bad Eyes' },
  { value: 'bad-luck', label: 'Bad Luck' },
  { value: 'bloodthirsty', label: 'Bloodthirsty' },
  { value: 'clumsy', label: 'Clumsy' },
]

type HarnessProps = {
  onValueChange?: (value: string) => void
}

function Harness({ onValueChange }: HarnessProps) {
  const [value, setValue] = useState('')

  return (
    <AutocompleteInput
      aria-label="Search hindrances"
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
      placeholder="Search hindrances"
    />
  )
}

describe('AutocompleteInput', () => {
  it('shows matching suggestions and selects one', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<Harness onValueChange={onValueChange} />)

    const input = screen.getByRole('combobox', { name: 'Search hindrances' })

    await user.type(input, 'blo')

    expect(screen.getByRole('option', { name: 'Bloodthirsty' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Bad Eyes' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: 'Bloodthirsty' }))

    expect(input).toHaveValue('Bloodthirsty')
    expect(onValueChange).toHaveBeenLastCalledWith('Bloodthirsty')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('selects suggestions with the keyboard', async () => {
    const user = userEvent.setup()

    render(<Harness />)

    const input = screen.getByRole('combobox', { name: 'Search hindrances' })

    await user.type(input, 'bad')
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('option', { name: 'Bad Eyes' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{ArrowDown}{Enter}')

    expect(input).toHaveValue('Bad Luck')
  })

  it('clears the search value', async () => {
    const user = userEvent.setup()

    render(<Harness />)

    const input = screen.getByRole('combobox', { name: 'Search hindrances' })

    await user.type(input, 'bad')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
