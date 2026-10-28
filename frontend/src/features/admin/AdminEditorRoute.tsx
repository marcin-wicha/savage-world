import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { FilterButton } from '@/components/filter-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { useRestMutation, useRestQuery } from '@/lib/queries'
import { useLanguage } from '@/lib/i18n-context'
import { cn } from '@/lib/utils'

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type AdminRecord = Record<string, JsonValue>

type ResourceSummary = {
  key: string
  label: string
  count: number
}

type ReferenceDataResponse = {
  resources: ResourceSummary[]
}

type RecordsResponse = {
  resource: string
  records: AdminRecord[]
}

type FieldKind = 'text' | 'textarea' | 'number' | 'json' | 'select'

type FieldOption = {
  value: string
  label: string
}

type FieldDefinition = {
  key: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: FieldOption[]
}

type AdminFormValues = Record<string, string>

type ResourceMutationVariables = {
  record: AdminRecord
}

type DeleteMutationVariables = {
  id: string
}

const sourceBookOptions: FieldOption[] = [
  { value: 'SWADE', label: 'SWADE' },
  { value: 'Fantasy Companion', label: 'Fantasy Companion' },
]

const resourceFieldDefinitions: Record<string, FieldDefinition[]> = {
  origins: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    { key: 'description', label: 'Description', kind: 'textarea', required: true },
  ],
  hindrances: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    {
      key: 'severity',
      label: 'Severity',
      kind: 'select',
      required: true,
      options: [
        { value: 'minor', label: 'Minor' },
        { value: 'major', label: 'Major' },
        { value: 'minor_or_major', label: 'Minor or major' },
      ],
    },
    { key: 'requirements', label: 'Requirements', kind: 'json', required: true },
    {
      key: 'source_book',
      label: 'Source book',
      kind: 'select',
      required: true,
      options: sourceBookOptions,
    },
    { key: 'source_page', label: 'Source page', kind: 'number', required: true },
    { key: 'description', label: 'Description', kind: 'textarea' },
  ],
  edges: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    {
      key: 'category',
      label: 'Category',
      kind: 'select',
      required: true,
      options: [
        { value: 'background', label: 'Background' },
        { value: 'combat', label: 'Combat' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'legendary', label: 'Legendary' },
        { value: 'power', label: 'Power' },
        { value: 'professional', label: 'Professional' },
        { value: 'social', label: 'Social' },
        { value: 'weird', label: 'Weird' },
      ],
    },
    {
      key: 'minimum_rank',
      label: 'Minimum rank',
      kind: 'select',
      required: true,
      options: [
        { value: 'novice', label: 'Novice' },
        { value: 'seasoned', label: 'Seasoned' },
        { value: 'veteran', label: 'Veteran' },
        { value: 'heroic', label: 'Heroic' },
        { value: 'legendary', label: 'Legendary' },
      ],
    },
    { key: 'requirements', label: 'Requirements', kind: 'json', required: true },
    {
      key: 'source_book',
      label: 'Source book',
      kind: 'select',
      required: true,
      options: sourceBookOptions,
    },
    { key: 'source_page', label: 'Source page', kind: 'number', required: true },
    {
      key: 'repeatable',
      label: 'Repeatable',
      kind: 'select',
      required: true,
      options: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ],
    },
    { key: 'description', label: 'Description', kind: 'textarea' },
  ],
  skills: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    {
      key: 'linked_attribute',
      label: 'Linked attribute',
      kind: 'select',
      required: true,
      options: [
        { value: 'agility', label: 'Agility' },
        { value: 'smarts', label: 'Smarts' },
        { value: 'spirit', label: 'Spirit' },
        { value: 'strength', label: 'Strength' },
        { value: 'vigor', label: 'Vigor' },
      ],
    },
    {
      key: 'core',
      label: 'Core skill',
      kind: 'select',
      required: true,
      options: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ],
    },
    {
      key: 'source_book',
      label: 'Source book',
      kind: 'select',
      required: true,
      options: sourceBookOptions,
    },
    { key: 'source_page', label: 'Source page', kind: 'number', required: true },
    { key: 'description', label: 'Description', kind: 'textarea' },
  ],
  powers: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    {
      key: 'rank',
      label: 'Rank',
      kind: 'select',
      required: true,
      options: [
        { value: 'novice', label: 'Novice' },
        { value: 'seasoned', label: 'Seasoned' },
        { value: 'veteran', label: 'Veteran' },
        { value: 'heroic', label: 'Heroic' },
        { value: 'legendary', label: 'Legendary' },
      ],
    },
    { key: 'power_points', label: 'Power points', kind: 'text', required: true },
    { key: 'duration', label: 'Duration', kind: 'text', required: true },
    { key: 'range', label: 'Range', kind: 'text', required: true },
    { key: 'summary', label: 'Summary', kind: 'textarea', required: true },
    {
      key: 'source_book',
      label: 'Source book',
      kind: 'select',
      required: true,
      options: sourceBookOptions,
    },
    { key: 'source_page', label: 'Source page', kind: 'number', required: true },
  ],
  gear: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'slug', label: 'Slug', kind: 'text' },
    {
      key: 'category',
      label: 'Category',
      kind: 'select',
      required: true,
      options: [
        'general',
        'animal',
        'food',
        'clothing',
        'pack',
        'lifestyle',
        'hireling',
        'lodging',
        'travel',
        'material',
        'poison',
        'armor',
        'shield',
        'barding',
        'melee_weapon',
        'ammunition',
        'ranged_weapon',
        'black_powder_weapon',
        'cannon',
        'siege_engine',
        'alchemical_item',
      ].map((value) => ({ value, label: humanize(value) })),
    },
    { key: 'cost', label: 'Cost', kind: 'number' },
    { key: 'cost_text', label: 'Cost display', kind: 'text' },
    { key: 'requirements', label: 'Requirements', kind: 'json', required: true },
    { key: 'effects', label: 'Effects', kind: 'json', required: true },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'artwork_url', label: 'Artwork URL', kind: 'text' },
    {
      key: 'source_book',
      label: 'Source book',
      kind: 'select',
      required: true,
      options: [{ value: 'Fantasy Companion', label: 'Fantasy Companion' }],
    },
    { key: 'source_page', label: 'Source page', kind: 'number', required: true },
  ],
}

