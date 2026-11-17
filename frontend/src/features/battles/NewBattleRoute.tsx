import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Swords, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  enemyTemplatesQueryKey,
  toughnessLabel,
  type EnemyTemplatesResponse,
} from '@/features/bestiary/enemy-types'
import { partyQueryKey, rankLabels, type PartyResponse } from '@/features/parties/party-types'
import { apiErrorMessages } from '@/lib/api-errors'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'

import { battlesQueryKey, type BattleResponse, type BattleSettings } from './battle-types'

const selectClassName =
  'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3'

const illuminationOptions = [
  { value: 'bright', label: 'Bright light' },
  { value: 'dim', label: 'Dim light (−2)' },
  { value: 'dark', label: 'Darkness (−4)' },
  { value: 'pitch_dark', label: 'Pitch darkness (−6)' },
] as const

const coverOptions = [
  { value: 'none', label: 'No cover' },
  { value: 'light', label: 'Light cover (−2)' },
  { value: 'medium', label: 'Medium cover (−4)' },
  { value: 'heavy', label: 'Heavy cover (−6)' },
] as const

const battleFormSchema = z.object({
  enemies: z
    .array(
      z.object({
        enemy_template_id: z.string().min(1, 'Choose an enemy.'),
        count: z
          .number({ message: 'Enter a number.' })
          .int()
          .min(1, 'Use 1 to 20.')
          .max(20, 'Use 1 to 20.'),
      }),
    )
    .min(1, 'Add at least one enemy.'),
  runs: z
    .number({ message: 'Enter a number.' })
    .int()
    .min(1, 'Use 1 to 200.')
    .max(200, 'Use 1 to 200.'),
  seed: z.string().trim().regex(/^\d*$/, 'Use a whole number or leave it empty.'),
  starting_distance: z
    .number({ message: 'Enter a number.' })
    .int()
    .min(1, 'Use 1 to 60.')
    .max(60, 'Use 1 to 60.'),
  max_rounds: z
    .number({ message: 'Enter a number.' })
    .int()
    .min(1, 'Use 1 to 30.')
    .max(30, 'Use 1 to 30.'),
  illumination: z.enum(['bright', 'dim', 'dark', 'pitch_dark']),
  cover: z.enum(['none', 'light', 'medium', 'heavy']),
  morale: z.boolean(),
})

type BattleFormValues = z.infer<typeof battleFormSchema>

type CreateBattleVariables = {
  battle: {
    enemies: { enemy_template_id: number; count: number }[]
    runs: number
    seed?: number
    settings: BattleSettings
  }
}

