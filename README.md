# Savage Worlds Character Builder

A character builder for the Savage Worlds Adventure Edition tabletop RPG.

## Repository layout

```text
backend/   Rails API (PostgreSQL, GraphQL)
frontend/  React SPA (TypeScript, Tailwind, shadcn/ui, Storybook)
docs/      Architecture and domain notes
```

## Prerequisites

- Ruby 4.0.7
- PostgreSQL 17
- Node.js 22+ and pnpm 10+
- Docker (optional, for deployment and containerized development)

If you use [mise](https://mise.jdx.dev/), the required versions are pinned in
`mise.toml`:

```bash
mise install
```

## Setup

```bash
bin/setup
```

## Development

```bash
bin/dev
```

This starts the local PostgreSQL server if it is not already running, then runs
the Rails server on `http://localhost:3000` and the Vite dev server on its
default port. The Vite dev server proxies `/api` and `/graphql` to Rails so
session cookies remain same-origin during development.

PostgreSQL must be running before `bin/setup` prepares the database. Configure a
non-default connection with `DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_USERNAME`, and `DATABASE_PASSWORD`.

## Quality checks

```bash
bin/ci
```

Or run each app independently:

```bash
backend/bin/ci
pnpm --dir frontend lint
pnpm --dir frontend format:check
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend codegen
pnpm --dir frontend build
pnpm --dir frontend build-storybook
```

Run the design-system explorer with:

```bash
pnpm --dir frontend storybook
```

## Deployment

The backend is containerized and intended for Kamal on EC2. The frontend is
built as a static SPA and deployed to S3 behind CloudFront. PostgreSQL is
provided by RDS.

Deployment commands are run from `backend/`:

```bash
backend/bin/kamal deploy
```

See [AGENTS.md](AGENTS.md) for architecture and conventions.
