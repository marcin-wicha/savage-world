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
- `POST /graphql` — GraphQL endpoint

Deployment uses Kamal from this directory:

```bash
bin/kamal deploy
```

See the root [AGENTS.md](../AGENTS.md) for architecture and conventions.
