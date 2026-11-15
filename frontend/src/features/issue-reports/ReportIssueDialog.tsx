import { zodResolver } from '@hookform/resolvers/zod'
import { BugIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { useLanguage } from '@/lib/i18n-context'
import { useRestMutation } from '@/lib/queries'

const reportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Title must be 120 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(5000, 'Description must be 5000 characters or fewer.'),
})

type ReportFormValues = z.infer<typeof reportSchema>

type IssueReportPayload = {
  issue_report: ReportFormValues & {
    page_url: string
    language: string
    viewport: string
    user_agent: string
  }
}

type IssueReportResponse = {
  issue: { number: number; url: string }
}

function isReportIssueShortcut(event: KeyboardEvent) {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'b'
  )
}

export function ReportIssueButton() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isReportIssueShortcut(event)) return

      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Report an issue')}
        title={`${t('Report an issue')} (Ctrl/⌘+B)`}
        onClick={() => setOpen(true)}
      >
        <BugIcon />
      </Button>
      <ReportIssueDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

type ReportIssueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { language, t } = useLanguage()
  const location = useLocation()
  const [createdIssue, setCreatedIssue] = useState<IssueReportResponse['issue'] | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: '', description: '' },
  })

  const reportMutation = useRestMutation<IssueReportResponse, IssueReportPayload>(
    { path: '/api/v1/issue_reports', method: 'POST' },
    {
      onSuccess: (data) => {
        setCreatedIssue(data.issue)
        reset()
      },
      onError: (error) => {
        setError('root', {
          message:
            error instanceof ApiError && error.status === 429
              ? 'Too many reports. Please wait a few minutes and try again.'
              : 'Could not send the report. Please try again.',
        })
      },
    },
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreatedIssue(null)
      clearErrors()
      reportMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit((values) => {
    clearErrors('root')
    reportMutation.mutate({
      issue_report: {
        ...values,
        page_url: `${location.pathname}${location.search}`,
        language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={t('Close')}>
        <DialogHeader>
          <DialogTitle>{t('Report an issue')}</DialogTitle>
          <DialogDescription>
            {t('Describe what went wrong. The current page and browser details are attached.')}
          </DialogDescription>
        </DialogHeader>

        {createdIssue ? (
          <div className="space-y-4">
            <p role="status">
              {t('Thanks! Your report was filed as issue')}{' '}
              <a
                href={createdIssue.url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground font-medium underline underline-offset-4"
              >
                #{createdIssue.number}
              </a>
              .
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {t('Close')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="issue-title">{t('Title')}</Label>
              <Input
                id="issue-title"
                autoComplete="off"
                maxLength={120}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? 'issue-title-error' : undefined}
                {...register('title')}
              />
              {errors.title ? (
                <p id="issue-title-error" className="text-danger text-sm">
                  {t(errors.title.message ?? '')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-description">{t('Description')}</Label>
              <Textarea
                id="issue-description"
                rows={6}
                className="max-h-80"
                placeholder={t('What did you do, what did you expect, and what happened?')}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={errors.description ? 'issue-description-error' : undefined}
                {...register('description')}
              />
              {errors.description ? (
                <p id="issue-description-error" className="text-danger text-sm">
                  {t(errors.description.message ?? '')}
                </p>
              ) : null}
            </div>

            {errors.root?.message ? (
              <p role="alert" className="text-danger text-sm">
                {t(errors.root.message)}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={reportMutation.isPending}>
                {reportMutation.isPending ? t('Sending…') : t('Send report')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
