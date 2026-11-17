import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { SkillDie } from '@/components/skill-die'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/lib/i18n-context'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { applyEdgeEffects, describeEdgeEffect, parseEdgeEffects } from './edge-effects'
import type { CharacterFormValues } from './character-form'
import { useEdgeCatalog, useHindranceCatalog, useSkillCatalog } from './reference-catalogs'

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
  const edgeSlugs = values.edge_slugs ?? {}
  const edgeDescriptions = values.edge_descriptions ?? {}
  const hindranceCatalog = useHindranceCatalog({
    enabled: selectedHindrances.some((id) => !hindranceNames[id] || !hindranceDescriptions[id]),
  })
  const skillCatalog = useSkillCatalog({
    enabled: selectedSkills.some((id) => !skillNames[id] || !skillDescriptions[id]),
  })
  const edgeCatalog = useEdgeCatalog({
    enabled: selectedEdges.some(
      (id) => !edgeNames[id] || !edgeDescriptions[id] || !edgeEffects[id],
    ),
  })
  const hindranceById = new Map(hindranceCatalog.items.map((item) => [item.id, item]))
  const skillById = new Map(skillCatalog.items.map((item) => [item.id, item]))
  const edgeById = new Map(edgeCatalog.items.map((item) => [item.id, item]))
  const edgeEffectsFor = (id: string) =>
    edgeEffects[id]
      ? parseEdgeEffects(edgeEffects[id])
      : parseEdgeEffects(edgeById.get(id)?.effects)
  const edgeNameFor = (id: string) =>
    edgeNames[id] ?? edgeById.get(id)?.name ?? humanize(edgeSlugs[id] ?? id)
  const selectedEffects = selectedEdges.flatMap(edgeEffectsFor)
  const gearNames = values.gear_names ?? {}
  const gearQuantities = values.gear ?? {}

  const noDescription = 'No description available.'
  const hindrances = selectedHindrances.map((id) => {
    const reference = hindranceById.get(id)
    const referenceSeverity =
      reference && reference.severity !== 'minor_or_major' ? reference.severity : undefined
    const severity = hindranceSeverities[id] ?? referenceSeverity ?? 'minor'

    return {
      id,
      name: `${t(hindranceNames[id] ?? reference?.name ?? humanize(hindranceSlugs[id] ?? id))} (${t(severity)})`,
      description: t(hindranceDescriptions[id] || reference?.description || noDescription),
    }
  })
  const skills = selectedSkills.map((id) => {
    const reference = skillById.get(id)

    return {
      id,
      name: t(skillNames[id] ?? reference?.name ?? humanize(skillSlugs[id] ?? id)),
      description: t(skillDescriptions[id] || reference?.description || noDescription),
      ...applyEdgeEffects(
        skillDices[id] ?? 'd4',
        selectedEffects,
        'skill',
        skillSlugs[id] ?? reference?.slug ?? '',
      ),
    }
  })
  const edges = selectedEdges.map((id) => ({
    id,
    name: t(edgeNameFor(id)),
    description: t(edgeDescriptions[id] || edgeById.get(id)?.description || noDescription),
  }))
  const gear = Object.entries(gearQuantities).map(
    ([id, quantity]) => `${t(gearNames[id] ?? humanize(id))} × ${quantity}`,
  )

  return (
    <div className="grid gap-6">
      <div className="grid max-w-2xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{t('Review your character')}</h2>
        <p className="text-muted-foreground text-sm leading-6">
          {t(
            'Look over everything you chose. If something looks wrong, go back to that step and change it. All hindrance points must be spent before you can save the character.',
          )}
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
                  edgeEffectsFor(id).map((effect, index) => (
                    <li key={`${id}-${index}`}>
                      {t(edgeNameFor(id))}: {t(describeEdgeEffect(effect))}
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
