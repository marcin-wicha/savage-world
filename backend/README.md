# Savage Worlds Backend

Rails API for the Savage Worlds character builder.

## Current state

The Rails application is being migrated from a default Rails app to an API-only
service. The target stack is:

- Rails 8 API-only
- PostgreSQL
- GraphQL via `graphql-ruby`
- Session-cookie authentication
- RSpec + FactoryBot

Until that migration is complete, the existing Rails commands and SQLite
database remain in place.

## Commands

Run these from `backend/`:

```bash
bin/setup
bin/dev
bin/rails test
bin/rubocop
bin/brakeman
bin/bundler-audit
bin/ci
```

Deployment uses Kamal from this directory:

```bash
bin/kamal deploy
```

See the root [AGENTS.md](../AGENTS.md) for architecture and conventions.
