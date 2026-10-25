import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { SkillDie } from '@/components/skill-die'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { HindrancePointsBalance } from './HindrancePointsBalance'
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
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-foreground hover:text-primary focus-visible:ring-ring/50 rounded-sm text-left text-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-3"
        >
          {item.name}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="leading-5">
        {item.description}
      </TooltipContent>
    </Tooltip>
  )
}

function SummaryItemList({ items }: { items: SummaryItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">None selected.</p>
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
  skills: (SummaryItem & { die: CharacterFormValues['skill_dice'][string] })[]
}) {
  if (skills.length === 0) {
    return <p className="text-muted-foreground text-sm">None selected.</p>
  }

  return (
    <ul className="grid gap-3">
      {skills.map((skill) => (
        <li key={skill.id} className="flex items-center justify-between gap-3">
          <SummaryItemTooltip item={skill} />
          <SkillDie readOnly die={skill.die} showModifier={false} label={`${skill.name} die`} />
        </li>
      ))}
    </ul>
  )
}

export function CharacterSummaryStep() {
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
  const edgeSlugs = values.edge_slugs ?? {}
  const edgeDescriptions = values.edge_descriptions ?? {}
  const gearNames = values.gear_names ?? {}
  const gearQuantities = values.gear ?? {}

  const hindrances = selectedHindrances.map((id) => ({
    id,
    name: `${hindranceNames[id] ?? humanize(hindranceSlugs[id] ?? id)} (${hindranceSeverities[id] ?? 'minor'})`,
    description: hindranceDescriptions[id] ?? 'No description available.',
  }))
  const skills = selectedSkills.map((id) => ({
    id,
    name: skillNames[id] ?? humanize(skillSlugs[id] ?? id),
    description: skillDescriptions[id] ?? 'No description available.',
    die: skillDices[id] ?? 'd4',
  }))
  const edges = selectedEdges.map((id) => ({
    id,
    name: edgeNames[id] ?? humanize(edgeSlugs[id] ?? id),
    description: edgeDescriptions[id] ?? 'No description available.',
  }))
  const gear = Object.entries(gearQuantities).map(
    ([id, quantity]) => `${gearNames[id] ?? humanize(id)} × ${quantity}`,
  )

  return (
    <div className="grid gap-6">
      <div className="grid max-w-2xl gap-2">
        <h2 className="text-foreground text-xl font-medium">Review your character</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Check every choice before saving this character to your roster.
        </p>
      </div>

      <HindrancePointsBalance />

      {!hindrancePointsBalanced ? (
        <p className="text-danger text-sm" role="alert">
          {remainingPoints > 0
            ? `Spend all ${remainingPoints} remaining hindrance ${remainingPoints === 1 ? 'point' : 'points'} before saving.`
            : 'Hindrance points are overspent. Return to an earlier step and adjust your choices.'}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          All hindrance points have been spent.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummarySection title="Concept">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground font-medium">{concept.name || 'Unnamed'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="text-foreground whitespace-pre-wrap">
                {concept.description || 'No concept description.'}
              </dd>
            </div>
          </dl>
        </SummarySection>

        <SummarySection title="Origin">
          <p className="text-foreground text-sm font-medium">
            {values.origin_name ||
              (values.origin ? `Origin ${values.origin}` : 'No origin selected.')}
          </p>
        </SummarySection>

        <SummarySection title="Attributes">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(attributeLabels) as (keyof CharacterFormValues['attributes'])[]).map(
              (attribute) => (
                <div key={attribute}>
                  <dt className="text-muted-foreground text-sm">{attributeLabels[attribute]}</dt>
                  <dd className="text-foreground font-medium">{attributes[attribute]}</dd>
                </div>
              ),
            )}
          </dl>
        </SummarySection>

        <SummarySection title="Hindrances" description={`${hindrances.length} selected`}>
          <SummaryItemList items={hindrances} />
        </SummarySection>

        <SummarySection title="Skills" description={`${skills.length} selected`}>
          <SkillSummaryList skills={skills} />
        </SummarySection>

        <SummarySection title="Edges" description={`${edges.length} selected`}>
          <SummaryItemList items={edges} />
        </SummarySection>

        <SummarySection title="Gear" description={`${gear.length} selected`}>
          <SummaryList items={gear} />
        </SummarySection>
      </div>
    </div>
  )
}
