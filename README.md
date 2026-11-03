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

The production Compose stack runs Rails, PostgreSQL, Silo object storage,
Nginx, and Caddy on OCI. Caddy terminates HTTPS for `mw-swade.duckdns.org`.

`docker compose up --detach --build --remove-orphans` builds the frontend and
runs `publish-assets` before starting Nginx. Images, fonts, artwork, and other
static media from the build are copied to the dedicated `public-assets` Silo
bucket. JavaScript, CSS, and HTML remain on Nginx. SVG React components remain
part of the JavaScript bundle. Development and Storybook continue to serve
assets locally.

Public media keeps its existing same-origin URL (for example
`/traits/back.png` or `/assets/geist-….woff2`); Nginx proxies read-only media
requests to Silo without forwarding session cookies or authorization headers.
The bucket policy permits only object reads, not anonymous listing or writes.
The separate `AWS_BUCKET` (default `uploads`) remains private. Never put private
or user-uploaded files into `frontend/public` or the public-assets bucket.
Future upload endpoints still need their own authorization and storage wiring;
Rails currently continues to use local Active Storage.

Publishing retains old hashed files so existing clients can finish loading
across deployments. Unhashed public paths are overwritten on deployment; asset
removal and old-version cleanup require deliberate bucket maintenance. Back up
the Silo volume. Only Caddy exposes host ports; the storage API and console stay
internal.

The existing Kamal configuration is also available.

Deployment commands are run from `backend/`:

```bash
backend/bin/kamal deploy
```

See [AGENTS.md](AGENTS.md) for architecture and conventions.
