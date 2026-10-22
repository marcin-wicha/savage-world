import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CharactersRoute() {
  return (
    <section>
      <h1 className="text-foreground text-4xl">Characters</h1>
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
