import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiErrorMessages } from '@/lib/api-errors'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'

import { EnemyTemplateForm } from './EnemyTemplateForm'
import {
  enemyFormDefaults,
  formValuesFromTemplate,
  templatePayload,
  type EnemyFormValues,
} from './enemy-form'
import {
  abilityLabels,
  attributeKeys,
  attributeLabels,
  enemyTemplatesQueryKey,
  skillLabel,
  toughnessLabel,
  type AbilityKey,
  type EnemyTemplate,
  type EnemyTemplateResponse,
  type EnemyTemplatesResponse,
} from './enemy-types'

type SaveVariables = { id?: number; enemy_template: ReturnType<typeof templatePayload> }

function saveErrors(error: unknown) {
  const messages = apiErrorMessages(error)
  return messages.length > 0 ? messages : ['Could not save the enemy. Try again.']
}

export function BestiaryRoute() {
  const { t, language } = useLanguage()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [createKey, setCreateKey] = useState(0)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { data, isPending, isError } = useRestQuery<EnemyTemplatesResponse>(
    enemyTemplatesQueryKey,
    '/api/v1/enemy_templates',
  )
  const templates = data?.enemy_templates ?? []
  const editing = templates.find((template) => template.id === editingId)

  const refresh = () => void queryClient.invalidateQueries({ queryKey: enemyTemplatesQueryKey })
  const createMutation = useRestMutation<EnemyTemplateResponse, SaveVariables>(
    { path: '/api/v1/enemy_templates', method: 'POST' },
    {
      onSuccess: () => {
        refresh()
        setFormErrors([])
        setCreateKey((key) => key + 1)
      },
      onError: (error) => setFormErrors(saveErrors(error)),
    },
  )
  const updateMutation = useRestMutation<EnemyTemplateResponse, SaveVariables>(
    { path: ({ id }) => `/api/v1/enemy_templates/${id}`, method: 'PATCH' },
    {
      onSuccess: () => {
        refresh()
        setFormErrors([])
        setEditingId(null)
      },
      onError: (error) => setFormErrors(saveErrors(error)),
    },
  )
  const deleteMutation = useRestMutation<void, { id: number }>(
    { path: ({ id }) => `/api/v1/enemy_templates/${id}`, method: 'DELETE' },
    {
      onSuccess: () => {
        setDeleteError(null)
        refresh()
      },
      onError: () => setDeleteError('Could not delete the enemy. Try again.'),
    },
  )

  const save = (values: EnemyFormValues) => {
    setFormErrors([])
    const payload = { enemy_template: templatePayload(values) }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const remove = (template: EnemyTemplate) => {
    const message =
      language === 'pl'
        ? `Usunąć ${template.name} z bestiariusza?`
        : `Delete ${template.name} from the bestiary?`
    if (window.confirm(message)) deleteMutation.mutate({ id: template.id })
  }

  return (
    <section>
      <h1 className="text-foreground text-4xl">{t('Bestiary')}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t('Write stat blocks for the foes your parties will face in simulated battles.')}
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid gap-4">
          {isPending ? (
            <p className="text-muted-foreground text-sm">{t('Loading the bestiary…')}</p>
          ) : null}
          {isError ? (
            <p className="text-danger text-sm" role="alert">
              {t('Could not load the bestiary. Try again.')}
            </p>
          ) : null}
          {deleteError ? (
            <p className="text-danger text-sm" role="alert">
              {t(deleteError)}
            </p>
          ) : null}
          {!isPending && !isError && templates.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('No enemies yet.')}</p>
          ) : null}
          {templates.length > 0 ? (
            <ul className="grid gap-4">
              {templates.map((template) => (
                <li key={template.id}>
                  <StatBlock
                    template={template}
                    onEdit={() => {
                      setFormErrors([])
                      setEditingId(template.id)
                    }}
                    onDelete={() => remove(template)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? `${t('Edit')} ${editing.name}` : t('New enemy')}</CardTitle>
            <CardDescription>
              {t('Toughness includes armor, as in a printed stat block.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnemyTemplateForm
              key={editing ? `edit-${editing.id}` : `new-${createKey}`}
              idPrefix={editing ? `enemy-${editing.id}` : 'new-enemy'}
              defaultValues={editing ? formValuesFromTemplate(editing) : enemyFormDefaults}
              submitLabel={t(editing ? 'Save enemy' : 'Add enemy')}
              pending={createMutation.isPending || updateMutation.isPending}
              errors={formErrors.map(t)}
              onSubmit={save}
              onCancel={editing ? () => setEditingId(null) : undefined}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function StatBlock({
  template,
  onEdit,
  onDelete,
}: {
  template: EnemyTemplate
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const skills = Object.entries(template.skills)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-2xl">{template.name}</CardTitle>
          <Badge variant={template.wild_card ? 'default' : 'outline'}>
            {t(template.wild_card ? 'Wild Card' : 'Extra')}
          </Badge>
        </div>
        {template.description ? <CardDescription>{template.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>
          <span className="font-medium">{t('Attributes')}:</span>{' '}
          {attributeKeys
            .map((key) => `${t(attributeLabels[key])} ${template.attribute_dice[key]}`)
            .join(' · ')}
        </p>
        {skills.length > 0 ? (
          <p>
            <span className="font-medium">{t('Skills')}:</span>{' '}
            {skills.map(([slug, die]) => `${t(skillLabel(slug))} ${die}`).join(' · ')}
          </p>
        ) : null}
        <p>
          <span className="font-medium">{t('Pace')}</span> {template.pace} ·{' '}
          <span className="font-medium">{t('Parry')}</span> {template.parry} ·{' '}
          <span className="font-medium">{t('Toughness')}</span>{' '}
          {toughnessLabel(template.toughness, template.armor)}
          {template.size ? ` · ${t('Size')} ${template.size}` : ''}
        </p>
        {template.weapons.length > 0 ? (
          <p>
            <span className="font-medium">{t('Weapons')}:</span>{' '}
            {template.weapons
              .map((weapon) =>
                [
                  weapon.name,
                  weapon.damage,
                  weapon.ap ? `AP ${weapon.ap}` : null,
                  weapon.range ? `${t('Range')} ${weapon.range}` : null,
                ]
                  .filter(Boolean)
                  .join(' '),
              )
              .join(' · ')}
          </p>
        ) : null}
        {template.edge_slugs.length > 0 || template.abilities.length > 0 ? (
          <p>
            <span className="font-medium">{t('Special abilities')}:</span>{' '}
            {[
              ...template.edge_slugs.map(skillLabel),
              ...template.abilities.map(
                (ability) => abilityLabels[ability as AbilityKey] ?? ability,
              ),
            ]
              .map(t)
              .join(' · ')}
          </p>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onEdit}
            aria-label={`${t('Edit')} ${template.name}`}
          >
            {t('Edit')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onDelete}
            aria-label={`${t('Delete')} ${template.name}`}
          >
            {t('Delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
