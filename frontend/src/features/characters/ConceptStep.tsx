import { Controller, useFormContext } from 'react-hook-form'

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/lib/i18n-context'

import type { CharacterFormValues } from './character-form'

export function ConceptStep() {
  const { t } = useLanguage()
  const form = useFormContext<CharacterFormValues>()

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{t('Character concept')}</h2>
        <p className="text-muted-foreground text-sm leading-6">
          {t(
            'Decide who your character is. Give them a name and a one-line idea: what they do, what they are like, or what drives them. This step has no rules effects, but it will help you make choices in the steps that follow.',
          )}
        </p>
      </div>
      <FieldGroup className="max-w-xl">
        <Controller
          name="concept.name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="concept-name">{t('Character name')}</FieldLabel>
              <Input
                {...field}
                id="concept-name"
                placeholder={t('e.g. Katarina Voss')}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>{t('What should we call this legend?')}</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          name="concept.description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="concept-description">{t('Concept')}</FieldLabel>
              <Textarea
                {...field}
                id="concept-description"
                rows={5}
                placeholder={t('A wandering monster hunter chasing a debt across the frontier.')}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                {t('Sketch the idea that will guide the rest of creation.')}
              </FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      </FieldGroup>
    </div>
  )
}
