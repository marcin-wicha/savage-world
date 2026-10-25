import { createBrowserRouter } from 'react-router-dom'

import { LoginRoute } from '@/features/auth/LoginRoute'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AdminEditorRoute } from '@/features/admin/AdminEditorRoute'
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
          {
            element: <RequireAdmin />,
            children: [{ path: 'admin/reference-data', element: <AdminEditorRoute /> }],
          },
        ],
      },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
])
