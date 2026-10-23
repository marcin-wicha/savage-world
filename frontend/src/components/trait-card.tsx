import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const traitCardSizes = {
  sm: { width: 160, height: 224 },
  md: { width: 224, height: 314 },
  lg: { width: 288, height: 403 },
} as const

type TraitCardSize = keyof typeof traitCardSizes

type TraitCardProps = Omit<React.ComponentProps<'button'>, 'title'> & {
  title: string
  eyebrow?: string
  description?: string
  backgroundImage?: string
  size?: TraitCardSize
  selected?: boolean
}

function TraitCard({
  title,
  eyebrow,
  description,
  backgroundImage,
  size = 'md',
  selected = false,
  className,
  type = 'button',
  ...props
}: TraitCardProps) {
  const { width, height } = traitCardSizes[size]

  return (
    <Card
      data-slot="trait-card"
      data-selected={selected}
      data-size={size}
      style={{ width, height }}
      className={cn(
        'group/trait focus-within:ring-ring/50 relative gap-0 overflow-hidden py-0 transition-[transform,box-shadow] duration-200 focus-within:ring-3',
        'hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.85)]',
        selected && 'ring-primary/40 -translate-y-0.5 ring-3',
        'has-[button:disabled]:opacity-50',
        className,
      )}
    >
      <div data-slot="trait-card-art" aria-hidden="true" className="absolute inset-0">
        {backgroundImage ? (
          <img
            data-slot="trait-card-artwork"
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}

        {eyebrow ? (
          <Badge
            variant="outline"
            className="bg-background/90 text-foreground border-border/60 absolute top-3 left-3 z-10 tracking-[0.18em] uppercase backdrop-blur-sm"
          >
            {eyebrow}
          </Badge>
        ) : null}
      </div>

      <div
        data-slot="trait-card-footer"
        className="border-border/60 bg-card absolute inset-x-0 bottom-0 z-10 border-t"
      >
        <CardHeader className="gap-0 px-4 py-3">
          <CardTitle className="font-display text-foreground block text-lg leading-tight">
            {title}
          </CardTitle>
        </CardHeader>
        {description ? (
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-focus-within/trait:grid-rows-[1fr] group-hover/trait:grid-rows-[1fr] motion-reduce:transition-none">
            <div className="overflow-hidden">
              <CardContent className="text-muted-foreground px-4 pt-0 pb-3 text-sm leading-5">
                {description}
              </CardContent>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type={type}
        data-slot="trait-card-trigger"
        aria-pressed={selected}
        aria-label={title}
        className="absolute inset-0 z-20 cursor-pointer rounded-xl outline-none disabled:cursor-default"
        {...props}
      />
    </Card>
  )
}

export { TraitCard, type TraitCardProps, type TraitCardSize }
