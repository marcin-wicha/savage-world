import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from './field'
import { Input } from './input'
import { Textarea } from './textarea'

const meta = {
  title: 'Design System/Field',
  component: Field,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <FieldGroup className="w-80">
      <Field>
        <FieldLabel htmlFor="field-name">Character name</FieldLabel>
        <Input id="field-name" placeholder="e.g. Katarina Voss" />
        <FieldDescription>What should we call this legend?</FieldDescription>
      </Field>
    </FieldGroup>
  ),
}

export const WithError: Story = {
  render: () => (
    <FieldGroup className="w-80">
      <Field data-invalid>
        <FieldLabel htmlFor="field-error">Character name</FieldLabel>
        <Input id="field-error" aria-invalid defaultValue="" placeholder="e.g. Katarina Voss" />
        <FieldError errors={[{ message: 'Give your character a name.' }]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="field-ok">Concept</FieldLabel>
        <Textarea id="field-ok" placeholder="A wandering monster hunter." />
      </Field>
    </FieldGroup>
  ),
}
