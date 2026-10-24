import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { AutocompleteInput } from '@/components/autocomplete-input'
import { FilterButton, type FilterOption } from '@/components/filter-button'
import { TraitCardStack, type TraitCardStackTrait } from '@/components/trait-card-stack'
import { Button } from '@/components/ui/button'
import { EdgesDocument, type EdgeCategory, type EdgesQuery } from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { meetsEdgeRequirements, type EdgeRequirementCharacter } from './edge-requirements'
import type { CharacterFormValues } from './character-form'

const rankOptions: FilterOption[] = [
  { value: 'novice', label: 'Novice' },
  { value: 'seasoned', label: 'Seasoned' },
  { value: 'veteran', label: 'Veteran' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'legendary', label: 'Legendary' },
]

const categoryLabels: Record<EdgeCategory, string> = {
  background: 'Background',
  combat: 'Combat',
  leadership: 'Leadership',
  legendary: 'Legendary',
  power: 'Power',
  professional: 'Professional',
  social: 'Social',
  weird: 'Weird',
}

const dieValues: Record<string, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12 }
const edgeArtwork = (slug: string) => `/traits/edges/${slug}.png`
const edgeHindrancePointCost = 1

export function EdgesStep() {
  const form = useFormContext<CharacterFormValues>()
  const selectedIds = useWatch({ control: form.control, name: 'edges' }) ?? []
  const attributes = useWatch({ control: form.control, name: 'attributes' })
  const skillIds = useWatch({ control: form.control, name: 'skills' }) ?? []
  const skillDices = useWatch({ control: form.control, name: 'skill_dice' }) ?? {}
  const skillSlugs = useWatch({ control: form.control, name: 'skill_slugs' }) ?? {}
  const hindranceSlugs = useWatch({ control: form.control, name: 'hindrance_slugs' }) ?? {}
  const earnedHindrancePoints =
    useWatch({ control: form.control, name: 'hindrance_points_earned' }) ?? 0
  const attributeHindrancePointsSpent =
    useWatch({ control: form.control, name: 'attribute_hindrance_points_spent' }) ?? 0
  const skillHindrancePointsSpent =
    useWatch({ control: form.control, name: 'skill_hindrance_points_spent' }) ?? 0
  const [ranks, setRanks] = useState<string[]>([])
  const [onlyRequirementsMet, setOnlyRequirementsMet] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGraphqlInfiniteQuery<EdgesQuery>(
      ['edges'],
      EdgesDocument,
      (after) => ({ first: 15, after }),
      (page) => (page.edges?.pageInfo.hasNextPage ? page.edges.pageInfo.endCursor : null),
    )
  const isLoadingAll = isPending || hasNextPage

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const edges = (data?.pages ?? [])
    .flatMap((page) => page.edges?.nodes ?? [])
    .flatMap((edge) => (edge ? [edge] : []))
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))
  const selectedEdgeSlugs = new Set(
    selectedIds.flatMap((id) => {
      const slug = edgeById.get(id)?.slug

      return slug ? [slug] : []
    }),
  )
  const character: EdgeRequirementCharacter = {
    attributes: {
      agility: dieValues[attributes.agility],
      smarts: dieValues[attributes.smarts],
      spirit: dieValues[attributes.spirit],
      strength: dieValues[attributes.strength],
      vigor: dieValues[attributes.vigor],
    },
    skillDiceBySlug: Object.fromEntries(
      skillIds.flatMap((id) =>
        skillSlugs[id] && skillDices[id] ? [[skillSlugs[id], dieValues[skillDices[id]]]] : [],
      ),
    ),
    edgeSlugs: selectedEdgeSlugs,
    hindranceSlugs: new Set(Object.values(hindranceSlugs)),
  }
  const rankFilteredEdges = edges.filter(
    (edge) => ranks.length === 0 || ranks.includes(edge.minimum_rank),
  )
  const requirementsFilteredEdges = onlyRequirementsMet
    ? rankFilteredEdges.filter((edge) => meetsEdgeRequirements(edge.requirements, character))
    : rankFilteredEdges
  const normalizedSearch = search.trim().toLowerCase()
  const filteredEdges = normalizedSearch
    ? requirementsFilteredEdges.filter((edge) => edge.name.toLowerCase().includes(normalizedSearch))
    : requirementsFilteredEdges
  const searchOptions = rankFilteredEdges.map((edge) => ({
    value: edge.id,
    label: edge.name,
  }))
  const reservedHindrancePoints = attributeHindrancePointsSpent + skillHindrancePointsSpent
  const edgePointsSpent = selectedIds.length * edgeHindrancePointCost
  const availableForEdges = Math.max(
    earnedHindrancePoints - reservedHindrancePoints - edgePointsSpent,
    0,
  )

  useEffect(() => {
    if (isLoadingAll || isError) return

    if (form.getValues('edge_hindrance_points_spent') !== edgePointsSpent) {
      form.setValue('edge_hindrance_points_spent', edgePointsSpent, {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
    if (form.getValues('hindrance_points_spent') !== reservedHindrancePoints + edgePointsSpent) {
      form.setValue('hindrance_points_spent', reservedHindrancePoints + edgePointsSpent, {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }, [edgePointsSpent, form, isError, isLoadingAll, reservedHindrancePoints])

  const handleSelect = (_trait: TraitCardStackTrait, index: number) => {
    const edge = filteredEdges[index]

    if (!edge) return

    const isSelected = selectedIds.includes(edge.id)

    if (isSelected) {
      form.setValue(
        'edges',
        selectedIds.filter((id) => id !== edge.id),
        { shouldDirty: true, shouldTouch: true },
      )
      return
    }

    if (availableForEdges < edgeHindrancePointCost) return

    form.setValue('edges', [...selectedIds, edge.id], { shouldDirty: true, shouldTouch: true })
  }

  const traits: TraitCardStackTrait[] = filteredEdges.map((edge) => {
    const isSelected = selectedIds.includes(edge.id)
    const categoryLabel = categoryLabels[edge.category] ?? edge.category
    const minimumRankLabel = rankOptions.find((rank) => rank.value === edge.minimum_rank)?.label

    return {
      title: edge.name,
      eyebrow: minimumRankLabel ? `${minimumRankLabel} · ${categoryLabel}` : categoryLabel,
      description: edge.requirements_text || undefined,
      backgroundImage: edgeArtwork(edge.slug),
      selected: isSelected,
      disabled: !isSelected && availableForEdges < edgeHindrancePointCost,
    }
  })

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">Choose edges</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Spend hindrance points to buy edges. Each edge costs one hindrance point.
        </p>
      </div>

      <HindrancePointsBalance />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton
            label="Rank"
            options={rankOptions}
            multiple
            value={ranks}
            onValueChange={setRanks}
          />
          <Button
            type="button"
            variant="outline"
            aria-pressed={onlyRequirementsMet}
            onClick={() => setOnlyRequirementsMet((pressed) => !pressed)}
            className={cn(onlyRequirementsMet && 'bg-accent text-accent-foreground')}
          >
            Requirements met
          </Button>
          <AutocompleteInput
            aria-label="Search edges"
            options={searchOptions}
            value={search}
            onValueChange={setSearch}
            placeholder="Search edges"
            className="w-full sm:w-64"
          />
        </div>
        {!isLoadingAll && !isError ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filteredEdges.length} {filteredEdges.length === 1 ? 'edge' : 'edges'}
          </p>
        ) : null}
      </div>

      {isLoadingAll ? <p className="text-muted-foreground text-sm">Loading edges…</p> : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          Could not load edges. Try again.
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredEdges.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No edges match the selected filters or search.
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredEdges.length > 0 ? (
        <TraitCardStack
          category="Edges"
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
