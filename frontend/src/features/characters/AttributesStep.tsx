import { useFormContext, useWatch } from 'react-hook-form'

import { SkillDie } from '@/components/skill-die'
import { skillDieTypes, type SkillDieType } from '@/components/dice-types'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/lib/i18n-context'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { AttributePointsBalance } from './AttributePointsBalance'
import type { CharacterFormValues } from './character-form'

const defaultAttributePoints = 5
const dieSteps: Record<SkillDieType, number> = {
  d4: 0,
  d6: 1,
  d8: 2,
  d10: 3,
  d12: 4,
}

const attributeDefinitions = [
  {
    id: 'agility',
    label: 'Agility',
    description: 'Nimbleness, dexterity, and coordination.',
  },
  {
    id: 'smarts',
    label: 'Smarts',
    description: 'Intelligence, reasoning, and general knowledge.',
  },
  {
    id: 'spirit',
    label: 'Spirit',
    description: 'Inner strength, willpower, and mental fortitude.',
  },
  {
    id: 'strength',
    label: 'Strength',
    description: 'Physical power and fitness.',
  },
  {
    id: 'vigor',
    label: 'Vigor',
    description: 'Endurance, toughness, and resistance to harm.',
  },
] as const

export function AttributesStep() {
  const { t } = useLanguage()
  const form = useFormContext<CharacterFormValues>()
  const attributes = useWatch({ control: form.control, name: 'attributes' })
  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const hindrancePointsSpent =
    useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const attributeHindrancePointsSpent =
    useWatch({ control: form.control, name: 'attribute_hindrance_points_spent' }) ?? 0
  const attributePointsSpent = attributeDefinitions.reduce(
    (total, { id }) => total + dieSteps[attributes[id]],
    0,
  )
  const otherHindrancePointsSpent = Math.max(
    hindrancePointsSpent - attributeHindrancePointsSpent,
    0,
  )
  const hindrancePointsAvailableForAttributes = Math.max(
    earnedHindrancePoints - otherHindrancePointsSpent,
    0,
  )
  const totalAttributePointPool = defaultAttributePoints + hindrancePointsAvailableForAttributes

  const maxDieFor = (attribute: keyof CharacterFormValues['attributes']): SkillDieType => {
    const availableUpgradePoints = Math.max(totalAttributePointPool - attributePointsSpent, 0)
    const maximumSteps = Math.min(
      dieSteps[attributes[attribute]] + availableUpgradePoints,
      dieSteps.d12,
    )

    return skillDieTypes.find((die) => dieSteps[die] === maximumSteps) ?? attributes[attribute]
  }

  const handleDieChange = (attribute: keyof CharacterFormValues['attributes']) => {
    return (nextDie: SkillDieType) => {
      const nextAttributePointsSpent =
        attributePointsSpent - dieSteps[attributes[attribute]] + dieSteps[nextDie]

      if (nextAttributePointsSpent > totalAttributePointPool) return

      const nextAttributeHindrancePointsSpent = Math.max(
        nextAttributePointsSpent - defaultAttributePoints,
        0,
      )
      const nextHindrancePointsSpent = otherHindrancePointsSpent + nextAttributeHindrancePointsSpent

      form.setValue(
        'attributes',
        { ...attributes, [attribute]: nextDie },
        { shouldDirty: true, shouldTouch: true },
      )
      form.setValue('attribute_hindrance_points_spent', nextAttributeHindrancePointsSpent, {
        shouldDirty: true,
        shouldTouch: true,
      })
      form.setValue('hindrance_points_spent', nextHindrancePointsSpent, {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{t('Assign attributes')}</h2>
        <p className="text-muted-foreground text-sm leading-6">
          {t(
            "Attributes are your character's natural talents: Agility (speed and coordination), Smarts (knowledge and quick thinking), Spirit (willpower and nerve), Strength (physical power), and Vigor (health and endurance). Each is rated with a die from d4 (weak) to d12 (exceptional); a bigger die means better rolls. Every attribute starts at d4. You have 5 points, and each point raises one attribute by one die size. Unspent hindrance points can buy more.",
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <HindrancePointsBalance />
        </div>
        <div className="min-w-0 flex-1">
          <AttributePointsBalance spentPoints={attributePointsSpent} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {attributeDefinitions.map(({ id, label, description }) => (
          <Card key={id}>
            <CardContent className="grid gap-4">
              <div className="grid gap-1">
                <h3 className="text-foreground font-medium">{t(label)}</h3>
                <p className="text-muted-foreground text-sm leading-5">{t(description)}</p>
              </div>
              <SkillDie
                die={attributes[id]}
                label={`${t(label)} ${t('die')}`}
                showModifier={false}
                maxDie={maxDieFor(id)}
                onDieChange={handleDieChange(id)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
