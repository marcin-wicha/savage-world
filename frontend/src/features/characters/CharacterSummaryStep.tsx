import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { SkillDie } from '@/components/skill-die'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/lib/i18n-context'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { applyEdgeEffects, describeEdgeEffect, parseEdgeEffects } from './edge-effects'
import type { CharacterFormValues } from './character-form'

const attributeLabels: Record<keyof CharacterFormValues['attributes'], string> = {
  agility: 'Agility',
  smarts: 'Smarts',
  spirit: 'Spirit',
  strength: 'Strength',
  vigor: 'Vigor',
}

const humanize = (value: string) =>
  value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())

function SummarySection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function SummaryList({
  items,
  emptyLabel = 'None selected.',
}: {
  items: string[]
  emptyLabel?: string
}) {
  const { t } = useLanguage()

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t(emptyLabel)}</p>
  }

  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="text-foreground text-sm">
          {item}
        </li>
      ))}
    </ul>
  )
}

type SummaryItem = {
  id: string
  name: string
  description: string
}

function SummaryItemTooltip({ item }: { item: SummaryItem }) {
  const { t } = useLanguage()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-foreground hover:text-primary focus-visible:ring-ring/50 rounded-sm text-left text-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-3"
        >
          {t(item.name)}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="leading-5">
        {t(item.description)}
      </TooltipContent>
    </Tooltip>
  )
}

function SummaryItemList({ items }: { items: SummaryItem[] }) {
  const { t } = useLanguage()

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('None selected.')}</p>
  }

  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <SummaryItemTooltip item={item} />
        </li>
      ))}
    </ul>
  )
}

function SkillSummaryList({
  skills,
}: {
  skills: (SummaryItem & { die: CharacterFormValues['skill_dice'][string]; modifier: number })[]
}) {
  const { t } = useLanguage()

  if (skills.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('None selected.')}</p>
  }

  return (
    <ul className="grid gap-3">
      {skills.map((skill) => (
        <li key={skill.id} className="flex items-center justify-between gap-3">
          <SummaryItemTooltip item={skill} />
          <SkillDie
            readOnly
            die={skill.die}
            modifier={skill.modifier}
            label={`${t(skill.name)} ${t('die')}`}
          />
        </li>
      ))}
    </ul>
  )
}

