import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { AutocompleteInput } from '@/components/autocomplete-input'
import { SkillDie } from '@/components/skill-die'
import { skillDieTypes, type SkillDieType } from '@/components/dice-types'
import { TraitCardStack, type TraitCardStackTrait } from '@/components/trait-card-stack'
import { SkillsDocument, type SkillsQuery } from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { SkillPointsBalance } from './SkillPointsBalance'
import type { CharacterFormValues } from './character-form'

const defaultSkillPoints = 12
const dieSteps: Record<SkillDieType, number> = {
  d4: 0,
  d6: 1,
  d8: 2,
  d10: 3,
  d12: 4,
}
const attributeLabels: Record<string, string> = {
  agility: 'Agility',
  smarts: 'Smarts',
  spirit: 'Spirit',
  strength: 'Strength',
  vigor: 'Vigor',
}

const skillArtwork = (slug: string) => `/traits/skills/${slug}.png`

function attributeLabel(attribute: string) {
  const normalizedAttribute = attribute.trim().toLowerCase()

  return (
    attributeLabels[normalizedAttribute] ??
    normalizedAttribute.charAt(0).toUpperCase() + normalizedAttribute.slice(1)
  )
}

function defaultDieFor(skill: { core: boolean }): SkillDieType {
  return skill.core ? 'd6' : 'd4'
}

function skillPointCost(skill: { core: boolean }, die: SkillDieType) {
  return dieSteps[die] + (skill.core ? 0 : 1)
}

