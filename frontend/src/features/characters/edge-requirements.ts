import type { EdgesQuery } from '@/graphql/generated/graphql'

export type EdgeRequirementClause = NonNullable<
  NonNullable<EdgesQuery['edges']['nodes']>[number]
>['requirements'][number]

type RequirementClauseData = {
  kind: string
  attribute?: string | null
  die?: number | null
  skill?: string | null
  slug?: string | null
  value?: string | null
  clauses?: readonly RequirementClauseData[] | null
}

export type EdgeRequirementCharacter = {
  attributes: {
    agility: number
    smarts: number
    spirit: number
    strength: number
    vigor: number
  }
  skillDiceBySlug: Record<string, number>
  edgeSlugs: ReadonlySet<string>
  hindranceSlugs: ReadonlySet<string>
}

type AttributeName = keyof EdgeRequirementCharacter['attributes']

const arcaneBackgroundSlug = 'arcane-background'

function meetsClause(
  requirement: RequirementClauseData,
  character: EdgeRequirementCharacter,
): boolean {
  switch (requirement.kind) {
    case 'any':
      return (requirement.clauses ?? []).some((clause) => meetsClause(clause, character))
    case 'attribute': {
      const attribute = requirement.attribute

      if (!attribute) return false
      if (!(attribute in character.attributes)) return false

      return (
        character.attributes[attribute as AttributeName] >=
        (requirement.die ?? Number.MAX_SAFE_INTEGER)
      )
    }
    case 'skill':
      if (!requirement.skill) return false

      return (
        (character.skillDiceBySlug[requirement.skill] ?? 0) >=
        (requirement.die ?? Number.MAX_SAFE_INTEGER)
      )
    case 'edge':
      return character.edgeSlugs.has(requirement.slug ?? '')
    case 'hindrance':
      return character.hindranceSlugs.has(requirement.slug ?? '')
    case 'arcane_background':
      return character.edgeSlugs.has(arcaneBackgroundSlug)
    case 'wild_card':
      return true
    case 'special':
      return false
    default:
      return false
  }
}

export function meetsEdgeRequirements(
  requirements: readonly EdgeRequirementClause[],
  character: EdgeRequirementCharacter,
): boolean {
  return requirements.every((requirement) => meetsClause(requirement, character))
}
