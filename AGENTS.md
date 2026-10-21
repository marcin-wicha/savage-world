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
    graphql/            # Schema, types, mutations, resolvers, dataloaders
    models/             # ActiveRecord models
    policies/           # Pundit authorization
    services/           # Domain operations and rule calculations
  db/                   # Migrations, schema, seeds
  spec/                 # RSpec tests
```

### Frontend

```text
frontend/src/
  app/                  # Router, providers, application shell
  components/           # Shared presentational components
  features/             # Feature-specific code
  graphql/              # GraphQL operations and generated types
  lib/                  # Apollo client, environment, utilities
  routes/               # Route-level components
  test/                 # Test setup
```

## Current migration status

The repository was restructured into a monorepo, but the backend migration is
not complete yet.

- [x] Move Rails into `backend/`
- [x] Create React/Vite SPA in `frontend/`
- [ ] Convert Rails to API-only
- [ ] Replace SQLite with PostgreSQL
- [ ] Add GraphQL schema and `graphql-ruby`
- [ ] Add session-cookie authentication
- [ ] Replace Minitest with RSpec + FactoryBot
- [ ] Add GraphQL Code Generator output and schema dump
- [ ] Update Docker/Kamal for PostgreSQL
- [ ] Add PostgreSQL service to CI

Until these items are complete, use the commands and conventions in the
**Current commands** section. Target commands are marked accordingly.

## Agent operating rules

- Never commit, amend, push, or open a pull request unless explicitly asked.
- Never commit secrets, credentials, `.env` files, or `config/master.key`.
- Prefer existing patterns and libraries over introducing new ones.
- Keep changes focused on the requested task; avoid unrelated refactors.
- Use `bin/rails`, `bundle exec`, and `pnpm` through the documented commands.
- Add or update tests for every behavior change.
- Run the relevant checks before declaring work complete.
- Update this file or the relevant README when architecture or commands change.
- Do not hand-edit generated files such as `backend/db/schema.rb` or
  `frontend/src/graphql/generated/*`. Regenerate them instead.
- Do not add code comments unless they explain non-obvious intent.

## Commands

Tool versions are pinned in `mise.toml`. Run `mise install` once to install the
expected Ruby, Node.js, and pnpm versions.

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
bin/rails test
bin/rubocop
bin/brakeman
bin/bundler-audit
bin/ci
```

Target commands after the API/RSpec migration:

```bash
bundle exec rspec
bundle exec rails graphql:schema:dump
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
```

## Backend conventions

### Architecture

- Use Rails as an API-only service. Do not add server-rendered views, Hotwire,
  Stimulus, import maps, or asset-pipeline UI code.
- Keep controllers thin. Put business logic in service objects and reusable
  domain code.
- Put authorization rules in Pundit policies.
- Put GraphQL types, mutations, resolvers, and dataloaders under `app/graphql`.
- Never put rule calculations in controllers or GraphQL type classes.

### Database

- PostgreSQL is the only supported database. Do not add SQLite-specific code.
- Add foreign keys, indexes, and null constraints intentionally.
- Write reversible migrations where practical.
- Never edit `db/schema.rb` by hand. Run migrations and commit the regenerated
  schema.
- Use `db/seeds.rb` for reference data such as edges, hindrances, and skills.
  Keep seed data idempotent.

### GraphQL

- Use `graphql-ruby`.
- Keep field names and JSON keys in `snake_case`; disable GraphQL's default
  camelization at the schema/field level.
- Batch association loading with `GraphQL::Dataloader` or dedicated source
  classes. Do not introduce N+1 queries.
- Use cursor-based connections for lists.
- Enforce query depth and complexity limits.
- Use mutation payloads with a user-facing `errors` field for validation
  failures. Raise execution errors for authentication/authorization failures
  and exceptional conditions.
- Keep the checked-in `backend/schema.graphql` current whenever the schema
  changes.
- After schema changes, regenerate frontend types with `pnpm --dir frontend codegen`.

### Authentication

- Use session cookies for browser authentication.
- REST endpoints own the session lifecycle:
  - `POST /api/v1/session` — sign in
  - `DELETE /api/v1/session` — sign out
- Domain operations use GraphQL.
- Cookies must be `HttpOnly`, `Secure` in production, and `SameSite=Lax` unless
  a cross-site deployment explicitly requires otherwise.
- Configure CORS with an explicit frontend origin allowlist and
  `credentials: true`.
- Cookie-authenticated mutations require CSRF protection. Do not treat GraphQL
  POST requests as exempt.
- Load `Current.user` from the session in a controller concern and authorize
  access through Pundit policies.

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

### Data fetching

- Use Apollo Client.
- Use GraphQL Code Generator for operation types; do not hand-write DTOs that
  mirror GraphQL responses.
- Send cookies with `credentials: 'include'`.
- In development, rely on the Vite proxy for `/api` and `/graphql` so cookies
  remain same-origin.
- Use `frontend/src/lib/env.ts` for environment values.

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

## Quality gates

Before considering work complete, run the checks relevant to the change.

Backend:

```bash
backend/bin/rubocop
backend/bin/rails test       # Current
backend/bin/brakeman
backend/bin/bundler-audit
```

Frontend:

```bash
pnpm --dir frontend lint
pnpm --dir frontend format:check
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
```

Or run everything:

```bash
bin/ci
```

After the RSpec migration, replace `backend/bin/rails test` with
`backend/bin/rspec`.

## Testing requirements

- Models: validations, associations, and scopes
- Services/domain rules: point-buy limits, rank requirements, derived stats
- GraphQL: queries, mutations, authorization, and error payloads
- Policies: each role's allowed actions
- Frontend: route rendering, form behavior, and error/loading states

No feature is complete without tests for its authorization and failure paths.

## CI/CD and deployment

- CI is defined in `.github/workflows/ci.yml` with separate backend and frontend
  jobs.
- Backend: RuboCop, Brakeman, bundler-audit, tests, and system tests.
- Frontend: lint, formatting, typecheck, tests, and production build.
- Once PostgreSQL is adopted, add a PostgreSQL service to the backend CI job.
- Once GraphQL exists, verify that the committed schema and generated frontend
  types are current.

Deployment target:

- Backend: Docker + Kamal on EC2
- Database: Amazon RDS for PostgreSQL
- Frontend: static build on S3 behind CloudFront
- DNS/TLS: Route53 + ACM
- Secrets: Kamal secrets or AWS SSM; never commit them

Run deployment commands from `backend/` or use the root wrapper:

```bash
bin/kamal deploy
```

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
- Migrations are committed; schema and GraphQL types are regenerated if needed.
- Documentation or AGENTS.md is updated when conventions or commands change.
- No secrets, credentials, or generated build output are committed.
- The final response summarizes what changed and which checks were run.
