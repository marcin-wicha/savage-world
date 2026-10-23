import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { skillDieTypes, type SkillDieType } from './dice-types'
import { SkillDie } from './skill-die'

const meta = {
  title: 'Design System/Skill Die',
  component: SkillDie,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    die: {
      control: 'select',
      options: [null, ...skillDieTypes],
    },
    defaultDie: {
      control: 'select',
      options: [null, ...skillDieTypes],
    },
    modifier: {
      control: { type: 'number', min: 0, step: 1 },
    },
  },
} satisfies Meta<typeof SkillDie>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = {
  args: {
    defaultDie: 'd8',
  },
}

export const WithModifier: Story = {
  args: {
    defaultDie: 'd12',
    defaultModifier: 1,
  },
}

export const ReadOnly: Story = {
  args: {
    defaultDie: 'd10',
    defaultModifier: 2,
    readOnly: true,
  },
}

export const Disabled: Story = {
  args: {
    defaultDie: 'd6',
    disabled: true,
  },
}

function ControlledSkillDie() {
  const [die, setDie] = useState<SkillDieType | null>('d6')
  const [modifier, setModifier] = useState(0)

  return (
    <div className="flex flex-col items-center gap-3">
      <SkillDie die={die} onDieChange={setDie} modifier={modifier} onModifierChange={setModifier} />
      <p className="text-muted-foreground text-sm">
        {die ?? 'No die selected'}
        {modifier > 0 ? `+${modifier}` : ''}
      </p>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledSkillDie />,
}
