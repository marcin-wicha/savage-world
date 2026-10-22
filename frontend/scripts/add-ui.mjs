#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const cwd = process.cwd()
const args = process.argv.slice(2)
const components = args.filter((arg) => !arg.startsWith('-'))
const flags = args.filter((arg) => arg.startsWith('-'))
const dryRun = flags.some((flag) => ['--dry-run', '--diff', '--view'].includes(flag))
const overwrite = flags.some((flag) => ['--overwrite', '-o'].includes(flag))

if (components.length === 0) {
  console.error('Usage: pnpm ui:add <component...> [--overwrite]')
  process.exit(1)
}

const result = spawnSync('pnpm', ['exec', 'shadcn', 'add', ...args, '--yes'], {
  cwd,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

if (dryRun) {
  process.exit(0)
}

for (const address of components) {
  const slug = componentSlug(address)
  const componentPath = findComponentPath(slug)

  if (!componentPath) {
    console.warn(`Skipped story for "${address}": no component file found.`)
    continue
  }

  const exportName = findMainExport(readFileSync(componentPath, 'utf8'))

  if (!exportName) {
    console.warn(`Skipped story for "${address}": no component export found.`)
    continue
  }

  const storyPath = join(cwd, 'src/components/ui', `${slug}.stories.tsx`)

  if (existsSync(storyPath) && !overwrite) {
    console.log(`Kept existing story: ${relative(storyPath)}`)
    continue
  }

  writeFileSync(
    storyPath,
    storyTemplate(componentPath, exportName, supportsChildren(componentPath, exportName)),
    'utf8',
  )
  console.log(`Created story: ${relative(storyPath)}`)
}

function componentSlug(address) {
  const filename = address.split('/').at(-1) ?? address

  return filename.replace(/\.json$/, '').replace(/-story$/, '')
}

function findComponentPath(slug) {
  const candidates = [
    join(cwd, 'src/components/ui', `${slug}.tsx`),
    join(cwd, 'src/components/ui', slug, 'index.tsx'),
  ]

  return candidates.find((candidate) => existsSync(candidate))
}

function findMainExport(source) {
  const matches = []

  for (const pattern of [
    /export\s+(?:async\s+)?function\s+([A-Z]\w*)/g,
    /export\s+const\s+([A-Z]\w*)/g,
  ]) {
    for (const match of source.matchAll(pattern)) {
      matches.push({ index: match.index, name: match[1] })
    }
  }

  for (const match of source.matchAll(/export\s*\{([\s\S]*?)\}/g)) {
    const name = match[1]
      .split(',')
      .map((entry) =>
        entry
          .trim()
          .split(/\s+as\s+/)
          .at(-1),
      )
      .find((entry) => /^[A-Z]\w*$/.test(entry ?? ''))

    if (name) {
      matches.push({ index: match.index, name })
    }
  }

  return matches.sort((a, b) => a.index - b.index).at(0)?.name
}

function storyTemplate(componentPath, exportName, children) {
  const importPath = `./${componentPath
    .split('/src/components/ui/')
    .at(-1)
    .replace(/\.tsx$/, '')}`
  const args = children ? "{ children: 'Example' }" : '{}'

  return `import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'

import { ${exportName} } from '${importPath}'

const meta = {
  title: 'Design System/${titleCase(exportName)}',
  component: ${exportName},
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ${exportName}>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = ${args} as ComponentProps<typeof ${exportName}>

export const Default: Story = {
  render: () => <${exportName} {...defaultArgs} />,
}
`
}

function supportsChildren(componentPath, exportName) {
  try {
    const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.app.json')

    if (!configPath) return false

    const config = ts.readConfigFile(configPath, ts.sys.readFile)
    const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd)
    const program = ts.createProgram([componentPath], options)
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(componentPath)
    const moduleSymbol = source && checker.getSymbolAtLocation(source)

    if (!moduleSymbol) return false

    const exported = checker
      .getExportsOfModule(moduleSymbol)
      .find((symbol) => symbol.name === exportName)

    if (!exported) return false

    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration ?? source)
    const props = type.getCallSignatures().at(0)?.getParameters().at(0)

    if (!props) return false

    const propsType = checker.getTypeOfSymbolAtLocation(props, props.valueDeclaration ?? source)

    return Boolean(checker.getPropertyOfType(propsType, 'children'))
  } catch {
    return false
  }
}

function titleCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
}

function relative(path) {
  return path.replace(`${cwd}/`, '')
}
