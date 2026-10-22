import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    placeholder: 'Search characters',
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Input {...args} className="w-72" />,
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="character-name">Character name</Label>
      <Input {...args} id="character-name" placeholder="e.g. Katarina Voss" />
    </div>
  ),
}

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    defaultValue: 'Unknown',
  },
  render: (args) => <Input {...args} className="w-72" />,
}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'Disabled',
  },
  render: (args) => <Input {...args} className="w-72" />,
}