export function NewBattleRoute() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const partyQuery = useRestQuery<PartyResponse>(partyQueryKey(id), `/api/v1/parties/${id}`)
  const templatesQuery = useRestQuery<EnemyTemplatesResponse>(
    enemyTemplatesQueryKey,
    '/api/v1/enemy_templates',
  )
  const templates = templatesQuery.data?.enemy_templates ?? []
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BattleFormValues>({
    resolver: zodResolver(battleFormSchema),
    defaultValues: {
      enemies: [{ enemy_template_id: '', count: 1 }],
      runs: 50,
      seed: '',
      starting_distance: 12,
      max_rounds: 20,
      illumination: 'bright',
      cover: 'none',
      morale: false,
    },
  })
  const enemies = useFieldArray({ control, name: 'enemies' })
  const createMutation = useRestMutation<BattleResponse, CreateBattleVariables>(
    { path: `/api/v1/parties/${id}/battles`, method: 'POST' },
    {
      onSuccess: (response) => {
        void queryClient.invalidateQueries({ queryKey: battlesQueryKey(id) })
        navigate(`/battles/${response.battle.id}`)
      },
      onError: (error) => {
        const messages = apiErrorMessages(error)
        setServerErrors(messages.length > 0 ? messages : ['Could not run the battle. Try again.'])
      },
    },
  )

  if (partyQuery.isPending || templatesQuery.isPending) {
    return <p className="text-muted-foreground text-sm">{t('Loading battle setup…')}</p>
  }

  if (partyQuery.isError || !partyQuery.data) {
    return (
      <p className="text-danger text-sm" role="alert">
        {t('Could not load the party. It may not exist or you are not a member.')}
      </p>
    )
  }

  const party = partyQuery.data.party
  const members = party.members.filter((member) => member.status === 'accepted')

  const submit = (values: BattleFormValues) => {
    setServerErrors([])
    createMutation.mutate({
      battle: {
        enemies: values.enemies.map((enemy) => ({
          enemy_template_id: Number(enemy.enemy_template_id),
          count: enemy.count,
        })),
        runs: values.runs,
        ...(values.seed ? { seed: Number(values.seed) } : {}),
        settings: {
          starting_distance: values.starting_distance,
          max_rounds: values.max_rounds,
          illumination: values.illumination,
          cover: values.cover,
          morale: values.morale,
        },
      },
    })
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
          {party.name}
        </p>
        <h1 className="text-foreground mt-2 text-4xl">{t('Simulate a battle')}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {t(
            'Pick the enemies and the battlefield. The server plays both sides with the full Savage Worlds combat rules and reports how the fight usually goes.',
          )}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('The party')}</CardTitle>
            <CardDescription>
              {t('Characters fight with their equipped weapons and armor.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-danger text-sm" role="alert">
                {t('This party has no characters yet.')}
              </p>
            ) : (
              <ul className="divide-border divide-y text-sm">
                {members.map((member) => (
                  <li key={member.membership_id} className="py-2">
                    <p className="text-foreground font-medium">{member.character.name}</p>
                    <p className="text-muted-foreground">
                      {t(rankLabels[member.character.rank] ?? member.character.rank)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Enemies and battlefield')}</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('Your bestiary is empty.')}{' '}
                <Link to="/bestiary" className="text-foreground underline">
                  {t('Add enemies to the bestiary')}
                </Link>
              </p>
            ) : (
              <form className="grid gap-5" onSubmit={handleSubmit(submit)} noValidate>
                <fieldset className="grid gap-2">
                  <legend className="text-foreground mb-2 text-sm font-medium">
                    {t('Enemies')}
                  </legend>
                  {enemies.fields.map((field, index) => {
                    const fieldErrors = errors.enemies?.[index]

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-start gap-2"
                      >
                        <div className="grid gap-1">
                          <Label htmlFor={`enemy-${index}`} className="sr-only">
                            {t('Enemy')} {index + 1}
                          </Label>
                          <select
                            id={`enemy-${index}`}
                            className={selectClassName}
                            {...register(`enemies.${index}.enemy_template_id`)}
                          >
                            <option value="">{t('Choose an enemy')}</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {`${template.name}${template.wild_card ? ' ★' : ''} · ${t('Parry')} ${template.parry} · ${t('Toughness')} ${toughnessLabel(template.toughness, template.armor)}`}
                              </option>
                            ))}
                          </select>
                          {fieldErrors?.enemy_template_id?.message ? (
                            <p className="text-danger text-xs">
                              {t(fieldErrors.enemy_template_id.message)}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`enemy-${index}-count`} className="sr-only">
                            {t('Count')} {index + 1}
                          </Label>
                          <Input
                            id={`enemy-${index}-count`}
                            type="number"
                            inputMode="numeric"
                            {...register(`enemies.${index}.count`, { valueAsNumber: true })}
                          />
                          {fieldErrors?.count?.message ? (
                            <p className="text-danger text-xs">{t(fieldErrors.count.message)}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('Remove enemy')} ${index + 1}`}
                          disabled={enemies.fields.length === 1}
                          onClick={() => enemies.remove(index)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => enemies.append({ enemy_template_id: '', count: 1 })}
                  >
                    <Plus aria-hidden="true" />
                    {t('Add enemy group')}
                  </Button>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="starting-distance">{t('Starting distance (inches)')}</Label>
                    <Input
                      id="starting-distance"
                      type="number"
                      inputMode="numeric"
                      {...register('starting_distance', { valueAsNumber: true })}
                    />
                    {errors.starting_distance?.message ? (
                      <p className="text-danger text-xs">{t(errors.starting_distance.message)}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="max-rounds">{t('Round limit')}</Label>
                    <Input
                      id="max-rounds"
                      type="number"
                      inputMode="numeric"
                      {...register('max_rounds', { valueAsNumber: true })}
                    />
                    {errors.max_rounds?.message ? (
                      <p className="text-danger text-xs">{t(errors.max_rounds.message)}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="illumination">{t('Illumination')}</Label>
                    <select
                      id="illumination"
                      className={selectClassName}
                      {...register('illumination')}
                    >
                      {illuminationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="cover">{t('Cover against ranged attacks')}</Label>
                    <select id="cover" className={selectClassName} {...register('cover')}>
                      {coverOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="runs">{t('Simulations')}</Label>
                    <Input
                      id="runs"
                      type="number"
                      inputMode="numeric"
                      {...register('runs', { valueAsNumber: true })}
                    />
                    {errors.runs?.message ? (
                      <p className="text-danger text-xs">{t(errors.runs.message)}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="seed">{t('Seed (optional)')}</Label>
                    <Input id="seed" inputMode="numeric" {...register('seed')} />
                    {errors.seed?.message ? (
                      <p className="text-danger text-xs">{t(errors.seed.message)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="morale"
                    render={({ field }) => (
                      <Checkbox
                        id="morale"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    )}
                  />
                  <Label htmlFor="morale">
                    {t('Morale: Extras may flee when half of them are down')}
                  </Label>
                </div>

                {(errors.enemies?.root?.message ?? errors.enemies?.message) ? (
                  <p className="text-danger text-sm">
                    {t(errors.enemies?.root?.message ?? errors.enemies?.message ?? '')}
                  </p>
                ) : null}

                {serverErrors.length > 0 ? (
                  <div role="alert" className="text-danger grid gap-1 text-sm">
                    {serverErrors.map((message) => (
                      <p key={message}>{t(message)}</p>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={createMutation.isPending || members.length === 0}>
                    <Swords aria-hidden="true" />
                    {createMutation.isPending ? t('Simulating…') : t('Run simulation')}
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/parties/${party.id}`}>{t('Back to party')}</Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
