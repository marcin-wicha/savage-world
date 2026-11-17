import { useEffect } from 'react'
import type { InfiniteData } from '@tanstack/react-query'

import {
  EdgesDocument,
  HindrancesDocument,
  SkillsDocument,
  type EdgesQuery,
  type HindrancesQuery,
  type SkillsQuery,
} from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'

type CatalogQueryState<TPage> = {
  data: InfiniteData<TPage> | undefined
  isPending: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

function useAllPages<TPage, TItem>(
  query: CatalogQueryState<TPage>,
  nodes: (page: TPage) => readonly (TItem | null | undefined)[] | null | undefined,
) {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const items = (data?.pages ?? [])
    .flatMap((page) => nodes(page) ?? [])
    .flatMap((item) => (item ? [item] : []))

  return { items, isLoadingAll: isPending || hasNextPage, isError }
}

export function useHindranceCatalog({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useGraphqlInfiniteQuery<HindrancesQuery>(
    ['hindrances'],
    HindrancesDocument,
    (after) => ({ first: 40, after }),
    (page) => (page.hindrances.pageInfo.hasNextPage ? page.hindrances.pageInfo.endCursor : null),
    { enabled },
  )

  return useAllPages(query, (page) => page.hindrances.nodes)
}

export function useSkillCatalog({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useGraphqlInfiniteQuery<SkillsQuery>(
    ['skills'],
    SkillsDocument,
    (after) => ({ first: 25, after }),
    (page) => (page.skills.pageInfo.hasNextPage ? page.skills.pageInfo.endCursor : null),
    { enabled },
  )

  return useAllPages(query, (page) => page.skills.nodes)
}

export function useEdgeCatalog({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useGraphqlInfiniteQuery<EdgesQuery>(
    ['edges'],
    EdgesDocument,
    (after) => ({ first: 11, after }),
    (page) => (page.edges?.pageInfo.hasNextPage ? page.edges.pageInfo.endCursor : null),
    { enabled },
  )

  return useAllPages(query, (page) => page.edges?.nodes)
}
