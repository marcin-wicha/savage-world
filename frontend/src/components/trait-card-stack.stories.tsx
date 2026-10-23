import type { Meta, StoryObj } from '@storybook/react-vite'

import { TraitCardStack, type TraitCardStackTrait } from './trait-card-stack'

const combatTraits: TraitCardStackTrait[] = [
  {
    title: 'Berserk',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description:
      'When this character is wounded, she may fly into a rage and strike with reckless fury.',
  },
  {
    title: 'Hard to Kill',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description: 'Ignore the effects of a wound on a successful Vigor roll.',
  },
  {
    title: 'Quick',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description: 'Draw two cards for initiative and keep the better result.',
  },
]

const socialTraits: TraitCardStackTrait[] = [
  {
    title: 'Charismatic',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description: 'Gain a bonus when influencing others with charm or persuasion.',
  },
  {
    title: 'Command',
    eyebrow: 'Edge',
    backgroundImage: '/traits/bolster.png',
    description: 'Allies under the character’s leadership gain a bonus to recover from Shaken.',
  },
  {
    title: 'Obligation',
    eyebrow: 'Hindrance',
    backgroundImage: '/traits/bolster.png',
    description: 'The character owes a debt or duty that regularly demands attention.',
  },
]

const meta = {
  title: 'Design System/Trait Card Stack',
  component: TraitCardStack,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    category: 'Combat',
    traits: combatTraits,
  },
  argTypes: {
    revealedCount: {
      control: { type: 'number', min: 1, max: 3, step: 1 },
      description: 'How many revealed cards are shown at once.',
    },
  },
} satisfies Meta<typeof TraitCardStack>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Revealed: Story = {
  args: {
    defaultOpen: true,
  },
}

export const Paged: Story = {
  args: {
    revealedCount: 2,
  },
}

export const Social: Story = {
  args: {
    category: 'Social',
    traits: socialTraits,
    defaultOpen: true,
  },
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-16">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <TraitCardStack key={size} {...args} size={size} defaultOpen />
      ))}
    </div>
  ),
}
