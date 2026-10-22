# AGENTS.md

This file is the operating guide for coding agents working on the Savage Worlds
character builder. Read it before changing code. If a nested `AGENTS.md` exists
in the area you are editing, follow the more specific instructions.

## Product

A character builder for **Savage Worlds Adventure Edition (SWADE)**.

Core capabilities:

- Create and validate characters
- Manage attributes, skills, edges, hindrances, ancestries/origins, powers, and gear
- Track advances and rank progression
- Export characters for play

The server is the source of truth for game rules. The frontend may perform
optimistic validation for responsiveness, but final validation and derived
values must come from the backend.

## Repository layout

```text
/
  AGENTS.md
  README.md
  Procfile.dev
  bin/                  # Root setup/dev/ci/kamal wrappers
  backend/              # Rails API
  frontend/             # React SPA
  docs/                 # Architecture and domain documentation
```

### Backend

```text
backend/
  app/
    controllers/        # Thin HTTP/GraphQL entry points
    controllers/api/    # REST endpoints, currently session lifecycle
    controllers/concerns/
    graphql/            # Schema, types, mutations, resolvers, dataloaders
    models/             # ActiveRecord models
    policies/           # Pundit authorization
    services/           # Domain operations and rule calculations
  db/                   # Migrations, schema, seeds
  spec/                 # RSpec tests
  schema.graphql        # Checked-in GraphQL schema dump
```

### Frontend

```text
frontend/
  .storybook/           # Storybook configuration
  components.json       # shadcn/ui configuration
  src/
    app/                # Router, providers, application shell
    components/
      ui/               # shadcn/ui primitives
    features/           # Feature-specific code
    graphql/
      generated/        # GraphQL Code Generator output (checked in)
      operations/       # .graphql operation documents
    lib/                # Apollo client, CSRF, environment, utilities
    routes/             # Route-level components
    stories/            # Design-system docs and shared stories
    test/               # Vitest setup
  scripts/              # Frontend tooling, including the shadcn wrapper
```

## Current implementation status

The monorepo and the API/RSpec migration are complete. The current baseline is:

- Rails 8.1.4 API-only backend, PostgreSQL 17, no views/assets/importmap/Hotwire.
- `graphql-ruby` schema at `backend/schema.graphql`, with `viewer` and paginated
  `origins` queries.
- Session-cookie authentication with REST session endpoints, CSRF protection,
  CORS, Pundit base policy, and rate-limited sign-in.
- RSpec + FactoryBot + Shoulda Matchers; Minitest has been removed.
- React 19/Vite frontend with Apollo Client, CSRF link, generated GraphQL
  operation types, shadcn/ui primitives, and Storybook.
- CI runs backend lint/security/tests against PostgreSQL and verifies schema and
  codegen freshness.
- Docker/Kamal configuration targets PostgreSQL; the production image builds
  successfully.

Current gaps, intentionally left for later feature work:

- The SWADE character domain is not implemented beyond the `Origin` scaffold.
- `Origin` currently has only `id`, `created_at`, and `updated_at`.
- There are no GraphQL mutations yet.
- There is no password-reset flow or mailer usage.
- There are no domain Pundit policies beyond `ApplicationPolicy`.
- Frontend feature UI and MSW handlers are still minimal.

## Agent operating rules

- Never commit, amend, push, or open a pull request unless explicitly asked.
- Never commit secrets, credentials, `.env` files, or `config/master.key`.
- Prefer existing patterns and libraries over introducing new ones.
- Keep changes focused on the requested task; avoid unrelated refactors.
- Use `bin/rails`, `bundle exec`, and `pnpm` through the documented commands.
- Add or update tests for every behavior change.
- Run the relevant checks before declaring work complete.
- Update this file or the relevant README when architecture or commands change.
- Do not hand-edit generated files such as `backend/db/schema.rb`,
  `backend/schema.graphql`, or `frontend/src/graphql/generated/*`. Regenerate
  them instead.
- Do not add code comments unless they explain non-obvious intent.

## Commands

Tool versions are pinned in `mise.toml`:

- Ruby `4.0.7`
- Node.js `22.21.1`
- pnpm `10.34.7`
- PostgreSQL `17.11`

Run `mise install` once. The backend requires a running PostgreSQL server before
`bin/setup`, `bin/rails db:prepare`, or the test suite can connect. Setup does
not start PostgreSQL automatically.

