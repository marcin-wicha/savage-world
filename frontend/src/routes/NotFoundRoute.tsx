import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n-context'

export function NotFoundRoute() {
  const { t } = useLanguage()

  return (
    <section>
      <h1 className="text-foreground text-4xl">{t('Page not found')}</h1>
      <p className="text-muted-foreground mt-4">
        {t('The page you are looking for does not exist.')}
      </p>
      <Button asChild variant="link" className="mt-6 px-0">
        <Link to="/">{t('Return home')}</Link>
      </Button>
    </section>
  )
}
