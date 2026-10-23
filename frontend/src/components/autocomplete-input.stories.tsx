import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { AutocompleteInput, type AutocompleteInputOption } from './autocomplete-input'

const options: AutocompleteInputOption[] = [
  { value: 'bad-eyes', label: 'Bad Eyes' },
  { value: 'bad-luck', label: 'Bad Luck' },
  { value: 'bloodthirsty', label: 'Bloodthirsty' },
  { value: 'clumsy', label: 'Clumsy' },
  { value: 'hard-of-hearing', label: 'Hard of Hearing' },
]

const meta = {
  title: 'Design System/Autocomplete Input',
  component: AutocompleteInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    'aria-label': 'Search hindrances',
    options,
    value: '',
    onValueChange: () => undefined,
    placeholder: 'Search hindrances',
  },
} satisfies Meta<typeof AutocompleteInput>

export default meta
type Story = StoryObj<typeof meta>

function AutocompletePreview({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="grid w-72 gap-2">
      <AutocompleteInput
        aria-label="Search hindrances"
        options={options}
        value={value}
        onValueChange={setValue}
        placeholder="Search hindrances"
      />
      <p className="text-muted-foreground text-sm">Selected search: {value || 'none'}</p>
    </div>
  )
}

export const Default: Story = {
  render: () => <AutocompletePreview />,
}

export const WithValue: Story = {
  render: () => <AutocompletePreview initialValue="Bad" />,
}
