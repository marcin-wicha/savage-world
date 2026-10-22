import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function HomeRoute() {
  return (
    <section className="max-w-2xl">
      <Badge variant="outline" className="tracking-[0.22em] uppercase">
        Savage Worlds Adventure Edition
      </Badge>
      <h1 className="text-foreground mt-5 text-5xl leading-none text-balance sm:text-6xl">
        Build your next legend.
      </h1>
      <p className="text-muted-foreground mt-5 text-lg leading-8">
        Create, validate, and advance Savage Worlds characters without losing track of the rules.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/characters">Start a character</Link>
      </Button>
    </section>
  )
}
