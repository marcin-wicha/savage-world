import { useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { AutocompleteInput } from '@/components/autocomplete-input'
import { FilterButton, type FilterOption } from '@/components/filter-button'
import { TraitCardStack, type TraitCardStackTrait } from '@/components/trait-card-stack'
import { Button } from '@/components/ui/button'
import { EdgesDocument, type EdgeCategory, type EdgesQuery } from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'
import { cn } from '@/lib/utils'

import { HindrancePointsBalance } from './HindrancePointsBalance'
import { meetsEdgeRequirements, type EdgeRequirementCharacter } from './edge-requirements'
import { parseEdgeEffects } from './edge-effects'
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
const edgeHindrancePointCost = 2

export function EdgesStep() {
  const { language, t } = useLanguage()
  const form = useFormContext<CharacterFormValues>()
  const watchedSelectedIds = useWatch({ control: form.control, name: 'edges' })
  const selectedIds = useMemo(
    () =>
      watchedSelectedIds && watchedSelectedIds.length > 0
        ? watchedSelectedIds
        : (form.getValues('edges') ?? []),
    [form, watchedSelectedIds],
  )
  const attributes = useWatch({ control: form.control, name: 'attributes' })
  const skillIds = useWatch({ control: form.control, name: 'skills' }) ?? []
  const skillDices = useWatch({ control: form.control, name: 'skill_dice' }) ?? {}
  const skillSlugs = useWatch({ control: form.control, name: 'skill_slugs' }) ?? {}
  const hindranceSlugs = useWatch({ control: form.control, name: 'hindrance_slugs' }) ?? {}
  const edgeNames = useWatch({ control: form.control, name: 'edge_names' }) ?? {}
  const edgeSlugs = useWatch({ control: form.control, name: 'edge_slugs' }) ?? {}
  const edgeDescriptions = useWatch({ control: form.control, name: 'edge_descriptions' }) ?? {}
  const watchedEdgeEffects = useWatch({ control: form.control, name: 'edge_effects' })
  const edgeEffects = useMemo(() => watchedEdgeEffects ?? {}, [watchedEdgeEffects])
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
      (after) => ({ first: 14, after }),
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
  const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges])

  useEffect(() => {
    if (isLoadingAll || isError) return

    const nextEffects = { ...edgeEffects }
    let changed = false
    selectedIds.forEach((id) => {
      const edge = edgeById.get(id)
      if (!edge || nextEffects[id]) return
      nextEffects[id] = parseEdgeEffects(edge.effects)
      changed = true
    })
    if (changed) form.setValue('edge_effects', nextEffects)
  }, [edgeById, edgeEffects, form, isError, isLoadingAll, selectedIds])
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
    ? requirementsFilteredEdges.filter((edge) =>
        t(edge.name).toLowerCase().includes(normalizedSearch),
      )
    : requirementsFilteredEdges
  const searchOptions = rankFilteredEdges.map((edge) => ({
    value: edge.id,
    label: t(edge.name),
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
      const nextNames = { ...edgeNames }
      const nextSlugs = { ...edgeSlugs }
      delete nextNames[edge.id]
      delete nextSlugs[edge.id]
      const nextDescriptions = { ...edgeDescriptions }
      delete nextDescriptions[edge.id]
      const nextEffects = { ...edgeEffects }
      delete nextEffects[edge.id]

      form.setValue(
        'edges',
        selectedIds.filter((id) => id !== edge.id),
        { shouldDirty: true, shouldTouch: true },
      )
      form.setValue('edge_names', nextNames, { shouldDirty: true, shouldTouch: true })
      form.setValue('edge_slugs', nextSlugs, { shouldDirty: true, shouldTouch: true })
      form.setValue('edge_descriptions', nextDescriptions, {
        shouldDirty: true,
        shouldTouch: true,
      })
      form.setValue('edge_effects', nextEffects, { shouldDirty: true, shouldTouch: true })
      return
    }

    if (availableForEdges < edgeHindrancePointCost) return

    form.setValue('edges', [...selectedIds, edge.id], { shouldDirty: true, shouldTouch: true })
    form.setValue(
      'edge_names',
      { ...edgeNames, [edge.id]: edge.name },
      { shouldDirty: true, shouldTouch: true },
    )
    form.setValue(
      'edge_slugs',
      { ...edgeSlugs, [edge.id]: edge.slug },
      { shouldDirty: true, shouldTouch: true },
    )
    form.setValue(
      'edge_effects',
      { ...edgeEffects, [edge.id]: parseEdgeEffects(edge.effects) },
      { shouldDirty: true, shouldTouch: true },
    )
    form.setValue(
      'edge_descriptions',
      {
        ...edgeDescriptions,
        [edge.id]: edge.description || edge.requirements_text || 'No description available.',
      },
      { shouldDirty: true, shouldTouch: true },
    )
  }

  const traits: TraitCardStackTrait[] = filteredEdges.map((edge) => {
    const isSelected = selectedIds.includes(edge.id)
    const categoryLabel =
      edge.category === 'professional' && language === 'pl'
        ? t('Professional category')
        : t(categoryLabels[edge.category] ?? edge.category)
    const minimumRankLabel = t(
      rankOptions.find((rank) => rank.value === edge.minimum_rank)?.label ?? edge.minimum_rank,
    )

    return {
      title: t(edge.name),
      eyebrow: minimumRankLabel ? `${minimumRankLabel} · ${categoryLabel}` : categoryLabel,
      description: t(edge.description || edge.requirements_text || '') || undefined,
      backgroundImage: edgeArtwork(edge.slug),
      selected: isSelected,
      disabled: !isSelected && availableForEdges < edgeHindrancePointCost,
    }
  })

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">{t('Choose edges')}</h2>
        <p className="text-muted-foreground text-sm leading-6">
          {t('Spend hindrance points to buy edges. Each edge costs two hindrance points.')}
        </p>
      </div>

      <HindrancePointsBalance />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton
            label={t('Rank')}
            options={rankOptions.map((option) => ({ ...option, label: t(option.label) }))}
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
            {t('Requirements met')}
          </Button>
          <AutocompleteInput
            aria-label={t('Search edges')}
            options={searchOptions}
            value={search}
            onValueChange={setSearch}
            placeholder={t('Search edges')}
            className="w-full sm:w-64"
          />
        </div>
        {!isLoadingAll && !isError ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filteredEdges.length} {filteredEdges.length === 1 ? t('edge') : t('edges')}
          </p>
        ) : null}
      </div>

      {isLoadingAll ? <p className="text-muted-foreground text-sm">{t('Loading edges…')}</p> : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          {t('Could not load edges. Try again.')}
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredEdges.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('No edges match the selected filters or search.')}
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredEdges.length > 0 ? (
        <TraitCardStack
          category={t('Edges')}
          traits={traits}
          size="md"
          columns={3}
          rows={2}
          onSelect={handleSelect}
          defaultOpen={selectedIds.length > 0}
          className="mx-auto"
        />
      ) : null}
    </div>
  )
}
