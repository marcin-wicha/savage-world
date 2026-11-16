import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/lib/i18n-context'

import { partyFormSchema, type PartyFormValues } from './party-form'

type PartyFormProps = {
  idPrefix: string
  defaultValues?: PartyFormValues
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (values: PartyFormValues) => void
}

export function PartyForm({
  idPrefix,
  defaultValues = { name: '', description: '' },
  submitLabel,
  pending,
  error,
  onSubmit,
}: PartyFormProps) {
  const { t } = useLanguage()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartyFormValues>({ resolver: zodResolver(partyFormSchema), defaultValues })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>{t('Party name')}</Label>
        <Input
          id={`${idPrefix}-name`}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
          {...register('name')}
        />
        {errors.name ? (
          <p id={`${idPrefix}-name-error`} className="text-danger text-sm">
            {t(errors.name.message ?? '')}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>{t('Description')}</Label>
        <Textarea
          id={`${idPrefix}-description`}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? `${idPrefix}-description-error` : undefined}
          {...register('description')}
        />
        {errors.description ? (
          <p id={`${idPrefix}-description-error`} className="text-danger text-sm">
            {t(errors.description.message ?? '')}
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {t(error)}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  )
}