export function CharacterSummaryStep() {
  const { t } = useLanguage()
  const { control } = useFormContext<CharacterFormValues>()
  const values = useWatch({ control })
  const earnedPoints = values.hindrance_points_earned ?? 0
  const spentPoints = values.hindrance_points_spent ?? 0
  const remainingPoints = earnedPoints - spentPoints
  const hindrancePointsBalanced = remainingPoints === 0
  const concept = values.concept ?? { name: '', description: '' }
  const attributes = values.attributes ?? {
    agility: 'd4',
    smarts: 'd4',
    spirit: 'd4',
    strength: 'd4',
    vigor: 'd4',
  }
  const selectedHindrances = values.hindrances ?? []
  const hindranceNames = values.hindrance_names ?? {}
  const hindranceSlugs = values.hindrance_slugs ?? {}
  const hindranceDescriptions = values.hindrance_descriptions ?? {}
  const hindranceSeverities = values.hindrance_severities ?? {}
  const selectedSkills = values.skills ?? []
  const skillNames = values.skill_names ?? {}
  const skillSlugs = values.skill_slugs ?? {}
  const skillDescriptions = values.skill_descriptions ?? {}
  const skillDices = values.skill_dice ?? {}
  const selectedEdges = values.edges ?? []
  const edgeNames = values.edge_names ?? {}
  const edgeEffects = values.edge_effects ?? {}
  const selectedEffects = selectedEdges.flatMap((id) => parseEdgeEffects(edgeEffects[id]))
  const edgeSlugs = values.edge_slugs ?? {}
  const edgeDescriptions = values.edge_descriptions ?? {}
  const gearNames = values.gear_names ?? {}
  const gearQuantities = values.gear ?? {}

  const hindrances = selectedHindrances.map((id) => ({
    id,
    name: `${t(hindranceNames[id] ?? humanize(hindranceSlugs[id] ?? id))} (${t(hindranceSeverities[id] ?? 'minor')})`,
    description: t(hindranceDescriptions[id] ?? 'No description available.'),
  }))
  const skills = selectedSkills.map((id) => ({
    id,
    name: t(skillNames[id] ?? humanize(skillSlugs[id] ?? id)),
    description: t(skillDescriptions[id] ?? 'No description available.'),
    ...applyEdgeEffects(skillDices[id] ?? 'd4', selectedEffects, 'skill', skillSlugs[id] ?? ''),
  }))
  const edges = selectedEdges.map((id) => ({
    id,
    name: t(edgeNames[id] ?? humanize(edgeSlugs[id] ?? id)),
    description: t(edgeDescriptions[id] ?? 'No description available.'),
  }))
  const gear = Object.entries(gearQuantities).map(
    ([id, quantity]) => `${t(gearNames[id] ?? humanize(id))} × ${quantity}`,
  )

  return (
    <div className="grid gap-6">
      <div className="grid max-w-2xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{t('Review your character')}</h2>
        <p className="text-muted-foreground text-sm leading-6">
          {t('Check every choice before saving this character to your roster.')}
        </p>
      </div>

      <HindrancePointsBalance />

      {!hindrancePointsBalanced ? (
        <p className="text-danger text-sm" role="alert">
          {remainingPoints > 0
            ? `${t('Spend all')} ${remainingPoints} ${t('remaining hindrance points before saving.')}`
            : t(
                'Hindrance points are overspent. Return to an earlier step and adjust your choices.',
              )}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          {t('All hindrance points have been spent.')}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummarySection title={t('Concept')}>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('Name')}</dt>
              <dd className="text-foreground font-medium">{concept.name || t('Unnamed')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Description')}</dt>
              <dd className="text-foreground whitespace-pre-wrap">
                {concept.description || t('No concept description.')}
              </dd>
            </div>
          </dl>
        </SummarySection>

        <SummarySection title={t('Origin')}>
          <p className="text-foreground text-sm font-medium">
            {values.origin_name
              ? t(values.origin_name)
              : values.origin
                ? `${t('Origin')} ${values.origin}`
                : t('No origin selected.')}
          </p>
        </SummarySection>

        <SummarySection title={t('Attributes')}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(attributeLabels) as (keyof CharacterFormValues['attributes'])[]).map(
              (attribute) => (
                <div key={attribute}>
                  <dt className="text-muted-foreground text-sm">{t(attributeLabels[attribute])}</dt>
                  <dd className="text-foreground font-medium">
                    {(() => {
                      const effective = applyEdgeEffects(
                        attributes[attribute] ?? 'd4',
                        selectedEffects,
                        'attribute',
                        attribute,
                      )
                      return `${effective.die}${effective.modifier > 0 ? `+${effective.modifier}` : ''}`
                    })()}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </SummarySection>

        <SummarySection
          title={t('Hindrances')}
          description={`${hindrances.length} ${t('selected')}`}
        >
          <SummaryItemList items={hindrances} />
        </SummarySection>

        <SummarySection title={t('Skills')} description={`${skills.length} ${t('selected')}`}>
          <SkillSummaryList skills={skills} />
        </SummarySection>

        <SummarySection title={t('Edges')} description={`${edges.length} ${t('selected')}`}>
          <div className="grid gap-2">
            <SummaryItemList items={edges} />
            {selectedEffects.length > 0 ? (
              <ul className="text-muted-foreground border-border grid gap-1 border-t pt-2 text-sm">
                {selectedEdges.flatMap((id) =>
                  parseEdgeEffects(edgeEffects[id]).map((effect, index) => (
                    <li key={`${id}-${index}`}>
                      {t(edgeNames[id] ?? 'Edge')}: {t(describeEdgeEffect(effect))}
                    </li>
                  )),
                )}
              </ul>
            ) : null}
          </div>
        </SummarySection>

        <SummarySection title={t('Gear')} description={`${gear.length} ${t('selected')}`}>
          <SummaryList items={gear} />
        </SummarySection>
      </div>
    </div>
  )
}
