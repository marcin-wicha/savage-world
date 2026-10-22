import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundRoute() {
  return (
    <section>
      <h1 className="text-foreground text-4xl">Page not found</h1>
      <p className="text-muted-foreground mt-4">The page you are looking for does not exist.</p>
      <Button asChild variant="link" className="mt-6 px-0">
        <Link to="/">Return home</Link>
      </Button>
    </section>
  )
}