const systemFields = new Set(['id', 'created_at', 'updated_at'])

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function resourceDefinitionKey(resourceKey: string) {
  return resourceKey === 'gears' ? 'gear' : resourceKey
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  return typeof value === 'object' && value !== null && Object.values(value).every(isJsonValue)
}

function fieldFromRecord(key: string, value: JsonValue | undefined): FieldDefinition {
  const kind: FieldKind =
    Array.isArray(value) || (value !== undefined && isObject(value))
      ? 'json'
      : typeof value === 'number'
        ? 'number'
        : 'text'

  return { key, label: humanize(key), kind }
}

function fieldsForResource(resourceKey: string, records: AdminRecord[]) {
  const knownFields = resourceFieldDefinitions[resourceDefinitionKey(resourceKey)] ?? []
  const knownKeys = new Set(knownFields.map((field) => field.key))
  const extraFields = [...new Set(records.flatMap((record) => Object.keys(record)))]
    .filter((key) => !systemFields.has(key) && !knownKeys.has(key))
    .map((key) => fieldFromRecord(key, records.find((record) => key in record)?.[key]))

  return [...knownFields, ...extraFields]
}

function valueAsString(value: JsonValue | undefined, field: FieldDefinition) {
  if (value == null) {
    return field.kind === 'json' ? (field.key === 'effects' ? '{}' : '[]') : ''
  }

  if (field.kind === 'json') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function defaultValues(fields: FieldDefinition[], record?: AdminRecord): AdminFormValues {
  return Object.fromEntries(
    fields.map((field) => [field.key, valueAsString(record?.[field.key], field)]),
  )
}

function displayValue(value: JsonValue | undefined) {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function buildSchema(fields: FieldDefinition[]) {
  return z.record(z.string(), z.string()).superRefine((values, context) => {
    fields.forEach((field) => {
      const value = values[field.key]?.trim() ?? ''

      if (field.required && !value) {
        context.addIssue({
          code: 'custom',
          path: [field.key],
          message: `${field.label} is required.`,
        })
      }

      if (field.kind === 'number' && value && Number.isNaN(Number(value))) {
        context.addIssue({
          code: 'custom',
          path: [field.key],
          message: `${field.label} must be a number.`,
        })
      }

      if (field.kind === 'json' && value) {
        try {
          JSON.parse(value)
        } catch {
          context.addIssue({
            code: 'custom',
            path: [field.key],
            message: `${field.label} must be valid JSON.`,
          })
        }
      }
    })
  })
}

function serializeRecord(values: AdminFormValues, fields: FieldDefinition[]): AdminRecord {
  const record: AdminRecord = {}

  fields.forEach((field) => {
    const value = values[field.key]?.trim() ?? ''

    if (!value && (field.kind === 'number' || !field.required)) {
      record[field.key] = null
      return
    }

    if (field.kind === 'number') {
      record[field.key] = Number(value)
    } else if (field.kind === 'json') {
      const parsed: unknown = JSON.parse(value)
      if (!isJsonValue(parsed)) throw new Error(`${field.label} must be valid JSON.`)
      record[field.key] = parsed
    } else if (field.kind === 'select' && (field.key === 'core' || field.key === 'repeatable')) {
      record[field.key] = value === 'true'
    } else {
      record[field.key] = value
    }
  })

  return record
}

function mutationErrorMessage(error: Error) {
  if (!(error instanceof ApiError)) return error.message

  if (error.payload && typeof error.payload === 'object' && 'details' in error.payload) {
    const details = error.payload.details
    if (details && typeof details === 'object') {
      const messages = Object.values(details).flatMap((value) =>
        Array.isArray(value)
          ? value.filter((message): message is string => typeof message === 'string')
          : [],
      )
      if (messages.length > 0) return messages.join(' ')
    }
  }

  return error.message
}

type RecordFieldProps = {
  field: FieldDefinition
  register: UseFormRegister<AdminFormValues>
  message?: string
}

function RecordField({ field, register, message }: RecordFieldProps) {
  const { t } = useLanguage()
  const fieldId = `admin-${field.key}`
  const commonProps = {
    id: fieldId,
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? `${fieldId}-error` : undefined,
    ...register(field.key),
  }

  return (
    <div
      className={cn(
        'space-y-2',
        field.kind === 'textarea' || field.kind === 'json' ? 'md:col-span-2' : '',
      )}
    >
      <Label htmlFor={fieldId}>{t(field.label)}</Label>
      {field.kind === 'textarea' || field.kind === 'json' ? (
        <Textarea
          {...commonProps}
          rows={field.kind === 'json' ? 6 : 4}
          spellCheck={field.kind !== 'json'}
        />
      ) : field.kind === 'select' ? (
        <select
          {...commonProps}
          className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
        >
          {!field.required ? <option value="">{t('Not set')}</option> : null}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
      ) : (
        <Input {...commonProps} type={field.kind === 'number' ? 'number' : 'text'} step="any" />
      )}
      {message ? (
        <p id={`${fieldId}-error`} className="text-danger text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}

export function AdminEditorRoute() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState('')
  const [editingRecord, setEditingRecord] = useState<AdminRecord | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [recordFilters, setRecordFilters] = useState<Record<string, string[]>>({})
  const referenceData = useRestQuery<ReferenceDataResponse>(
    ['admin-reference-data'],
    '/api/v1/admin/reference_data',
  )
  const resources = useMemo(() => referenceData.data?.resources ?? [], [referenceData.data])
  const activeKey =
    selectedKey && resources.some((resource) => resource.key === selectedKey)
      ? selectedKey
      : (resources[0]?.key ?? '')
  const recordsQuery = useRestQuery<RecordsResponse>(
    ['admin-records', activeKey],
    activeKey ? `/api/v1/admin/${encodeURIComponent(activeKey)}` : '/api/v1/admin/records',
    { enabled: Boolean(activeKey) },
  )
  const records = useMemo(() => recordsQuery.data?.records ?? [], [recordsQuery.data])
  const fields = useMemo(() => fieldsForResource(activeKey, records), [activeKey, records])
  const categoricalFields = fields.filter((field) => field.kind === 'select')
  const normalizedSearch = search.trim().toLowerCase()
  const visibleRecords = records.filter((record) => {
    const matchesSearch =
      !normalizedSearch ||
      Object.values(record).some((value) =>
        displayValue(value).toLowerCase().includes(normalizedSearch),
      )
    const matchesFilters = categoricalFields.every((field) => {
      const selected = recordFilters[field.key] ?? []
      return selected.length === 0 || selected.includes(displayValue(record[field.key]))
    })
    return matchesSearch && matchesFilters
  })
  const formSchema = useMemo(() => buildSchema(fields), [fields])
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(fields),
    mode: 'onTouched',
  })

  useEffect(() => {
    form.reset(defaultValues(fields, editingRecord))
  }, [activeKey, editingRecord, fields, form])

  const invalidateRecords = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-records', activeKey] })
  }
  const closeForm = () => {
    setEditingRecord(undefined)
    setFormOpen(false)
  }
  const handleMutationError = (error: Error) => {
    form.setError('root', { type: 'server', message: mutationErrorMessage(error) })
  }
  const handleSaveSuccess = () => {
    invalidateRecords()
    closeForm()
  }
  const createMutation = useRestMutation<unknown, ResourceMutationVariables>(
    { path: `/api/v1/admin/${encodeURIComponent(activeKey)}`, method: 'POST' },
    { onSuccess: handleSaveSuccess, onError: handleMutationError },
  )
  const updateMutation = useRestMutation<unknown, ResourceMutationVariables>(
    {
      path: `/api/v1/admin/${encodeURIComponent(activeKey)}/${encodeURIComponent(String(editingRecord?.id ?? ''))}`,
      method: 'PATCH',
    },
    { onSuccess: handleSaveSuccess, onError: handleMutationError },
  )
  const deleteMutation = useRestMutation<void, DeleteMutationVariables>(
    {
      path: ({ id }) => `/api/v1/admin/${encodeURIComponent(activeKey)}/${encodeURIComponent(id)}`,
      method: 'DELETE',
    },
    {
      onSuccess: invalidateRecords,
      onError: (error) => setDeleteError(mutationErrorMessage(error)),
    },
  )
  const isSaving = createMutation.isPending || updateMutation.isPending
  const selectedResource = resources.find((resource) => resource.key === activeKey)
  const tableFields = fields

  const chooseResource = (key: string) => {
    setSelectedKey(key)
    setSearch('')
    setRecordFilters({})
    setEditingRecord(undefined)
    setFormOpen(false)
    setDeleteError(undefined)
  }

  const openCreate = () => {
    form.clearErrors()
    setEditingRecord(undefined)
    setFormOpen(true)
  }

  const openEdit = (record: AdminRecord) => {
    form.clearErrors()
    setEditingRecord(record)
    setFormOpen(true)
  }

  const deleteRecord = (record: AdminRecord) => {
    const id = record.id
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      !window.confirm(`Delete ${displayValue(record.name)}?`)
    ) {
      return
    }

    setDeleteError(undefined)
    deleteMutation.mutate({ id: String(id) })
  }

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root')
    let record: AdminRecord
    try {
      record = serializeRecord(values, fields)
    } catch (error) {
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Could not prepare this record.',
      })
      return
    }

    if (editingRecord) {
      updateMutation.mutate({ record })
    } else {
      createMutation.mutate({ record })
    }
  })

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[0.65rem] font-medium tracking-[0.22em] uppercase">
            {t('Administration')}
          </p>
          <h1 className="text-foreground text-4xl">{t('Reference data')}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {t('Maintain the rules and catalog entries used by the character builder.')}
          </p>
        </div>
        {selectedResource ? (
          <Button type="button" onClick={openCreate} disabled={recordsQuery.isPending}>
            {t('Add')} {t(selectedResource.label.replace(/s$/, ''))}
          </Button>
        ) : null}
      </div>

      {referenceData.isPending ? (
        <p className="text-muted-foreground" role="status">
          {t('Loading resources…')}
        </p>
      ) : null}
      {referenceData.isError ? (
        <p className="text-danger" role="alert">
          {t('Could not load reference data. Try again.')}
        </p>
      ) : null}

      {!referenceData.isPending && !referenceData.isError ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          aria-label={t('Reference resources')}
        >
          {resources.map((resource) => (
            <button
              key={resource.key}
              type="button"
              aria-pressed={resource.key === activeKey}
              onClick={() => chooseResource(resource.key)}
              className={cn(
                'border-border bg-card text-card-foreground hover:bg-muted rounded-xl border p-4 text-left transition-colors',
                resource.key === activeKey ? 'border-foreground ring-foreground ring-1' : '',
              )}
            >
              <span className="block font-medium">{t(resource.label)}</span>
              <span className="text-muted-foreground mt-1 block text-sm">
                {resource.count} {t('records')}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedResource ? (
        <Card>
          <CardHeader>
            <CardTitle>{t(selectedResource.label)}</CardTitle>
            <CardDescription>
              {recordsQuery.isPending
                ? t('Loading records…')
                : `${visibleRecords.length} ${t('of')} ${records.length} ${t('records shown.')}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recordsQuery.isError ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                  aria-label={`${t('Search')} ${t(selectedResource.label)}`}
                  placeholder={`${t('Search')} ${t(selectedResource.label.toLowerCase())}…`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="max-w-sm"
                />
                {categoricalFields.map((field) => {
                  const options = Array.from(
                    new Set(records.map((record) => displayValue(record[field.key]))),
                  )
                    .filter((value) => value.length > 0)
                    .sort((left, right) => left.localeCompare(right))
                    .map((value) => ({ value, label: value }))
                  return options.length > 1 ? (
                    <FilterButton
                      key={field.key}
                      label={field.label}
                      options={options}
                      value={recordFilters[field.key] ?? []}
                      onValueChange={(value) =>
                        setRecordFilters((current) => ({ ...current, [field.key]: value }))
                      }
                    />
                  ) : null
                })}
              </div>
            ) : null}
            {recordsQuery.isError ? (
              <p className="text-danger" role="alert">
                {t('Could not load')} {t(selectedResource.label.toLowerCase())}.
              </p>
            ) : records.length === 0 && !recordsQuery.isPending ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {t('No records have been added yet.')}
                </p>
                <Button type="button" variant="outline" onClick={openCreate}>
                  {t('Add the first record')}
                </Button>
              </div>
            ) : visibleRecords.length === 0 && !recordsQuery.isPending ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {t('No records match the current search and filters.')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl text-left text-sm">
                  <thead className="border-border border-b">
                    <tr>
                      {tableFields.map((field) => (
                        <th key={field.key} className="px-3 py-3 font-medium">
                          {t(field.label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((record, index) => (
                      <tr
                        key={String(record.id ?? index)}
                        className="group border-border border-b last:border-0"
                      >
                        {tableFields.map((field, fieldIndex) => (
                          <td
                            key={field.key}
                            className="max-w-56 px-3 py-3"
                            title={t(displayValue(record[field.key]))}
                          >
                            {fieldIndex === 0 ? (
                              <div className="flex items-center gap-3">
                                <span className="truncate">
                                  {t(displayValue(record[field.key]))}
                                </span>
                                <div className="flex shrink-0 gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEdit(record)}
                                  >
                                    {t('Edit')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteRecord(record)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {t('Delete')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className="block truncate">
                                {t(displayValue(record[field.key]))}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {deleteError ? (
              <p className="text-danger mt-4" role="alert">
                {t(deleteError)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {formOpen ? (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="reference-record-form-title"
            className="max-h-[min(90vh,48rem)] w-full max-w-4xl overflow-y-auto shadow-xl"
          >
            <CardHeader>
              <CardTitle id="reference-record-form-title">
                {editingRecord
                  ? `${t('Edit')} ${t(selectedResource?.label.replace(/s$/, '') ?? '')}`
                  : `${t('Add')} ${t(selectedResource?.label.replace(/s$/, '') ?? '')}`}
              </CardTitle>
              <CardDescription>
                {t('Enter the complete record. JSON fields must contain a valid array or object.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={submit} noValidate>
                <div className="grid gap-5 md:grid-cols-2">
                  {fields.map((field) => (
                    <RecordField
                      key={field.key}
                      field={field}
                      register={form.register}
                      message={form.formState.errors[field.key]?.message}
                    />
                  ))}
                </div>
                {form.formState.errors.root?.message ? (
                  <p className="text-danger" role="alert">
                    {form.formState.errors.root.message}
                  </p>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={closeForm}>
                    {t('Cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving
                      ? t('Saving…')
                      : editingRecord
                        ? t('Save changes')
                        : t('Create record')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  )
}
