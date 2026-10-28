import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useRestMutation } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'

import { refreshAuthHint } from './auth-hint'
import { type SessionResponse, sessionQueryKey } from './use-session'

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Login is required.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginPayload = {
  email_address: string
  password: string
}

type LoginResponse = {
  user: {
    id: number
    email_address: string
    role: 'user' | 'admin'
  }
}

type LoginLocationState = {
  from?: string
}

export function LoginRoute() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const requestedPath = (location.state as LoginLocationState | null)?.from
  const redirectTo =
    requestedPath?.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.startsWith('/login')
      ? requestedPath
      : '/characters'
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  })

  const loginMutation = useRestMutation<LoginResponse, LoginPayload>(
    { path: '/api/v1/session', method: 'POST' },
    {
      onSuccess: (data) => {
        queryClient.setQueryData<SessionResponse>(sessionQueryKey, (current) => ({
          user: data.user,
          csrf_token: current?.csrf_token ?? '',
        }))
        refreshAuthHint()
        navigate(redirectTo, { replace: true })
      },
      onError: (error) => {
        setError('root', {
          message:
            error instanceof ApiError && error.status === 401
              ? 'Invalid login or password.'
              : 'Unable to sign in. Please try again.',
        })
      },
    },
  )

  const onSubmit = handleSubmit((values) => {
    clearErrors('root')
    loginMutation.mutate({
      email_address: values.login,
      password: values.password,
    })
  })

  return (
    <section className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
            {t('Player access')}
          </p>
          <CardTitle className="text-2xl">{t('Sign in')}</CardTitle>
          <CardDescription>{t('Sign in to manage your Savage Worlds characters.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="login">{t('Login')}</Label>
              <Input
                id="login"
                type="text"
                autoComplete="username"
                placeholder={t('admin')}
                aria-invalid={errors.login ? true : undefined}
                aria-describedby={errors.login ? 'login-error' : undefined}
                {...register('login')}
              />
              {errors.login ? (
                <p id="login-error" className="text-danger text-sm">
                  {t(errors.login.message ?? '')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('Password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password ? (
                <p id="password-error" className="text-danger text-sm">
                  {t(errors.password.message ?? '')}
                </p>
              ) : null}
            </div>

            {errors.root?.message ? (
              <p role="alert" className="text-danger text-sm">
                {t(errors.root.message)}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? t('Signing in...') : t('Sign in')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
