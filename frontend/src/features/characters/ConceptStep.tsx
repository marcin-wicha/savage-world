import { Controller, useFormContext } from 'react-hook-form'

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { CharacterFormValues } from './character-form'

export function ConceptStep() {
  const form = useFormContext<CharacterFormValues>()

  return (
    <FieldGroup className="max-w-xl">
      <Controller
        name="concept.name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="concept-name">Character name</FieldLabel>
            <Input
              {...field}
              id="concept-name"
              placeholder="e.g. Katarina Voss"
              autoComplete="off"
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>What should we call this legend?</FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <Controller
        name="concept.description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="concept-description">Concept</FieldLabel>
            <Textarea
              {...field}
              id="concept-description"
              rows={5}
              placeholder="A wandering monster hunter chasing a debt across the frontier."
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              Sketch the idea that will guide the rest of creation.
            </FieldDescription>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
