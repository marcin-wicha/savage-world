import * as React from 'react'
import { cn } from 'cn'
import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

const TouchTooltipContext = React.createContext(false)

function Tooltip({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const touchMode = window.matchMedia?.('(hover: none)').matches ?? false

  return (
    <TouchTooltipContext.Provider value={touchMode}>
      {touchMode ? (
        <PopoverPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {props.children}
        </PopoverPrimitive.Root>
      ) : (
        <TooltipPrimitive.Root
          data-slot="tooltip"
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          {...props}
        />
      )}
    </TouchTooltipContext.Provider>
  )
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const touchMode = React.useContext(TouchTooltipContext)
  return touchMode ? (
    <PopoverPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
  ) : (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const touchMode = React.useContext(TouchTooltipContext)
  const contentClassName = cn(
    'bg-foreground text-background data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 inline-flex w-fit max-w-[min(20rem,calc(100vw-2rem))] flex-col items-stretch origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-md px-3 py-1.5 text-xs break-words has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm',
    className,
  )
  const arrowClassName =
    'bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]'

  if (touchMode) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="tooltip-content"
          sideOffset={sideOffset}
          collisionPadding={16}
          className={contentClassName}
          {...props}
        >
          {children}
          <PopoverPrimitive.Arrow className={arrowClassName} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    )
  }

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={16}
        className={contentClassName}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={arrowClassName} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
