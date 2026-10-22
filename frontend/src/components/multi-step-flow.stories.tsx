import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { MultiStepFlow, type MultiStepFlowStep } from './multi-step-flow'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

const steps: MultiStepFlowStep[] = [
  {
    id: 'concept',
    title: 'Concept',
    content: (
      <div className="grid max-w-sm gap-2">
        <Label htmlFor="character-name">Character name</Label>
        <Input id="character-name" placeholder="e.g. Katarina Voss" />
        <p className="text-muted-foreground text-xs">Start with a name and a place in the world.</p>
      </div>
    ),
  },
  {
    id: 'attributes',
    title: 'Attributes',
    content: (
      <div className="grid max-w-sm gap-2">
        <p className="text-sm font-medium">Agility d6</p>
        <p className="text-muted-foreground text-sm">
          Assign dice to Agility, Smarts, Spirit, Strength, and Vigor.
        </p>
      </div>
    ),
  },
  {
    id: 'edges',
    title: 'Edges',
    content: (
      <div className="grid max-w-sm gap-2">
        <p className="text-sm font-medium">Choose an edge</p>
        <p className="text-muted-foreground text-sm">
          Edges grant talents, allies, and special abilities.
        </p>
      </div>
    ),
  },
]

const meta = {
  title: 'Design System/Multi Step Flow',
  component: MultiStepFlow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    steps,
    onStepChange: fn(),
    onComplete: fn(),
  },
} satisfies Meta<typeof MultiStepFlow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create a character</CardTitle>
        <CardDescription>Work through each step, then save the finished character.</CardDescription>
      </CardHeader>
      <CardContent>
        <MultiStepFlow {...args} />
      </CardContent>
    </Card>
  ),
}

export const ValidationBlocked: Story = {
  args: {
    canAdvance: () => false,
  },
  render: (args) => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Incomplete step</CardTitle>
        <CardDescription>
          The primary action stays disabled until the step is valid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MultiStepFlow {...args} />
      </CardContent>
    </Card>
  ),
}

export const LastStep: Story = {
  args: {
    defaultStep: 2,
    completeLabel: 'Save character',
  },
  render: (args) => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Review and save</CardTitle>
        <CardDescription>Completed steps are marked and can be revisited.</CardDescription>
      </CardHeader>
      <CardContent>
        <MultiStepFlow {...args} />
      </CardContent>
    </Card>
  ),
}
