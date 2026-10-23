import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TraitCard, type TraitCardProps } from '@/components/trait-card'
import { traitCardSizes, type TraitCardSize } from '@/components/trait-card-sizes'
import { cn } from '@/lib/utils'

const traitCardBackImage = '/traits/back.png'
const traitCardRowGap = 16

function TraitCardBackArt({ className }: { className?: string }) {
  return (
    <img
      data-slot="trait-card-stack-back-art"
      src={traitCardBackImage}
      alt=""
      aria-hidden="true"
      className={cn('h-full w-full object-cover', className)}
    />
  )
}

type TraitCardStackTrait = Pick<
  TraitCardProps,
  | 'title'
  | 'eyebrow'
  | 'eyebrowToggle'
  | 'description'
  | 'backgroundImage'
  | 'selected'
  | 'disabled'
>

type TraitCardStackProps = Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> & {
  category: string
  traits: TraitCardStackTrait[]
  size?: TraitCardSize
  revealedCount?: number
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (trait: TraitCardStackTrait, index: number) => void
}

function TraitCardStack({
  category,
  traits,
  size = 'md',
  revealedCount = 3,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  className,
  ...props
}: TraitCardStackProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [page, setPage] = React.useState(0)
  const { width, height } = traitCardSizes[size]
  const pageSize =
    traits.length === 0 ? 0 : Math.min(Math.max(Math.floor(revealedCount), 1), traits.length)
  const pageCount = pageSize === 0 ? 0 : Math.ceil(traits.length / pageSize)
  const safePage = pageCount === 0 ? 0 : Math.min(page, pageCount - 1)
  const pageStart = safePage * pageSize
  const visibleTraits = traits.slice(pageStart, pageStart + pageSize)
  const rowWidth =
    pageSize > 0 ? pageSize * width + Math.max(pageSize - 1, 0) * traitCardRowGap : width

  const reveal = () => {
    if (open) return

    setOpen(true)
    onOpenChange?.(true)
  }

  const move = (delta: number) => {
    if (pageCount < 2) return

    setPage((current) => {
      const clamped = Math.min(current, pageCount - 1)

      return (clamped + delta + pageCount) % pageCount
    })
  }

  return (
    <div
      data-slot="trait-card-stack"
      data-open={open}
      style={{ width: open ? rowWidth : width, height }}
      className={cn(
        'relative transition-[width] duration-700 ease-out [perspective:1200px] motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      {!open ? (
        <>
          <Card
            aria-hidden="true"
            className="ring-foreground/25 dark:ring-foreground/45 absolute inset-0 translate-y-3 scale-[0.95] -rotate-6 gap-0 py-0 shadow-md ring-2"
          >
            <TraitCardBackArt className="opacity-80" />
          </Card>
          <Card
            aria-hidden="true"
            className="ring-foreground/25 dark:ring-foreground/45 absolute inset-0 translate-y-1.5 scale-[0.98] rotate-3 gap-0 py-0 shadow-sm ring-2"
          >
            <TraitCardBackArt className="opacity-90" />
          </Card>
        </>
      ) : null}

      <div
        data-slot="trait-card-stack-flip"
        className={cn(
          'relative z-10 h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none',
          open && '[transform:rotateY(180deg)]',
        )}
      >
        <div
          data-slot="trait-card-stack-back"
          inert={open}
          style={{ width }}
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 [backface-visibility:hidden]"
        >
          <button
            type="button"
            onClick={reveal}
            aria-label={`Reveal ${category} traits`}
            className="group/back focus-visible:ring-ring/50 bg-card text-card-foreground ring-foreground/25 dark:ring-foreground/45 relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl text-center shadow-md ring-2 transition-[transform,box-shadow] duration-200 outline-none hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.85)] focus-visible:ring-3"
          >
            <TraitCardBackArt className="absolute inset-0" />
            <span
              aria-hidden="true"
              className="border-border/60 absolute inset-2 rounded-lg border"
            />
            <span
              aria-hidden="true"
              className="border-border/30 absolute inset-3 rounded-md border"
            />
            <span className="bg-background border-border/60 font-display text-foreground relative z-10 rounded-lg border px-5 py-3 text-2xl tracking-wide shadow-sm">
              {category}
            </span>
          </button>
        </div>

        <div
          data-slot="trait-card-stack-front"
          inert={!open}
          className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]"
        >
          {open && visibleTraits.length > 0 ? (
            <div
              key={safePage}
              data-slot="trait-card-stack-row"
              className="animate-in fade-in zoom-in-95 flex h-full w-full items-center justify-center gap-4 duration-300 motion-reduce:animate-none"
            >
              {visibleTraits.map((trait, index) => (
                <TraitCard
                  key={`${pageStart + index}-${trait.title}`}
                  {...trait}
                  size={size}
                  onClick={onSelect ? () => onSelect(trait, pageStart + index) : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {open && pageCount > 1 ? (
        <>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous trait"
            onClick={() => move(-1)}
            className="bg-background/90 absolute top-1/2 -left-12 z-30 -translate-y-1/2 rounded-full backdrop-blur-sm"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next trait"
            onClick={() => move(1)}
            className="bg-background/90 absolute top-1/2 -right-12 z-30 -translate-y-1/2 rounded-full backdrop-blur-sm"
          >
            <ChevronRight />
          </Button>
        </>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {open && pageSize > 0
          ? `Cards ${pageStart + 1} to ${pageStart + visibleTraits.length} of ${traits.length}`
          : ''}
      </p>
    </div>
  )
}

export { TraitCardStack, type TraitCardStackProps, type TraitCardStackTrait }
