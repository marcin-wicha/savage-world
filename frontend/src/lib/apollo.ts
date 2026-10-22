import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

import { ensureCsrfToken } from './csrf'
import { env } from './env'

const csrfLink = setContext(async (_, { headers }) => {
  const token = await ensureCsrfToken()

  return {
    headers: {
      ...headers,
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
  }
})

const httpLink = new HttpLink({
  uri: `${env.apiBaseUrl}/graphql`,
  credentials: 'include',
})

export const apolloClient = new ApolloClient({
  link: csrfLink.concat(httpLink),
  cache: new InMemoryCache(),
})
