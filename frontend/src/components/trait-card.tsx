import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { traitCardSizes, type TraitCardSize } from '@/components/trait-card-sizes'
import { cn } from '@/lib/utils'

const descriptionMaxHeightClasses: Record<TraitCardSize, string> = {
  sm: 'max-h-28',
  md: 'max-h-48',
  lg: 'max-h-72',
}

type TraitCardEyebrowToggle = {
  offLabel: string
  onLabel: string
  pressed: boolean
  disabled?: boolean
  onToggle: () => void
}

type TraitCardProps = Omit<React.ComponentProps<'button'>, 'title'> & {
  title: string
  eyebrow?: string
  eyebrowToggle?: TraitCardEyebrowToggle
  description?: React.ReactNode
  headerContent?: React.ReactNode
  backgroundImage?: string
  size?: TraitCardSize
  selected?: boolean
}

function TraitCard({
  title,
  eyebrow,
  eyebrowToggle,
  description,
  headerContent,
  backgroundImage,
  size = 'md',
  selected = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}: TraitCardProps) {
  const { width, height } = traitCardSizes[size]
  const triggerRef = React.useRef<HTMLButtonElement>(null)

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
        disabled && 'opacity-50',
        className,
      )}
    >
      <div
        data-slot="trait-card-art"
        aria-hidden={eyebrowToggle ? undefined : true}
        className="absolute inset-0"
      >
        {backgroundImage ? (
          <img
            data-slot="trait-card-artwork"
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        ) : null}

        {eyebrow && eyebrowToggle ? (
          <div
            data-slot="trait-card-eyebrow-toggle"
            className="bg-background/90 text-foreground border-border/60 absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium tracking-[0.12em] uppercase backdrop-blur-sm"
          >
            <span
              className={cn('text-muted-foreground', !eyebrowToggle.pressed && 'text-foreground')}
            >
              {eyebrowToggle.offLabel}
            </span>
            <Switch
              checked={eyebrowToggle.pressed}
              disabled={eyebrowToggle.disabled ?? disabled}
              aria-label={`Set ${title} to ${(eyebrowToggle.pressed ? eyebrowToggle.offLabel : eyebrowToggle.onLabel).toLowerCase()}`}
              onCheckedChange={() => eyebrowToggle.onToggle()}
              onClick={(event) => event.stopPropagation()}
            />
            <span
              className={cn('text-muted-foreground', eyebrowToggle.pressed && 'text-foreground')}
            >
              {eyebrowToggle.onLabel}
            </span>
          </div>
        ) : eyebrow ? (
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
        className="border-border/60 bg-card pointer-events-none absolute inset-x-0 bottom-0 z-30 flex max-h-full flex-col overflow-hidden border-t"
      >
        <CardHeader className="bg-card sticky top-0 z-10 shrink-0 gap-0 px-4 py-3">
          <CardTitle className="font-display text-foreground block text-lg leading-tight">
            {title}
          </CardTitle>
          {headerContent ? (
            <div className="pointer-events-auto mt-2" onClick={(event) => event.stopPropagation()}>
              {headerContent}
            </div>
          ) : null}
        </CardHeader>
        {description ? (
          <div
            data-slot="trait-card-description"
            onClick={() => triggerRef.current?.click()}
            className={cn(
              'pointer-events-auto grid min-h-0 grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-300 ease-out group-focus-within/trait:grid-rows-[1fr] group-hover/trait:grid-rows-[1fr] motion-reduce:transition-none',
              descriptionMaxHeightClasses[size],
            )}
          >
            <div className="min-h-0 overflow-y-auto">
              <CardContent className="text-muted-foreground px-4 pt-0 pb-3 text-sm leading-5">
                {description}
              </CardContent>
            </div>
          </div>
        ) : null}
      </div>

      <button
        ref={triggerRef}
        type={type}
        data-slot="trait-card-trigger"
        aria-pressed={selected}
        aria-label={title}
        disabled={disabled}
        className="absolute inset-0 z-20 cursor-pointer rounded-xl outline-none disabled:cursor-default"
        {...props}
      />
    </Card>
  )
}

export { TraitCard, type TraitCardProps }
