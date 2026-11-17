import { useEffect, useRef, useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { CharacterAvatar } from '@/components/character-avatar'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/lib/i18n-context'

import { AVATAR_TYPES, type CharacterFormValues } from './character-form'

function useImagePreview(file: File | null) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (!file) return

    let active = true
    const reader = new FileReader()
    reader.onload = () => {
      if (active && typeof reader.result === 'string') setPreview({ file, url: reader.result })
    }
    reader.readAsDataURL(file)

    return () => {
      active = false
      reader.abort()
    }
  }, [file])

  return file && preview?.file === file ? preview.url : null
}

export function ConceptStep() {
  const { t } = useLanguage()
  const form = useFormContext<CharacterFormValues>()
  const fileInput = useRef<HTMLInputElement>(null)
  const name = useWatch({ control: form.control, name: 'concept.name' })
  const avatarFile = useWatch({ control: form.control, name: 'avatar_file' })
  const avatarUrl = useWatch({ control: form.control, name: 'avatar_url' })
  const previewUrl = useImagePreview(avatarFile)
  const avatarSrc = previewUrl ?? (avatarUrl || null)

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
          name="avatar_file"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="concept-avatar">{t('Avatar')}</FieldLabel>
              <div className="flex items-center gap-4">
                <CharacterAvatar
                  name={name || '?'}
                  src={avatarSrc}
                  size="lg"
                  alt={t('Avatar preview')}
                />
                <div className="grid min-w-0 flex-1 gap-2">
                  <input
                    ref={fileInput}
                    id="concept-avatar"
                    type="file"
                    accept={AVATAR_TYPES.join(',')}
                    aria-invalid={fieldState.invalid}
                    className="text-muted-foreground file:border-border file:bg-background file:text-foreground focus-visible:ring-ring/50 w-full text-sm file:mr-3 file:rounded-lg file:border file:px-3 file:py-1 file:text-sm file:font-medium focus-visible:ring-3 focus-visible:outline-none"
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      field.onChange(event.target.files?.[0] ?? null)
                      void form.trigger('avatar_file')
                    }}
                  />
                  {avatarSrc ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="justify-self-start"
                      onClick={() => {
                        field.onChange(null)
                        form.setValue('avatar_url', '')
                        if (fileInput.current) fileInput.current.value = ''
                        void form.trigger('avatar_file')
                      }}
                    >
                      {t('Remove avatar')}
                    </Button>
                  ) : null}
                </div>
              </div>
              <FieldDescription>
                {t('Optional portrait. PNG, JPEG, GIF, or WebP; maximum 5 MB.')}
              </FieldDescription>
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