### Local PostgreSQL

On the current development workstation, PostgreSQL was installed with `mise`
and initialized into a local data directory. It is not managed by a system
service and may need to be started after a reboot:

```bash
PGROOT=$(mise where postgres@17.11)
PGDATA="${PGDATA:-$HOME/.local/share/savage-worlds/postgres}"

"$PGROOT/bin/pg_isready" -h localhost -p 5432 ||
  "$PGROOT/bin/pg_ctl" -D "$PGDATA" \
    -l "$PGDATA.log" \
    -o "-p 5432" start
```

The cluster was initialized with:

```bash
"$PGROOT/bin/initdb" -D "$PGDATA" \
  -U "$USER" \
  --auth=trust \
  --encoding=UTF8 \
  --locale=C.UTF-8
```

`--auth=trust` is development-only. Production uses RDS and `DATABASE_URL`.

The default database configuration in `backend/config/database.yml` connects to
`localhost:5432` as the current OS user with no password. Override it with:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

Production is expected to receive `DATABASE_URL`. The `pg` gem installs as a
precompiled Linux gem with bundled libpq. If a native build is ever required, set:

```bash
bundle config set --local build.pg \
  "--with-pg-config=$(mise where postgres@17.11)/bin/pg_config"
```

`backend/.bundle/config` is local and ignored; do not commit it.

### Root commands

```bash
bin/setup          # Install backend and frontend dependencies
bin/dev            # Run Rails and Vite together
bin/ci             # Run backend and frontend quality checks
```

### Backend commands (from `backend/`)

```bash
bin/setup
bin/dev
bin/rails server
bin/rails console
bin/rails db:prepare
bin/rails db:migrate
bin/rails db:seed
bin/rails graphql:schema:dump
bundle exec rspec
bin/rubocop
bin/brakeman
bin/bundler-audit
bin/ci
```

### Frontend commands (from `frontend/` or with `pnpm --dir frontend`)

```bash
pnpm install
pnpm dev
pnpm lint
pnpm format
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm codegen        # Requires backend/schema.graphql
pnpm storybook      # Storybook on http://localhost:6006
pnpm build-storybook
pnpm ui:add <name>  # shadcn component plus a baseline story
```

### GraphQL schema and generated types

After any GraphQL schema change, run these in order:

```bash
cd backend
bin/rails graphql:schema:dump
cd ..
pnpm --dir frontend codegen
```

Keep `backend/schema.graphql` and the generated frontend files in sync; include
both in the same change when committing.

## Backend conventions

### Architecture

- Use Rails as an API-only service. Do not add server-rendered views, Hotwire,
  Stimulus, import maps, asset-pipeline UI code, or mailer views.
- Keep controllers thin. Put business logic in service objects and reusable
  domain code.
- Put authorization rules in Pundit policies.
- Put GraphQL types, mutations, resolvers, and dataloaders under `app/graphql`.
- Never put rule calculations in controllers or GraphQL type classes.
- `ApplicationController` inherits from `ActionController::API` and includes
  cookies, CSRF protection, Pundit, and the `Authentication` concern.
- API errors are JSON with an `error` key. Use appropriate status codes:
  `401` unauthenticated, `403` forbidden, `404` missing, `422` invalid input or
  CSRF, `429` rate limited.

### Database

- PostgreSQL is the only supported database. Do not add SQLite-specific code.
- Add foreign keys, indexes, and null constraints intentionally.
- Write reversible migrations where practical.
- Never edit `db/schema.rb` by hand. Run migrations and commit the regenerated
  schema.
- Use `db/seeds.rb` for reference data such as edges, hindrances, and skills.
  Keep seed data idempotent.
- Current tables are `users`, `sessions`, and `origins`.
- `users` stores a normalized, unique `email_address` and `password_digest`.
- `sessions` belongs to `users` and stores optional `ip_address` and
  `user_agent`.
- `origins` is still a skeleton table with timestamps only.

### HTTP API

Routes are defined in `backend/config/routes.rb`:

- `GET /up` — health check.
- `GET /api/v1/session` — public; returns the current user (or `null`) and a
  CSRF token. Sets the session and `XSRF-TOKEN` cookies.
- `POST /api/v1/session` — public; JSON body:
  `{ "email_address": "...", "password": "..." }`. Returns `201` with
  `{ "user": { "id": 1, "email_address": "..." } }` on success, `401` for bad
  credentials, and `429` when rate limited.
