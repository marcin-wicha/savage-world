import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CharactersRoute() {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-foreground text-4xl">Characters</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage the characters you have created.
          </p>
        </div>
        <Button asChild>
          <Link to="/characters/new">Create a character</Link>
        </Button>
      </div>

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>No characters yet</CardTitle>
          <CardDescription>
            Character creation and advancement will live here once the GraphQL API is connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            The design system is ready for forms, cards, and character sheets.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
