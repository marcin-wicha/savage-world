import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation, useRestQuery } from '@/lib/queries'

type PendingUser = {
  id: number
  email_address: string
}

type PendingUsersResponse = { users: PendingUser[] }

const pendingUsersKey = ['admin-pending-users'] as const

export function AdminApprovalsRoute() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const usersQuery = useRestQuery<PendingUsersResponse>(pendingUsersKey, '/api/v1/admin/users')
  const approval = useRestMutation<{ user: PendingUser }, { id: number }>(
    {
      path: ({ id }) => `/api/v1/admin/users/${encodeURIComponent(String(id))}/approve`,
      method: 'PATCH',
    },
    {
      onSuccess: (_user, { id }) => {
        queryClient.setQueryData<PendingUsersResponse>(pendingUsersKey, (current) =>
          current ? { users: current.users.filter((user) => user.id !== id) } : current,
        )
        void queryClient.invalidateQueries({ queryKey: pendingUsersKey })
        setApprovingId(null)
      },
      onError: (error) => {
        setApprovalError(
          error instanceof ApiError ? error.message : 'Could not approve user. Try again.',
        )
        setApprovingId(null)
      },
    },
  )

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('Pending approvals')}</CardTitle>
          <CardDescription>{t('Approve registrations before users can sign in.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {usersQuery.isPending ? (
            <p role="status" className="text-muted-foreground">
              {t('Loading registrations…')}
            </p>
          ) : usersQuery.isError ? (
            <p role="alert" className="text-danger">
              {t('Could not load registrations. Try again.')}
            </p>
          ) : usersQuery.data?.users.length ? (
            <ul className="divide-border divide-y">
              {usersQuery.data.users.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <p className="font-medium">{user.email_address}</p>
                  <Button
                    type="button"
                    aria-label={`${approvingId === user.id ? t('Approving...') : t('Approve')} ${user.email_address}`}
                    disabled={approval.isPending}
                    onClick={() => {
                      setApprovalError(null)
                      setApprovingId(user.id)
                      approval.mutate({ id: user.id })
                    }}
                  >
                    {approvingId === user.id ? t('Approving...') : t('Approve')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t('No pending registrations.')}</p>
          )}
          {approvalError ? (
            <p role="alert" className="text-danger mt-4">
              {t(approvalError)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}
