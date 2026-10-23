import * as React from 'react'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AutocompleteInputOption = {
  value: string
  label: string
}

type AutocompleteInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'onSelect'
> & {
  options: AutocompleteInputOption[]
  value: string
  onValueChange: (value: string) => void
}

function AutocompleteInput({
  options,
  value,
  onValueChange,
  className,
  id,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: AutocompleteInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`
  const [open, setOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const normalizedValue = value.trim().toLowerCase()
  const visibleOptions = normalizedValue
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedValue))
    : []
  const activeIndex =
    visibleOptions.length === 0 ? -1 : Math.min(highlightedIndex, visibleOptions.length - 1)
  const showListbox = open && visibleOptions.length > 0
  const optionId = (index: number) => `${inputId}-option-${index}`

  const selectOption = (option: AutocompleteInputOption) => {
    onValueChange(option.label)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.target.value)
    setOpen(event.target.value.trim().length > 0)
    setHighlightedIndex(-1)
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (value.trim()) setOpen(true)

    onFocus?.(event)
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setOpen(false)
    onBlur?.(event)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)

    if (event.defaultPrevented) return

    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    if (!showListbox) {
      if (event.key === 'ArrowDown' && normalizedValue && visibleOptions.length > 0) {
        event.preventDefault()
        setOpen(true)
      }

      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) =>
        current < 0 || current >= visibleOptions.length - 1 ? 0 : current + 1,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => (current <= 0 ? visibleOptions.length - 1 : current - 1))
      return
    }

    if (event.key === 'Enter') {
      const option = activeIndex >= 0 ? visibleOptions[activeIndex] : visibleOptions[0]

      if (option) {
        event.preventDefault()
        selectOption(option)
      }
    }
  }

  const clear = () => {
    onValueChange('')
    setOpen(false)
    setHighlightedIndex(-1)
  }

  return (
    <div data-slot="autocomplete-input" className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <Input
        {...props}
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showListbox}
        aria-controls={showListbox ? listboxId : undefined}
        aria-activedescendant={showListbox && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 outline-none focus-visible:ring-3"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
      {showListbox ? (
        <ul
          id={listboxId}
          role="listbox"
          data-slot="autocomplete-input-listbox"
          className="bg-popover text-popover-foreground ring-foreground/10 absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg p-1 text-sm shadow-md ring-1"
        >
          {visibleOptions.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              className={cn(
                'cursor-pointer rounded-md px-2 py-1.5',
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { AutocompleteInput, type AutocompleteInputOption, type AutocompleteInputProps }
