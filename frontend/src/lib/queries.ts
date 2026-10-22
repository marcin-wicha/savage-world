import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { DocumentNode } from 'graphql'

import { api, graphqlRequest } from './api-client'

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  'queryKey' | 'queryFn'
>

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>

type RestMutationConfig<TVariables> = {
  path: string | ((variables: TVariables) => string)
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
}

export function useRestQuery<TData>(
  queryKey: QueryKey,
  path: string,
  options: QueryOptions<TData> = {},
) {
  return useQuery<TData>({
    ...options,
    queryKey,
    queryFn: ({ signal }) => api.get<TData>(path, { signal }),
  })
}

export function useRestMutation<TData, TVariables = void>(
  { path, method = 'POST' }: RestMutationConfig<TVariables>,
  options: MutationOptions<TData, TVariables> = {},
) {
  return useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn: (variables) => {
      const resolvedPath = typeof path === 'function' ? path(variables) : path

      switch (method) {
        case 'PUT':
          return api.put<TData>(resolvedPath, variables)
        case 'PATCH':
          return api.patch<TData>(resolvedPath, variables)
        case 'DELETE':
          return api.delete<TData>(resolvedPath)
        default:
          return api.post<TData>(resolvedPath, variables)
      }
    },
  })
}

export function useGraphqlQuery<
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  queryKey: QueryKey,
  document: DocumentNode,
  variables?: TVariables,
  options: QueryOptions<TData> = {},
) {
  return useQuery<TData>({
    ...options,
    queryKey,
    queryFn: ({ signal }) => graphqlRequest<TData, TVariables>(document, variables, { signal }),
  })
}