export function SkillsStep() {
  const form = useFormContext<CharacterFormValues>()
  const selectedIds = useWatch({ control: form.control, name: 'skills' }) ?? []
  const skillDices = useWatch({ control: form.control, name: 'skill_dice' }) ?? {}

  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const hindrancePointsSpent =
    useWatch({ control: form.control, name: 'hindrance_points_spent' }) ?? 0
  const attributeHindrancePointsSpent =
    useWatch({ control: form.control, name: 'attribute_hindrance_points_spent' }) ?? 0
  const skillHindrancePointsSpent =
    useWatch({ control: form.control, name: 'skill_hindrance_points_spent' }) ?? 0
  const [search, setSearch] = useState('')
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGraphqlInfiniteQuery<SkillsQuery>(
      ['skills'],
      SkillsDocument,
      (after) => ({ first: 25, after }),
      (page) => (page.skills.pageInfo.hasNextPage ? page.skills.pageInfo.endCursor : null),
    )
  const isLoadingAll = isPending || hasNextPage

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const skills = (data?.pages ?? [])
    .flatMap((page) => page.skills.nodes ?? [])
    .flatMap((skill) => (skill ? [skill] : []))
  const skillById = new Map(skills.map((skill) => [skill.id, skill]))
  const normalizedSearch = search.trim().toLowerCase()
  const filteredSkills = normalizedSearch
    ? skills.filter((skill) => skill.name.toLowerCase().includes(normalizedSearch))
    : skills
  const searchOptions = skills.map((skill) => ({
    value: skill.id,
    label: skill.name,
  }))
  const skillPointsSpent = selectedIds.reduce((total, skillId) => {
    const skill = skillById.get(skillId)

    return skill
      ? total + skillPointCost(skill, skillDices[skillId] ?? defaultDieFor(skill))
      : total
  }, 0)
  const otherHindrancePointsSpent = Math.max(
    hindrancePointsSpent - attributeHindrancePointsSpent - skillHindrancePointsSpent,
    0,
  )
  const hindrancePointsAvailableForSkills = Math.max(
    earnedHindrancePoints - otherHindrancePointsSpent,
    0,
  )
  const totalSkillPointPool = defaultSkillPoints + hindrancePointsAvailableForSkills

  useEffect(() => {
    if (isLoadingAll || isError) return

    const nextSkillHindrancePointsSpent = Math.max(skillPointsSpent - defaultSkillPoints, 0)
    const otherSpent = Math.max(
      hindrancePointsSpent - attributeHindrancePointsSpent - skillHindrancePointsSpent,
      0,
    )
    const nextHindrancePointsSpent =
      otherSpent + attributeHindrancePointsSpent + nextSkillHindrancePointsSpent

    if (skillHindrancePointsSpent !== nextSkillHindrancePointsSpent) {
      form.setValue('skill_hindrance_points_spent', nextSkillHindrancePointsSpent)
    }
    if (hindrancePointsSpent !== nextHindrancePointsSpent) {
      form.setValue('hindrance_points_spent', nextHindrancePointsSpent)
    }
  }, [
    attributeHindrancePointsSpent,
    form,
    hindrancePointsSpent,
    isError,
    isLoadingAll,
    skillHindrancePointsSpent,
    skillPointsSpent,
  ])

  const updateSkillState = (
    nextIds: string[],
    nextDices: Record<string, SkillDieType>,
    nextPointsSpent: number,
  ) => {
    const nextSkillHindrancePointsSpent = Math.max(nextPointsSpent - defaultSkillPoints, 0)
    const nextHindrancePointsSpent =
      otherHindrancePointsSpent + attributeHindrancePointsSpent + nextSkillHindrancePointsSpent
    const nextSkillSlugs = Object.fromEntries(
      nextIds.flatMap((id) => {
        const slug = skillById.get(id)?.slug

        return slug ? [[id, slug]] : []
      }),
    )
    const nextSkillNames = Object.fromEntries(
      nextIds.flatMap((id) => {
        const name = skillById.get(id)?.name

        return name ? [[id, name]] : []
      }),
    )
    const nextSkillDescriptions = Object.fromEntries(
      nextIds.map((id) => [id, skillById.get(id)?.description || 'No description available.']),
    )

    form.setValue('skills', nextIds, { shouldDirty: true, shouldTouch: true })
    form.setValue('skill_dice', nextDices, { shouldDirty: true, shouldTouch: true })
    form.setValue('skill_slugs', nextSkillSlugs, { shouldDirty: true, shouldTouch: true })
    form.setValue('skill_names', nextSkillNames, { shouldDirty: true, shouldTouch: true })
    form.setValue('skill_descriptions', nextSkillDescriptions, {
      shouldDirty: true,
      shouldTouch: true,
    })
    form.setValue('skill_hindrance_points_spent', nextSkillHindrancePointsSpent, {
      shouldDirty: true,
      shouldTouch: true,
    })
    form.setValue('hindrance_points_spent', nextHindrancePointsSpent, {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const maxDieFor = (skill: { id: string; core: boolean }) => {
    const currentDie = skillDices[skill.id] ?? defaultDieFor(skill)
    const availablePoints = Math.max(totalSkillPointPool - skillPointsSpent, 0)
    const maximumCost = skillPointCost(skill, currentDie) + availablePoints
    const maximumSteps = Math.min(maximumCost - (skill.core ? 0 : 1), dieSteps.d12)

    return skillDieTypes.find((die) => dieSteps[die] === maximumSteps) ?? currentDie
  }

  const handleDieChange = (skillId: string, nextDie: SkillDieType) => {
    const skill = skillById.get(skillId)

    if (!skill) return

    const isSelected = selectedIds.includes(skillId)
    const currentDie = skillDices[skillId] ?? defaultDieFor(skill)
    const nextPointsSpent =
      skillPointsSpent -
      (isSelected ? skillPointCost(skill, currentDie) : 0) +
      skillPointCost(skill, nextDie)

    if (nextPointsSpent > totalSkillPointPool) return

    const nextIds = isSelected ? selectedIds : [...selectedIds, skillId]
    const nextDices = { ...skillDices, [skillId]: nextDie }

    updateSkillState(nextIds, nextDices, nextPointsSpent)
  }

  const traits: TraitCardStackTrait[] = filteredSkills.map((skill) => {
    const isSelected = selectedIds.includes(skill.id)
    const cardDisabled = skillPointsSpent >= totalSkillPointPool && !isSelected
    const currentDie = skillDices[skill.id] ?? defaultDieFor(skill)

    return {
      title: skill.name,
      eyebrow: attributeLabel(skill.attribute),
      description: skill.description || undefined,
      headerContent: (
        <SkillDie
          die={isSelected ? currentDie : null}
          label={`${skill.name} die`}
          showModifier={false}
          maxDie={maxDieFor(skill)}
          disabledDice={skill.core ? ['d4'] : []}
          disabled={cardDisabled}
          onClick={(event) => event.stopPropagation()}
          onDieChange={(nextDie) => handleDieChange(skill.id, nextDie)}
        />
      ),
      backgroundImage: skillArtwork(skill.slug),
      selected: isSelected,
      disabled: cardDisabled,
    }
  })

  const handleSelect = (_trait: TraitCardStackTrait, index: number) => {
    const skill = filteredSkills[index]

    if (!skill) return

    if (selectedIds.includes(skill.id)) {
      const nextDices = { ...skillDices }
      delete nextDices[skill.id]
      updateSkillState(
        selectedIds.filter((id) => id !== skill.id),
        nextDices,
        skillPointsSpent - skillPointCost(skill, skillDices[skill.id] ?? defaultDieFor(skill)),
      )
      return
    }

    const nextDie = defaultDieFor(skill)
    const nextPointsSpent = skillPointsSpent + skillPointCost(skill, nextDie)

    if (nextPointsSpent > totalSkillPointPool) return

    updateSkillState(
      [...selectedIds, skill.id],
      { ...skillDices, [skill.id]: nextDie },
      nextPointsSpent,
    )
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">Choose skills</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Choose skills to spend your skill points. Hindrance points can buy additional skills after
          the default pool is spent.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <HindrancePointsBalance />
        </div>
        <div className="min-w-0 flex-1">
          <SkillPointsBalance spentPoints={skillPointsSpent} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AutocompleteInput
          aria-label="Search skills"
          options={searchOptions}
          value={search}
          onValueChange={setSearch}
          placeholder="Search skills"
          className="w-full sm:w-64"
        />
        {!isLoadingAll && !isError ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filteredSkills.length} {filteredSkills.length === 1 ? 'skill' : 'skills'}
          </p>
        ) : null}
      </div>

      {isLoadingAll ? <p className="text-muted-foreground text-sm">Loading skills…</p> : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          Could not load skills. Try again.
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredSkills.length === 0 ? (
        <p className="text-muted-foreground text-sm">No skills match the search.</p>
      ) : null}

      {!isLoadingAll && !isError && filteredSkills.length > 0 ? (
        <TraitCardStack
          category="Skills"
          traits={traits}
          size="md"
          columns={3}
          rows={2}
          onSelect={handleSelect}
          className="mx-auto"
        />
      ) : null}
    </div>
  )
}
