import * as React from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type FilterOption = {
  value: string
  label: string
}

type FilterButtonProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  label: string
  options: FilterOption[]
  multiple?: boolean
  searchable?: boolean
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
}

function FilterButton({
  label,
  options,
  multiple = false,
  searchable = false,
  value,
  defaultValue,
  onValueChange,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  disabled,
  className,
  ...props
}: FilterButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string[]>(defaultValue ?? [])
  const selected = value ?? uncontrolledValue
  const selectedSet = new Set(selected)
  const selectedOptions = options.filter((option) => selectedSet.has(option.value))
  const hasSelection = selectedOptions.length > 0
  const displayLabel =
    multiple && hasSelection
      ? `${label} (${selectedOptions.length})`
      : !multiple && selectedOptions.length === 1
        ? selectedOptions[0].label
        : label
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = normalizedQuery
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(normalizedQuery) ||
          option.value.toLowerCase().includes(normalizedQuery),
      )
    : options

  const setSelection = (next: string[]) => {
    if (value === undefined) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  const toggleOption = (option: FilterOption) => {
    if (multiple) {
      setSelection(
        selectedSet.has(option.value)
          ? selected.filter((item) => item !== option.value)
          : [...selected, option.value],
      )
      return
    }

    setSelection(selectedSet.has(option.value) ? [] : [option.value])
    setOpen(false)
  }

  const clear = () => {
    setSelection([])
    setQuery('')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)

    if (!next) setQuery('')
  }

  return (
    <div data-slot="filter-button" className={cn('inline-flex items-center', className)} {...props}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${label} filter${
              hasSelection ? `, ${selectedOptions.length} selected` : ''
            }`}
            className={cn('justify-between gap-2', hasSelection && 'rounded-r-none border-r-0')}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-56 gap-0 p-0"
        >
          {searchable ? (
            <div className="border-b p-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Search ${label} options`}
                autoFocus
              />
            </div>
          ) : null}
          <div
            role="group"
            aria-label={`${label} options`}
            className="max-h-60 overflow-y-auto p-1"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedSet.has(option.value)

                if (multiple) {
                  return (
                    <label
                      key={option.value}
                      className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOption(option)}
                        aria-label={option.label}
                      />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </label>
                  )
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleOption(option)}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                      isSelected && 'bg-accent text-accent-foreground',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? <Check className="size-4" aria-hidden="true" /> : null}
                  </button>
                )
              })
            ) : (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">{emptyMessage}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasSelection ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={`Clear ${label} filter`}
          onClick={clear}
          className="rounded-l-none border-l-0"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

export { FilterButton, type FilterButtonProps, type FilterOption }
