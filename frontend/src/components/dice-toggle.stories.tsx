import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { DiceToggle } from './dice-toggle'
import { diceTypes } from './dice-types'

const meta = {
  title: 'Design System/Dice Toggle',
  component: DiceToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    dice: 'd6',
  },
  argTypes: {
    dice: {
      control: 'select',
      options: diceTypes,
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
    },
  },
} satisfies Meta<typeof DiceToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = {
  args: {
    defaultPressed: true,
  },
}

export const Sizes: Story = {
  args: {
    size: 'icon-lg',
  },

  render: () => (
    <div className="flex items-center gap-2">
      {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
        <DiceToggle key={size} dice="d8" size={size} />
      ))}
    </div>
  ),
}

export const AllDice: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {diceTypes.map((dice) => (
        <DiceToggle key={dice} dice={dice} />
      ))}
    </div>
  ),
}

function ControlledDiceToggle() {
  const [pressed, setPressed] = useState(false)

  return (
    <div className="flex flex-col items-center gap-3">
      <DiceToggle dice="d12" pressed={pressed} onPressedChange={setPressed} />
      <p className="text-muted-foreground text-sm">{pressed ? 'Active' : 'Inactive'}</p>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledDiceToggle />,
}
