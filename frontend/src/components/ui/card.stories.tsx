import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from './button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Character concept</CardTitle>
        <CardDescription>Start with a name and a place in the world.</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Your origin, attributes, and hindrances will shape the first draft of the character.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Continue</Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  args: {
    size: 'sm',
  },
  render: (args) => (
    <Card {...args} className="w-72">
      <CardHeader>
        <CardTitle>Novice</CardTitle>
        <CardDescription>0 advances</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Every legend starts somewhere.</p>
      </CardContent>
    </Card>
  ),
}
