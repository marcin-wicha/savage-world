import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation } from '@/lib/queries'

const registrationSchema = z
  .object({
    email_address: z.email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
    password_confirmation: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match.',
  })

type RegistrationValues = z.infer<typeof registrationSchema>

export function RegisterRoute() {
  const { t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email_address: '', password: '', password_confirmation: '' },
  })
  const registration = useRestMutation<unknown, { user: RegistrationValues }>(
    { path: '/api/v1/registrations' },
    {
      onSuccess: () => setSubmitted(true),
      onError: (error) =>
        setError('root', {
          message:
            error instanceof ApiError && error.status === 422
              ? error.message
              : 'Unable to register. Please try again.',
        }),
    },
  )

  const onSubmit = handleSubmit((values) => {
    clearErrors('root')
    registration.mutate({ user: values })
  })

  return (
    <section className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('Register')}</CardTitle>
          <CardDescription>{t('Create an account to request access.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div role="status" className="space-y-4">
              <p>
                {t(
                  'Registration submitted. An admin must approve your account before you can sign in.',
                )}
              </p>
              <Link to="/login" className="text-foreground underline underline-offset-4">
                {t('Back to sign in')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email_address">{t('Email address')}</Label>
                <Input
                  id="email_address"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email_address || undefined}
                  aria-describedby={errors.email_address ? 'email-error' : undefined}
                  {...register('email_address')}
                />
                {errors.email_address ? (
                  <p id="email-error" className="text-danger text-sm">
                    {t(errors.email_address.message ?? '')}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">{t('Password')}</Label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password || undefined}
                  aria-describedby={errors.password ? 'register-password-error' : undefined}
                  {...register('password')}
                />
                {errors.password ? (
                  <p id="register-password-error" className="text-danger text-sm">
                    {t(errors.password.message ?? '')}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">{t('Confirm password')}</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password_confirmation || undefined}
                  aria-describedby={errors.password_confirmation ? 'confirmation-error' : undefined}
                  {...register('password_confirmation')}
                />
                {errors.password_confirmation ? (
                  <p id="confirmation-error" className="text-danger text-sm">
                    {t(errors.password_confirmation.message ?? '')}
                  </p>
                ) : null}
              </div>
              {errors.root?.message ? (
                <p role="alert" className="text-danger text-sm">
                  {t(errors.root.message)}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full" disabled={registration.isPending}>
                {registration.isPending ? t('Registering...') : t('Register')}
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                {t('Already have an account?')}{' '}
                <Link to="/login" className="text-foreground underline underline-offset-4">
                  {t('Sign in')}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
