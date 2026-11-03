# Savage Worlds Backend

Rails API for the Savage Worlds character builder.

## Stack

- Rails 8 API-only
- PostgreSQL
- GraphQL via `graphql-ruby`
- Session-cookie authentication with CSRF protection
- RSpec + FactoryBot

## Local setup

Start PostgreSQL first, using a system service, a local `initdb` cluster, or
Docker. The app expects a local PostgreSQL user matching your OS user and no
password by default. Override with `DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_USERNAME`, and `DATABASE_PASSWORD`.

Then run from `backend/`:

```bash
bin/setup
bin/dev
```

## Commands

```bash
bin/setup
bin/dev
bin/rails server
bin/rails console
bin/rails db:prepare
bin/rails db:migrate
bin/rails db:seed
bundle exec rspec
bin/rubocop
bin/brakeman
bin/bundler-audit
bin/ci
```

Regenerate the checked-in GraphQL schema after schema changes:

```bash
bin/rails graphql:schema:dump
```

Then regenerate frontend types from the repository root:

```bash
pnpm --dir frontend codegen
```

## API

- `GET /api/v1/session` — current user and CSRF token
- `POST /api/v1/session` — sign in
- `DELETE /api/v1/session` — sign out
- `POST /api/v1/registrations` — register with `{ "user": { "email_address": "...", "password": "...", "password_confirmation": "..." } }`; new accounts await admin approval and cannot sign in until approved
- `GET /api/v1/admin/users` — admin-only pending account list; returns `{ "users": [{ "id": 1, "email_address": "...", "role": "user" }] }`
- `PATCH /api/v1/admin/users/:id/approve` — admin-only approval; returns `{ "user": { "id": 1, "email_address": "...", "role": "user" } }`


Registration returns `201` with `{ "message": "Registration pending approval" }` without signing in. Invalid input returns `422` with `error` and `details`; missing CSRF returns `422`. Pending accounts receive `401` on sign-in (same error as invalid credentials), and authenticated routes reject and clear any old session after approval is revoked. Admin endpoints return `401` without a session, `403` for non-admin users, `404` for missing users, and `422` when approving an already approved user.
- `POST /graphql` — GraphQL endpoint

Deployment uses Kamal from this directory:

```bash
bin/kamal deploy
```

See the root [AGENTS.md](../AGENTS.md) for architecture and conventions.
