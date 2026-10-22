import { createBrowserRouter } from 'react-router-dom'

import { LoginRoute } from '@/features/auth/LoginRoute'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CharactersRoute } from '@/features/characters/CharactersRoute'
import { NewCharacterRoute } from '@/features/characters/NewCharacterRoute'
import { HomeRoute } from '@/routes/HomeRoute'
import { NotFoundRoute } from '@/routes/NotFoundRoute'

import { AppShell } from './AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'login', element: <LoginRoute /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'characters', element: <CharactersRoute /> },
          { path: 'characters/new', element: <NewCharacterRoute /> },
        ],
      },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
])
