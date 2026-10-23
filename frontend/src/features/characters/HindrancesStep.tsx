import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { AutocompleteInput } from '@/components/autocomplete-input'
import { FilterButton, type FilterOption } from '@/components/filter-button'
import { TraitCardStack, type TraitCardStackTrait } from '@/components/trait-card-stack'
import {
  HindrancesDocument,
  type HindranceSeverity,
  type HindrancesQuery,
} from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'

import type { CharacterFormValues } from './character-form'

const severityOptions: FilterOption[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
]

const severityLabels: Record<HindranceSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  minor_or_major: 'Minor or Major',
}

const hindranceArtwork = (slug: string) => `/traits/hindrances/${slug}.png`

export function HindrancesStep() {
  const form = useFormContext<CharacterFormValues>()
  const selectedIds = useWatch({ control: form.control, name: 'hindrances' }) ?? []
  const [severities, setSeverities] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGraphqlInfiniteQuery<HindrancesQuery>(
      ['hindrances'],
      HindrancesDocument,
      (after) => ({ first: 50, after }),
      (page) => (page.hindrances.pageInfo.hasNextPage ? page.hindrances.pageInfo.endCursor : null),
    )
  const isLoadingAll = isPending || hasNextPage

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const hindrances = (data?.pages ?? [])
    .flatMap((page) => page.hindrances.nodes ?? [])
    .flatMap((hindrance) => (hindrance ? [hindrance] : []))
  const severityFilteredHindrances = hindrances.filter((hindrance) => {
    if (severities.length === 0) return true
    if (hindrance.severity === 'minor_or_major') return true

    return severities.includes(hindrance.severity)
  })
  const normalizedSearch = search.trim().toLowerCase()
  const filteredHindrances = normalizedSearch
    ? severityFilteredHindrances.filter((hindrance) =>
        hindrance.name.toLowerCase().includes(normalizedSearch),
      )
    : severityFilteredHindrances
  const searchOptions = severityFilteredHindrances.map((hindrance) => ({
    value: hindrance.id,
    label: hindrance.name,
  }))
  const traits: TraitCardStackTrait[] = filteredHindrances.map((hindrance) => ({
    title: hindrance.name,
    eyebrow: severityLabels[hindrance.severity],
    description: hindrance.requirements_text || undefined,
    backgroundImage: hindranceArtwork(hindrance.slug),
    selected: selectedIds.includes(hindrance.id),
  }))

  const handleSelect = (_trait: TraitCardStackTrait, index: number) => {
    const hindrance = filteredHindrances[index]

    if (!hindrance) return

    const next = selectedIds.includes(hindrance.id)
      ? selectedIds.filter((id) => id !== hindrance.id)
      : [...selectedIds, hindrance.id]

    form.setValue('hindrances', next, { shouldDirty: true, shouldTouch: true })
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">Take hindrances</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Choose hindrances to earn points for edges, attributes, and skills.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton
            label="Severity"
            options={severityOptions}
            multiple
            value={severities}
            onValueChange={setSeverities}
          />
          <AutocompleteInput
            aria-label="Search hindrances"
            options={searchOptions}
            value={search}
            onValueChange={setSearch}
            placeholder="Search hindrances"
            className="w-full sm:w-64"
          />
        </div>
        {!isLoadingAll && !isError ? (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filteredHindrances.length}{' '}
            {filteredHindrances.length === 1 ? 'hindrance' : 'hindrances'}
          </p>
        ) : null}
      </div>

      {isLoadingAll ? <p className="text-muted-foreground text-sm">Loading hindrances…</p> : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          Could not load hindrances. Try again.
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredHindrances.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hindrances match the selected filters.</p>
      ) : null}

      {!isLoadingAll && !isError && filteredHindrances.length > 0 ? (
        <TraitCardStack
          category="Hindrances"
          traits={traits}
          size="md"
          revealedCount={3}
          onSelect={handleSelect}
          className="mx-auto"
        />
      ) : null}
    </div>
  )
}
