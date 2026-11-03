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

### Private reference catalogs

The licensed YAML catalogs and SWADE description overlays under
`backend/db/data/{edges,hindrances,skills,gear,powers}/private/`, as well as
Polish Fantasy Companion translations under `backend/config/locales/private/`,
are gitignored.
A Git checkout and `db:prepare` alone cannot populate them. Before the first
OCI deployment, securely provision each catalog's `.yml` files on the server
under `/var/www/savage-worlds-private-data/<catalog>/` and the locale `.yml`
files under `/var/www/savage-worlds-private-data/locales/` (for example, copy them
from the licensed workstation with `scp` or `rsync` over SSH). Keep that directory
outside `/var/www/app` so the deploy's Git reset cannot affect it. Restrict its
permissions to the deployment user and ensure the container's `rails` user
(UID 1000) can read the files. Do not put licensed data in GitHub secrets,
`.env`, the public-assets bucket, or the Docker image. Back up this directory
separately from the database.

The deploy checks that all five catalog directories and the locale directory
contain YAML before updating the stack. `docker-compose.private.yml` mounts them
read-only into Rails; after
`docker compose up`, deployment runs `db:seed` to refresh reference data and
missing descriptions. Rails loads the mounted translations at boot; restart the
Rails container after changing locale files. Re-running seeds does not reset an
existing admin password.
To refresh catalogs manually after changing the server's files, run from
`/var/www/app`:

```bash
docker compose -f docker-compose.yml -f docker-compose.private.yml run --rm --no-deps rails_api ./bin/rails db:seed
```

The standard local `docker compose` command does not use the private override.
If the private data has never been provisioned, deployment stops rather than
silently removing descriptions from existing records.

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

### Resource artwork links

Origins, edges, hindrances, skills, and gear store an optional `artwork_url` in
the database. GraphQL returns that value and character creation renders it
directly; it does not reconstruct a filename from the resource slug. Missing
links mean no artwork. The admin editor exposes an **Artwork URL** field for
all five resources, including clearing an existing link.

The migration backfills existing artwork from `backend/db/data/artwork.yml`.
New imports use that manifest as a default, but subsequent imports preserve
stored links (including links cleared by an administrator). Existing nonblank
gear artwork links are preserved during backfill. When adding bundled artwork,
add its mapping to the manifest for new imports; use the admin editor to assign
it to an existing resource.

Manifest links are same-origin paths served from the S3-compatible public
bucket through Nginx in production. Absolute artwork URLs are also supported.
A future admin upload can store its resulting public URL in the same field;
no frontend filename convention or schema change will be required. Powers do
not currently have artwork assets and are unchanged.

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