- `DELETE /api/v1/session` — authenticated; destroys the session and returns
  `204`.
- `POST /graphql` — GraphQL endpoint. There is intentionally no GET route.

The sign-in endpoint is rate limited to 10 attempts per 3 minutes.

Domain operations belong in GraphQL, not REST. REST is reserved for transport
concerns such as the session lifecycle and health checks.

### Authentication and CSRF

- `app/controllers/concerns/authentication.rb` loads the current session from the
  signed `session_id` cookie and exposes `Current.session` / `Current.user`.
- `require_authentication` runs before actions by default. Use
  `allow_unauthenticated_access` on public actions.
- The browser session cookie is `_savage_worlds_session`, configured in
  `config/application.rb` as `HttpOnly`, `SameSite=Lax`, and `Secure` in
  production.
- A separate signed cookie named `session_id` points at the `sessions` row. It
  is also `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Sign-in creates a `Session`, calls `reset_session`, and sets both cookies.
  Sign-out destroys the session, clears cookies, and resets the Rails session.
- CSRF is enabled for all POST/PUT/PATCH/DELETE browser requests, including
  public sign-in and `POST /graphql`. Do not exempt GraphQL.
- `ApplicationController` sets the non-HttpOnly `XSRF-TOKEN` cookie after every
  request and accepts the `X-CSRF-Token` header. Invalid tokens return `422`
  with `{ "error": "Invalid authenticity token" }`.
- `frontend/src/lib/csrf.ts` reads the cookie and bootstraps it by calling
  `GET /api/v1/session` when missing. Apollo attaches the header automatically.
- CORS is configured in `config/initializers/cors.rb` from the comma-separated
  `FRONTEND_ORIGINS` environment variable. Credentials are allowed; do not use a
  wildcard origin with credentials.
- Pundit is wired through `pundit_user = Current.user`. Add a policy for every
  domain authorization decision; only the base `ApplicationPolicy` exists today.

### GraphQL

- Use `graphql-ruby` with schema class `SavageWorldsSchema`.
- `app/graphql/types/base_field.rb` and `base_argument.rb` disable camelization,
  so all application-defined field and argument names are `snake_case`.
- Relay connection scaffolding is the exception to the snake_case rule:
  standard fields such as `pageInfo`, `hasNextPage`, `hasPreviousPage`,
  `startCursor`, and `endCursor` keep GraphQL's conventional names.
- The current query fields are:
  - `viewer: User` — current user or `null`.
  - `origins(first, after, last, before): OriginConnection!` — cursor-paginated
    origins ordered by id.
- Query limits: max depth `12`, max complexity `300`. Connections default to 25
  items and cap at 100.
- `GraphQL::Dataloader` is enabled. Add batched source classes for associations
  rather than introducing N+1 queries.
- The GraphQL controller allows unauthenticated execution and supplies
  `current_user` and `current_session` in the context. Resolvers/mutations must
  enforce their own authorization.
- GraphQL validation and execution failures return HTTP `200` with the standard
  `errors` payload; do not rely on HTTP status alone for GraphQL errors. CSRF
  failures occur before GraphQL execution and return HTTP `422`.
- Mutations do not exist yet. When adding them, use payload objects with a
  user-facing `errors` field for validation failures and raise execution errors
  for authentication/authorization or exceptional failures.

### Ruby style

- Follow RuboCop Rails Omakase.
- Use `snake_case` for methods, variables, and JSON fields.
- Use `PascalCase` for classes and modules.
- Prefer small, focused methods and service objects over large controllers.
- Avoid `default_scope` and callbacks with external side effects.

## Frontend conventions

### TypeScript and React

- TypeScript strict mode is required.
- Do not use `any`. Prefer `unknown` and narrow types.
- Use function components and hooks.
- Keep components focused; extract shared UI only when it is genuinely reused.
- Organize code by feature under `frontend/src/features`.
- Use the `@/` alias for imports from `src`.

### Data fetching and CSRF

- Use Apollo Client. The shared client lives in `frontend/src/lib/apollo.ts`.
- Link order is CSRF context link, then `HttpLink`; requests use
  `credentials: 'include'`.
- `VITE_API_URL` sets `env.apiBaseUrl`. When empty, requests use relative
  `/api` and `/graphql` paths and rely on the Vite proxy in development.
- Use `frontend/src/lib/csrf.ts` for CSRF behavior. `ensureCsrfToken()` reads
  `XSRF-TOKEN`, calls `GET /api/v1/session` if needed, and returns `null` on
  failure.
- Put GraphQL operations in `frontend/src/graphql/operations/*.graphql`.
- Use GraphQL Code Generator; do not hand-write DTOs that mirror GraphQL
  responses. Generated output is checked in under
  `frontend/src/graphql/generated/`.
- In development, Vite proxies `/api` and `/graphql` to
  `http://localhost:3000` so cookies remain same-origin.
- Use `frontend/src/lib/env.ts` for environment values.

### Design system and Storybook

- Use shadcn/ui primitives from `src/components/ui`. Do not fork a primitive
  into a feature directory unless the feature genuinely needs a different
  contract.
- Add new shadcn primitives from `frontend/` with `pnpm ui:add <component>`.
  This wraps the shadcn CLI and scaffolds a co-located baseline story. Use the
  generated story as a starting point and replace the placeholder args with
  realistic examples. Running `pnpm dlx shadcn@latest add` directly installs
  only the component files. Update `components.json` only when changing the
  design-system configuration.
- Use semantic Tailwind tokens such as `bg-background`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary`, and
  `text-primary-foreground`. Avoid raw color classes in new UI.
- Preserve the monochrome, Shadowdark-inspired visual language: near-black
  surfaces, warm off-white text, sharp borders, and no decorative color
  accents. Display headings use Pirata One; UI and body text use Geist.
- Use `cn` from the `cn` package (re-exported as `@/lib/utils`) to merge
  conditional class names.
- Keep light/dark tokens in `src/index.css`; the app is dark by default via the
  `dark` class on `<html>`.
- Add a co-located `*.stories.tsx` file for every reusable primitive. Use
  `Design System/<Component>` as the title and `tags: ['autodocs']`.
- Use `.storybook/preview.tsx` for global decorators and theme behavior.
  `pnpm storybook` runs Storybook on port `6006`.
- Storybook must build with `pnpm build-storybook`; do not commit
  `storybook-static`.

### Forms and styling

- Use React Hook Form with Zod for forms.
- Use Tailwind CSS utility classes. Avoid ad-hoc CSS unless a reusable
  component or third-party integration requires it.
- Build accessible interfaces: semantic HTML, labels, keyboard navigation, and
  visible focus states.
- Design responsive layouts by default.

### Testing

- Use Vitest, React Testing Library, and MSW.
- Test user-visible behavior, not implementation details.
- Prefer accessible queries such as `getByRole` and `getByLabelText`.
- Keep GraphQL mocks close to the feature tests that use them.
- Vitest runs in jsdom with `frontend/src/test/setup.ts` loading
  `@testing-library/jest-dom/vitest`.
- CSRF unit tests live beside the implementation in `src/lib/csrf.test.ts`.
- MSW is installed but no shared handlers exist yet; add them when feature
  tests need GraphQL/REST mocks.

## Quality gates

Before considering work complete, run the checks relevant to the change.

Backend, from `backend/`:

```bash
bin/rubocop
bin/brakeman
bin/bundler-audit
bin/rails db:prepare
bundle exec rspec
```

Frontend:

```bash
pnpm --dir frontend lint
pnpm --dir frontend format:check
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend build-storybook
```

Run everything from the repository root:

```bash
bin/ci
```

`bin/ci` runs backend setup, RuboCop, bundler-audit, Brakeman, RSpec, a GraphQL
schema dump, then frontend lint, format check, typecheck, tests, production
build, and Storybook build.

If GraphQL or database schema changed, also verify freshness explicitly:

```bash
cd backend
bin/rails graphql:schema:dump
git diff --exit-code schema.graphql
cd ..
pnpm --dir frontend codegen
git diff --exit-code frontend/src/graphql/generated
```

## Testing requirements

- Models: validations, associations, and scopes.
- Services/domain rules: point-buy limits, rank requirements, derived stats.
- GraphQL: queries, mutations, authorization, pagination, and error payloads.
- Policies: each role's allowed actions.
- Frontend: route rendering, form behavior, CSRF, and error/loading states.
- Authentication: valid/invalid credentials, session creation/destruction, and
  CSRF rejection.

No feature is complete without tests for its authorization and failure paths.

## CI/CD and deployment

CI is defined in `.github/workflows/ci.yml` with these jobs:

- `scan_ruby`: Brakeman and bundler-audit.
- `lint`: RuboCop.
- `test`: PostgreSQL 17 service, `bin/rails db:prepare`, `bundle exec rspec`,
  and a `git diff` check that `backend/schema.graphql` is current.
- `frontend`: lint, format check, typecheck, tests, GraphQL codegen freshness,
  production build, and Storybook build.

The CI PostgreSQL service uses the `postgres:17` image with `postgres` /
`postgres` credentials on localhost and supplies `DATABASE_HOST`,
`DATABASE_USERNAME`, and `DATABASE_PASSWORD`.

Deployment target:

- Backend: Docker + Kamal on EC2.
- Database: Amazon RDS for PostgreSQL.
- Frontend: static build on S3 behind CloudFront.
- DNS/TLS: Route53 + ACM.
- Secrets: Kamal secrets or AWS SSM; never commit them.

Run deployment commands from `backend/` or use the root wrapper:

```bash
bin/kamal deploy
```

Kamal secrets required by `backend/config/deploy.yml`:

- `RAILS_MASTER_KEY`
- `DATABASE_URL`
- `FRONTEND_ORIGINS`

The production Dockerfile is API-only: it installs libpq, excludes
`development:test` gems, runs Bootsnap precompilation, and does not precompile
assets. The entrypoint runs `bin/rails db:prepare` before starting the server.

## Known constraints and operational notes

- PostgreSQL is not started automatically by `bin/setup` or `bin/ci`. Start it
  first; otherwise boot/specs fail with `PG::ConnectionBad`.
- On this workstation, Docker is available as `docker.exe` rather than `docker`
  inside the Linux shell. Docker builds have been verified with that command.
- The `backend/.bundle/config` file may contain a machine-local `pg` build path.
  It is ignored and must not be committed.
- The `pg` gem is precompiled for `x86_64-linux`; `libpq-dev` is not required
  locally.
- Frontend production builds currently emit a Vite chunk-size warning for the
  main bundle. It is a warning, not a failing gate.
- Active Storage is present but its variant processor is disabled because
  `image_processing` is intentionally not included.
- There are no server-rendered views or mailer templates in the backend. Do not
  reintroduce them for API work.
- `backend/db/seeds.rb` is still empty; add idempotent reference data as domain
  models are introduced.
- `backend/schema.graphql` and frontend generated GraphQL types are checked in.
  Regenerate both after schema changes.
- Root `bin/ci` does not run the frontend codegen-freshness diff; CI does. Run
  codegen manually when changing GraphQL documents.
- Production uses `:memory_store` for `Rails.cache` and `:async` for ActiveJob.
  Rate limiting is therefore per-process and is not shared across Puma workers
  or app instances; replace the cache store before relying on it at scale.
- Session lifecycle request specs live in
  `backend/spec/requests/api/v1/sessions_spec.rb` and cover sign-in, sign-out,
  cookie behavior, and CSRF rejection. Keep them current when changing auth.

## Domain rules

Keep the game rules explicit and testable. Important SWADE concepts include:

- **Attributes:** Agility, Smarts, Spirit, Strength, Vigor
- **Skills:** linked to an attribute; may be core or advanced
- **Edges:** purchasable advantages, often with rank or trait requirements
- **Hindrances:** disadvantages that grant points during creation
- **Ancestry/Origin:** the character's species and background package
- **Arcane Background:** the source of a character's powers
- **Powers:** activated abilities powered by Power Points
- **Gear:** weapons, armor, and equipment
- **Advances:** character improvement steps
- **Rank:** Novice, Seasoned, Veteran, Heroic, Legendary

Rules that affect character validity or derived values belong in backend
services or domain objects and must have unit tests. Frontend helpers may
mirror calculations for display, but must not become the source of truth.

## Definition of Done

A change is done when:

- The requested behavior is implemented with the smallest reasonable change.
- Tests cover the happy path, authorization, and important failure cases.
- Backend lint/security checks and tests pass.
- Frontend lint/format/typecheck/tests/build pass.
- Migrations are created; `db/schema.rb`, `backend/schema.graphql`, and
  generated frontend GraphQL types are regenerated if needed.
- Documentation or AGENTS.md is updated when conventions or commands change.
- No secrets, credentials, generated build output, or machine-local
  `.bundle/config` are committed.
- The final response summarizes what changed and which checks were run.
