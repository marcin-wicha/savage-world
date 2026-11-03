import { createBrowserRouter } from 'react-router-dom'

import { LoginRoute } from '@/features/auth/LoginRoute'
import { RegisterRoute } from '@/features/auth/RegisterRoute'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AdminEditorRoute } from '@/features/admin/AdminEditorRoute'
import { AdminApprovalsRoute } from '@/features/admin/AdminApprovalsRoute'
import { CharactersRoute } from '@/features/characters/CharactersRoute'
import { CharacterSheetRoute } from '@/features/characters/CharacterSheetRoute'
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
      { path: 'register', element: <RegisterRoute /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'characters', element: <CharactersRoute /> },
          { path: 'characters/new', element: <NewCharacterRoute /> },
          { path: 'characters/:id/edit', element: <NewCharacterRoute /> },
          { path: 'characters/:id/sheet', element: <CharacterSheetRoute /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'admin/reference-data', element: <AdminEditorRoute /> },
              { path: 'admin/approvals', element: <AdminApprovalsRoute /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
])
