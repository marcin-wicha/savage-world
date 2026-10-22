# Savage Worlds Frontend

React single-page application for the Savage Worlds character builder.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix primitives
- Storybook
- React Router
- TanStack Query
- Fetch-based REST/GraphQL client
- GraphQL Code Generator
- React Hook Form + Zod
- Vitest + React Testing Library + MSW

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm codegen
pnpm storybook
pnpm build-storybook
```

The design system lives in `src/components/ui`, with stories in
`src/stories` and co-located story files. The theme is intentionally monochrome
and Shadowdark-inspired. Add primitives with:

```bash
pnpm ui:add dialog select
```

This runs the shadcn CLI and creates a baseline story for each component. Edit
`const defaultArgs` in the generated story to match the component's real props.

The Vite dev server proxies `/api` and `/graphql` to `http://localhost:3000`.
GraphQL code generation depends on `../backend/schema.graphql`. Regenerate
frontend types after changing the backend schema with `pnpm codegen`.
