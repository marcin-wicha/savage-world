import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { TraitCard, type TraitCardProps } from './trait-card'

const meta = {
  title: 'Design System/Trait Card',
  component: TraitCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Berserk',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description:
      'When this character is wounded, she may fly into a rage and strike with reckless fury.',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof TraitCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-end gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <TraitCard key={size} {...args} size={size} title={`Berserk (${size})`} />
      ))}
    </div>
  ),
}

export const Selected: Story = {
  args: {
    selected: true,
  },
}

function TraitCollection() {
  const traits: TraitCardProps[] = [
    {
      title: 'Berserk',
      eyebrow: 'Edge',
      backgroundImage: '/traits/bolster.png',
      description: 'Fly into a rage and strike with reckless fury when wounded.',
    },
    {
      title: 'Hard to Kill',
      eyebrow: 'Edge',
      backgroundImage: '/traits/bolster.png',
      description: 'Ignore the effects of a wound on a successful Vigor roll.',
    },
    {
      title: 'Bloodthirsty',
      eyebrow: 'Hindrance',
      backgroundImage: '/traits/bolster.png',
      description: 'The character never takes prisoners and fights without mercy.',
    },
  ]
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (title: string) =>
    setSelected((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    )

  return (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
      {traits.map((trait) => (
        <TraitCard
          key={trait.title}
          {...trait}
          selected={selected.includes(trait.title)}
          onClick={() => toggle(trait.title)}
        />
      ))}
    </div>
  )
}

export const Collection: Story = {
  render: () => <TraitCollection />,
  decorators: [],
}
