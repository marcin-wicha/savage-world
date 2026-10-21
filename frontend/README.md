# Savage Worlds Frontend

React single-page application for the Savage Worlds character builder.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- Apollo Client
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
```

The Vite dev server proxies `/api` and `/graphql` to `http://localhost:3000`.
GraphQL code generation depends on `../backend/schema.graphql`, which will be
produced once the backend GraphQL schema is added.
