import { createBrowserRouter } from 'react-router-dom'

import { CharactersRoute } from '@/features/characters/CharactersRoute'
import { HomeRoute } from '@/routes/HomeRoute'
import { NotFoundRoute } from '@/routes/NotFoundRoute'

import { AppShell } from './AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'characters', element: <CharactersRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
])
