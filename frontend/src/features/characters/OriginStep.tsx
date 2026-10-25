import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { TraitCard } from '@/components/trait-card'
import { OriginsDocument, type OriginsQuery } from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'

import type { CharacterFormValues } from './character-form'

export function OriginStep() {
  const form = useFormContext<CharacterFormValues>()
  const selectedId = useWatch({ control: form.control, name: 'origin' })
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGraphqlInfiniteQuery<OriginsQuery>(
      ['origins'],
      OriginsDocument,
      (after) => ({ first: 25, after }),
      (page) => (page.origins.pageInfo.hasNextPage ? page.origins.pageInfo.endCursor : null),
    )
  const isLoadingAll = isPending || hasNextPage

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const origins = (data?.pages ?? [])
    .flatMap((page) => page.origins.nodes ?? [])
    .flatMap((origin) => (origin ? [origin] : []))

  const handleSelect = (originId: string) => {
    form.setValue('origin', originId, { shouldDirty: true, shouldTouch: true })
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-xl gap-2">
        <h2 className="text-foreground text-xl font-medium">Choose an origin</h2>
        <p className="text-muted-foreground text-sm leading-6">
          Select the culture and background that shaped your character.
        </p>
      </div>

      {!isLoadingAll && !isError ? (
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {origins.length} {origins.length === 1 ? 'origin' : 'origins'}
        </p>
      ) : null}

      {isLoadingAll ? <p className="text-muted-foreground text-sm">Loading origins…</p> : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          Could not load origins. Try again.
        </p>
      ) : null}

      {!isLoadingAll && !isError && origins.length === 0 ? (
        <p className="text-muted-foreground text-sm">No origins are available.</p>
      ) : null}

      {!isLoadingAll && !isError && origins.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {origins.map((origin) => (
            <TraitCard
              key={origin.id}
              title={origin.name}
              description={origin.description}
              selected={origin.id === selectedId}
              size="md"
              className="justify-self-center"
              onClick={() => handleSelect(origin.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
