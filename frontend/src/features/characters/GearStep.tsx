import { useEffect, useMemo, useState } from 'react'
import { Coins, Minus, PackageOpen, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'

import { AutocompleteInput } from '@/components/autocomplete-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GearDocument, type GearCategory, type GearQuery } from '@/graphql/generated/graphql'
import { useGraphqlInfiniteQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

import type { CharacterFormValues } from './character-form'

const startingMoney = 300
const allCategories = 'all' as const
type GearCategoryFilter = GearCategory | typeof allCategories
type GearItem = NonNullable<NonNullable<GearQuery['gear']['nodes']>[number]>

type JsonObject = Record<string, unknown>

const categoryLabels: Record<GearCategory, string> = {
  alchemical_item: 'Alchemical',
  ammunition: 'Ammunition',
  animal: 'Animals',
  armor: 'Armor',
  barding: 'Barding',
  black_powder_weapon: 'Black powder',
  cannon: 'Cannons',
  clothing: 'Clothing',
  food: 'Food & drink',
  general: 'General gear',
  hireling: 'Hirelings',
  lifestyle: 'Lifestyle',
  lodging: 'Lodging',
  material: 'Materials',
  melee_weapon: 'Melee weapons',
  pack: 'Packs',
  poison: 'Poisons',
  ranged_weapon: 'Ranged weapons',
  shield: 'Shields',
  siege_engine: 'Siege engines',
  travel: 'Travel',
}

const categoryOrder: GearCategory[] = [
  'general',
  'melee_weapon',
  'ranged_weapon',
  'armor',
  'shield',
  'ammunition',
  'alchemical_item',
  'pack',
  'food',
  'clothing',
  'animal',
  'travel',
  'lodging',
  'poison',
  'material',
  'barding',
  'black_powder_weapon',
  'cannon',
  'siege_engine',
  'hireling',
  'lifestyle',
]

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(displayValue).join(', ')

  if (isJsonObject(value)) {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${displayLabel(key)}: ${displayValue(nestedValue)}`)
      .join(', ')
  }

  return ''
}

function effectEntries(item: GearItem) {
  if (!isJsonObject(item.effects)) return []

  return Object.entries(item.effects).filter(([, value]) => displayValue(value).length > 0)
}

function requirementLabels(item: GearItem) {
  if (!Array.isArray(item.requirements)) return []

  return item.requirements.flatMap((requirement) => {
    if (!isJsonObject(requirement)) return []

    const text = typeof requirement.text === 'string' ? requirement.text : undefined
    const value = requirement.value === undefined ? undefined : displayValue(requirement.value)
    const kind = typeof requirement.kind === 'string' ? displayLabel(requirement.kind) : undefined

    return [text ?? (value ? `${kind ?? 'Requirement'}: ${value}` : (kind ?? 'Requirement'))]
  })
}

function formatMoney(amount: number) {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatCost(item: GearItem) {
  if (item.cost === null || item.cost_text === '—') return 'No listed price'
  if (/^[\d,.]+(?:\+|\/.*)?$/.test(item.cost_text)) return `$${item.cost_text}`
  if (/^\d+(?:\.\d+)?$/.test(item.cost_text)) return formatMoney(item.cost)

  return item.cost_text
}

function GearMoneyBalance({ spent }: { spent: number }) {
  const remaining = startingMoney - spent
  const progress = Math.min((spent / startingMoney) * 100, 100)

  return (
    <div
      data-slot="gear-money-balance"
      role="status"
      aria-live="polite"
      className={cn(
        'border-border bg-muted/20 grid gap-3 rounded-lg border p-4',
        remaining < 0 && 'border-destructive/60',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-foreground text-background mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
            <Coins className="size-4" aria-hidden="true" />
          </span>
          <div className="grid gap-1">
            <p className="text-foreground text-sm font-medium">Starting funds</p>
            <p className="text-muted-foreground text-xs leading-5">
              Buy what your character can carry into the adventure.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.16em] uppercase">
            left
          </p>
          <p
            data-slot="gear-money-remaining"
            className={cn('text-foreground text-xl font-semibold', remaining < 0 && 'text-danger')}
          >
            {formatMoney(remaining)}
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Starting money spent"
        aria-valuemin={0}
        aria-valuemax={startingMoney}
        aria-valuenow={Math.min(spent, startingMoney)}
        aria-valuetext={`${formatMoney(spent)} of ${formatMoney(startingMoney)} spent`}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <div
          className={cn(
            'bg-primary h-full rounded-full transition-[width] duration-300',
            remaining < 0 && 'bg-danger',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatMoney(spent)} spent</span>
        <span>{formatMoney(startingMoney)} starting</span>
      </div>
    </div>
  )
}

function GearArtwork({ item }: { item: GearItem }) {
  const artworkUrl = item.artwork_url || `/gear/${item.slug}.webp`

  return (
    <div className="bg-card pb-4">
      <img
        data-slot="gear-artwork"
        src={artworkUrl}
        alt=""
        className="h-32 w-full object-cover"
        onError={(event) => {
          event.currentTarget.hidden = true
        }}
      />
    </div>
  )
}

function GearEffects({ item, limit }: { item: GearItem; limit?: number }) {
  const entries = effectEntries(item)
  const visibleEntries = limit ? entries.slice(0, limit) : entries

  if (visibleEntries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleEntries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="max-w-full font-normal">
          <span className="text-muted-foreground">{displayLabel(key)}:</span>{' '}
          <span className="truncate">{displayValue(value)}</span>
        </Badge>
      ))}
      {limit && entries.length > visibleEntries.length ? (
        <Badge variant="ghost">+{entries.length - visibleEntries.length} more</Badge>
      ) : null}
    </div>
  )
}

function GearDetails({
  item,
  onAdd,
  canAdd,
}: {
  item: GearItem
  onAdd: () => void
  canAdd: boolean
}) {
  const requirements = requirementLabels(item)

  return (
    <Card data-slot="gear-details" className="overflow-hidden">
      <GearArtwork item={item} />
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2">
              {categoryLabels[item.category]}
            </Badge>
            <CardTitle className="font-display text-xl">{item.name}</CardTitle>
          </div>
          <p className="text-foreground shrink-0 text-lg font-semibold">{formatCost(item)}</p>
        </div>
        <CardDescription>
          {item.source_book} · page {item.source_page}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {item.description ? (
          <p className="text-muted-foreground text-sm leading-6">{item.description}</p>
        ) : null}
        {requirements.length > 0 ? (
          <div className="grid gap-2">
            <h4 className="text-foreground text-xs font-semibold tracking-[0.16em] uppercase">
              Requirements
            </h4>
            <ul className="text-muted-foreground grid gap-1 text-sm">
              {requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {effectEntries(item).length > 0 ? (
          <div className="grid gap-2">
            <h4 className="text-foreground text-xs font-semibold tracking-[0.16em] uppercase">
              Rules
            </h4>
            <GearEffects item={item} />
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button type="button" className="w-full" onClick={onAdd} disabled={!canAdd}>
          <Plus aria-hidden="true" />
          {item.cost === null ? 'Price unavailable' : canAdd ? 'Add to pack' : 'Not enough money'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export function GearStep() {
  const form = useFormContext<CharacterFormValues>()
  const quantities = useWatch({ control: form.control, name: 'gear' }) ?? {}
  const [category, setCategory] = useState<GearCategoryFilter>(allCategories)
  const [search, setSearch] = useState('')
  const [activeGearId, setActiveGearId] = useState<string | null>(null)
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGraphqlInfiniteQuery<GearQuery>(
      ['gear'],
      GearDocument,
      (after) => ({ first: 20, after }),
      (page) => (page.gear.pageInfo.hasNextPage ? page.gear.pageInfo.endCursor : null),
    )
  const isLoadingAll = isPending || hasNextPage || isFetchingNextPage

  useEffect(() => {
    if (!isError && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage])

  const gear = useMemo(
    () =>
      (data?.pages ?? [])
        .flatMap((page) => page.gear.nodes ?? [])
        .flatMap((item) => (item ? [item] : [])),
    [data?.pages],
  )
  const gearById = useMemo(() => new Map(gear.map((item) => [item.id, item])), [gear])
  const normalizedSearch = search.trim().toLowerCase()
  const filteredGear = gear.filter((item) => {
    const matchesCategory = category === allCategories || item.category === category
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.description?.toLowerCase().includes(normalizedSearch) ||
      categoryLabels[item.category].toLowerCase().includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })
  const searchOptions = gear.map((item) => ({ value: item.id, label: item.name }))
  const activeItem = gearById.get(activeGearId ?? '') ?? filteredGear[0]
  const selectedItems = Object.entries(quantities).flatMap(([id, quantity]) => {
    const item = gearById.get(id)

    return item ? [{ item, quantity }] : []
  })
  const spent = selectedItems.reduce(
    (total, { item, quantity }) => total + (item.cost ?? 0) * quantity,
    0,
  )

  const setQuantity = (item: GearItem, quantity: number) => {
    const nextQuantities = { ...quantities }

    if (quantity > 0) {
      nextQuantities[item.id] = quantity
    } else {
      delete nextQuantities[item.id]
    }

    form.setValue('gear', nextQuantities, { shouldDirty: true, shouldTouch: true })
  }

  const addItem = (item: GearItem) => {
    if (item.cost === null) return

    const currentQuantity = quantities[item.id] ?? 0
    if (spent + item.cost > startingMoney) return

    setQuantity(item, currentQuantity + 1)
  }

  const categoryOptions: { value: GearCategoryFilter; label: string }[] = [
    { value: allCategories, label: 'All gear' },
    ...categoryOrder.map((value) => ({ value, label: categoryLabels[value] })),
  ]

  return (
    <div className="grid gap-6">
      <div className="grid max-w-2xl gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-muted-foreground size-5" aria-hidden="true" />
          <h2 className="text-foreground text-xl font-medium">Visit the gear shop</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-6">
          Browse the catalog, inspect the rules, and assemble a useful pack without spending more
          than your starting funds.
        </p>
      </div>

      <GearMoneyBalance spent={spent} />

      <div className="grid gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <AutocompleteInput
              aria-label="Search gear"
              options={searchOptions}
              value={search}
              onValueChange={setSearch}
              placeholder="Search gear, weapons, armor…"
              className="w-full max-w-xl"
            />
          </div>
          {!isLoadingAll && !isError ? (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {filteredGear.length} {filteredGear.length === 1 ? 'item' : 'items'}
            </p>
          ) : null}
        </div>
        <div
          role="tablist"
          aria-label="Gear categories"
          className="border-border flex flex-wrap gap-1 border-b pb-2"
        >
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={category === option.value}
              onClick={() => setCategory(option.value)}
              className={cn(
                'text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors',
                category === option.value && 'bg-primary text-primary-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoadingAll ? (
        <p className="text-muted-foreground text-sm">Loading the shop catalog…</p>
      ) : null}

      {isError ? (
        <p className="text-danger text-sm" role="alert">
          Could not load gear. Try again.
        </p>
      ) : null}

      {!isLoadingAll && !isError && filteredGear.length === 0 ? (
        <p className="text-muted-foreground text-sm">No gear matches this search or category.</p>
      ) : null}

      {!isLoadingAll && !isError && filteredGear.length > 0 ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {filteredGear.map((item) => {
              const quantity = quantities[item.id] ?? 0
              const canAdd = item.cost !== null && spent + item.cost <= startingMoney

              return (
                <Card
                  key={item.id}
                  data-slot="gear-shop-item"
                  data-selected={activeItem?.id === item.id || quantity > 0}
                  className={cn(
                    'mb-4 break-inside-avoid overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
                    activeItem?.id === item.id && 'ring-primary/50 ring-2',
                  )}
                >
                  <button
                    type="button"
                    aria-label={`View details for ${item.name}`}
                    aria-pressed={activeItem?.id === item.id}
                    onClick={() => setActiveGearId(item.id)}
                    className="focus-visible:ring-ring/50 block w-full text-left outline-none focus-visible:ring-3"
                  >
                    <GearArtwork item={item} />
                    <CardHeader className="gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="font-display text-lg leading-tight">
                          {item.name}
                        </CardTitle>
                        {quantity > 0 ? <Badge>{quantity} in pack</Badge> : null}
                      </div>
                      <CardDescription>{categoryLabels[item.category]}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 pt-0">
                      <p className="text-muted-foreground line-clamp-3 min-h-15 text-sm leading-5">
                        {item.description ?? 'Select this item to inspect its available rules.'}
                      </p>
                      <GearEffects item={item} limit={3} />
                    </CardContent>
                  </button>
                  <CardFooter className="flex items-center justify-between gap-3">
                    <p className="text-foreground text-sm font-semibold">{formatCost(item)}</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addItem(item)}
                      disabled={!canAdd}
                      aria-label={`Add ${item.name} to pack`}
                    >
                      <Plus aria-hidden="true" />
                      Add
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <aside className="grid content-start gap-4 lg:sticky lg:top-4">
            {activeItem ? (
              <GearDetails
                item={activeItem}
                onAdd={() => addItem(activeItem)}
                canAdd={activeItem.cost !== null && spent + activeItem.cost <= startingMoney}
              />
            ) : null}

            <Card data-slot="gear-pack">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-xl">Your pack</CardTitle>
                    <CardDescription>
                      {selectedItems.length === 0
                        ? 'Nothing selected yet.'
                        : `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} selected`}
                    </CardDescription>
                  </div>
                  <PackageOpen className="text-muted-foreground size-5" aria-hidden="true" />
                </div>
              </CardHeader>
              {selectedItems.length > 0 ? (
                <CardContent className="grid gap-2">
                  {selectedItems.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="border-border flex items-center gap-2 border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatMoney((item.cost ?? 0) * quantity)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => setQuantity(item, quantity - 1)}
                      >
                        <Minus aria-hidden="true" />
                      </Button>
                      <span className="text-foreground w-5 text-center text-sm">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={`Add one ${item.name}`}
                        disabled={item.cost === null || spent + item.cost > startingMoney}
                        onClick={() => addItem(item)}
                      >
                        <Plus aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setQuantity(item, 0)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              ) : null}
              <CardFooter className="justify-between">
                <span className="text-muted-foreground text-sm">Pack total</span>
                <span className="text-foreground font-semibold">{formatMoney(spent)}</span>
              </CardFooter>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
