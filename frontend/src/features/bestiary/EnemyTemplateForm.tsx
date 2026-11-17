import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm, type FieldError } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/lib/i18n-context'

import { emptyWeapon, enemyFormSchema, type EnemyFormValues } from './enemy-form'
import { abilityKeys, abilityLabels, attributeKeys, attributeLabels } from './enemy-types'

type EnemyTemplateFormProps = {
  idPrefix: string
  defaultValues: EnemyFormValues
  submitLabel: string
  pending: boolean
  errors: string[]
  onSubmit: (values: EnemyFormValues) => void
  onCancel?: () => void
}

const statFields = [
  { name: 'pace', label: 'Pace' },
  { name: 'parry', label: 'Parry' },
  { name: 'toughness', label: 'Toughness (with armor)' },
  { name: 'armor', label: 'Armor' },
  { name: 'size', label: 'Size' },
] as const

function FieldMessage({ id, error }: { id: string; error?: FieldError }) {
  const { t } = useLanguage()
  if (!error?.message) return null

  return (
    <p id={id} className="text-danger text-xs">
      {t(error.message)}
    </p>
  )
}

export function EnemyTemplateForm({
  idPrefix,
  defaultValues,
  submitLabel,
  pending,
  errors: serverErrors,
  onSubmit,
  onCancel,
}: EnemyTemplateFormProps) {
  const { t } = useLanguage()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnemyFormValues>({ resolver: zodResolver(enemyFormSchema), defaultValues })
  const skills = useFieldArray({ control, name: 'skills' })
  const weapons = useFieldArray({ control, name: 'weapons' })
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={id('name')}>{t('Name')}</Label>
        <Input
          id={id('name')}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? id('name-error') : undefined}
          {...register('name')}
        />
        <FieldMessage id={id('name-error')} error={errors.name} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('description')}>{t('Description')}</Label>
        <Textarea id={id('description')} rows={2} {...register('description')} />
        <FieldMessage id={id('description-error')} error={errors.description} />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="wild_card"
          render={({ field }) => (
            <Checkbox
              id={id('wild-card')}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label htmlFor={id('wild-card')}>{t('Wild Card')}</Label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">{t('Attributes')}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {attributeKeys.map((key) => (
            <div key={key} className="grid gap-1">
              <Label htmlFor={id(`attribute-${key}`)}>{t(attributeLabels[key])}</Label>
              <Input
                id={id(`attribute-${key}`)}
                aria-invalid={errors.attribute_dice?.[key] ? true : undefined}
                {...register(`attribute_dice.${key}`)}
              />
              <FieldMessage
                id={id(`attribute-${key}-error`)}
                error={errors.attribute_dice?.[key]}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">{t('Statistics')}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statFields.map((stat) => (
            <div key={stat.name} className="grid gap-1">
              <Label htmlFor={id(stat.name)}>{t(stat.label)}</Label>
              <Input
                id={id(stat.name)}
                type="number"
                inputMode="numeric"
                aria-invalid={errors[stat.name] ? true : undefined}
                {...register(stat.name, { valueAsNumber: true })}
              />
              <FieldMessage id={id(`${stat.name}-error`)} error={errors[stat.name]} />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">{t('Skills')}</legend>
        {skills.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-start gap-2"
          >
            <div className="grid gap-1">
              <Label htmlFor={id(`skill-${index}`)} className="sr-only">
                {t('Skill')} {index + 1}
              </Label>
              <Input
                id={id(`skill-${index}`)}
                placeholder="fighting"
                {...register(`skills.${index}.slug`)}
              />
              <FieldMessage id={id(`skill-${index}-error`)} error={errors.skills?.[index]?.slug} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={id(`skill-${index}-die`)} className="sr-only">
                {t('Skill die')} {index + 1}
              </Label>
              <Input id={id(`skill-${index}-die`)} {...register(`skills.${index}.die`)} />
              <FieldMessage
                id={id(`skill-${index}-die-error`)}
                error={errors.skills?.[index]?.die}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${t('Remove skill')} ${index + 1}`}
              onClick={() => skills.remove(index)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => skills.append({ slug: '', die: 'd6' })}
        >
          <Plus aria-hidden="true" />
          {t('Add skill')}
        </Button>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-foreground mb-2 text-sm font-medium">{t('Weapons')}</legend>
        {weapons.fields.map((field, index) => {
          const weaponErrors = errors.weapons?.[index]

          return (
            <div key={field.id} className="border-border grid gap-2 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="col-span-2 grid gap-1 sm:col-span-1">
                  <Label htmlFor={id(`weapon-${index}-name`)}>{t('Weapon name')}</Label>
                  <Input id={id(`weapon-${index}-name`)} {...register(`weapons.${index}.name`)} />
                  <FieldMessage id={id(`weapon-${index}-name-error`)} error={weaponErrors?.name} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={id(`weapon-${index}-damage`)}>{t('Damage')}</Label>
                  <Input
                    id={id(`weapon-${index}-damage`)}
                    placeholder="Str+d6"
                    {...register(`weapons.${index}.damage`)}
                  />
                  <FieldMessage
                    id={id(`weapon-${index}-damage-error`)}
                    error={weaponErrors?.damage}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={id(`weapon-${index}-range`)}>{t('Range')}</Label>
                  <Input
                    id={id(`weapon-${index}-range`)}
                    placeholder="12/24/48"
                    {...register(`weapons.${index}.range`)}
                  />
                  <FieldMessage
                    id={id(`weapon-${index}-range-error`)}
                    error={weaponErrors?.range}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] items-end gap-2">
                {(['ap', 'rof', 'reach'] as const).map((key) => (
                  <div key={key} className="grid gap-1">
                    <Label htmlFor={id(`weapon-${index}-${key}`)}>
                      {t(key === 'ap' ? 'AP' : key === 'rof' ? 'RoF' : 'Reach')}
                    </Label>
                    <Input
                      id={id(`weapon-${index}-${key}`)}
                      type="number"
                      inputMode="numeric"
                      {...register(`weapons.${index}.${key}`, { valueAsNumber: true })}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('Remove weapon')} ${index + 1}`}
                  onClick={() => weapons.remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={weapons.fields.length >= 6}
          onClick={() => weapons.append({ ...emptyWeapon })}
        >
          <Plus aria-hidden="true" />
          {t('Add weapon')}
        </Button>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor={id('edges')}>{t('Edges')}</Label>
        <Input id={id('edges')} placeholder="frenzy, first-strike" {...register('edges')} />
        <p className="text-muted-foreground text-xs">
          {t('Comma-separated edge slugs, such as frenzy or level-headed.')}
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-foreground mb-2 text-sm font-medium">
          {t('Special abilities')}
        </legend>
        <Controller
          control={control}
          name="abilities"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {abilityKeys.map((ability) => (
                <div key={ability} className="flex items-center gap-2">
                  <Checkbox
                    id={id(`ability-${ability}`)}
                    checked={field.value.includes(ability)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked === true
                          ? [...field.value, ability]
                          : field.value.filter((value) => value !== ability),
                      )
                    }
                  />
                  <Label htmlFor={id(`ability-${ability}`)}>{t(abilityLabels[ability])}</Label>
                </div>
              ))}
            </div>
          )}
        />
      </fieldset>

      {serverErrors.length > 0 ? (
        <div role="alert" className="text-danger grid gap-1 text-sm">
          {serverErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('Cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
