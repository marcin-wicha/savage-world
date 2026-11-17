import type { SkillDieType } from '@/components/dice-types'

import type { CharacterFormValues } from './character-form'

export const defaultAttributePoints = 5
export const defaultSkillPoints = 12
export const edgeHindrancePointCost = 2

export const dieSteps: Record<SkillDieType, number> = {
  d4: 0,
  d6: 1,
  d8: 2,
  d10: 3,
  d12: 4,
}

export function defaultDieFor(skill: { core: boolean }): SkillDieType {
  return skill.core ? 'd6' : 'd4'
}

export function skillPointCost(skill: { core: boolean }, die: SkillDieType) {
  return dieSteps[die] + (skill.core ? 0 : 1)
}

export function hindrancePointsSpentFor({
  attributes,
  skills,
  edgeCount,
}: {
  attributes: CharacterFormValues['attributes']
  skills: { core: boolean; die: SkillDieType }[]
  edgeCount: number
}) {
  const attributePoints = Object.values(attributes).reduce((total, die) => total + dieSteps[die], 0)
  const skillPoints = skills.reduce((total, skill) => total + skillPointCost(skill, skill.die), 0)
  const attribute = Math.max(attributePoints - defaultAttributePoints, 0)
  const skill = Math.max(skillPoints - defaultSkillPoints, 0)
  const edge = edgeCount * edgeHindrancePointCost

  return { attribute, skill, edge, total: attribute + skill + edge }
}
