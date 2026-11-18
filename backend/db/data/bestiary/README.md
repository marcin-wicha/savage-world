# Private bestiary seeds

The Core Rulebook and Fantasy Companion stat blocks are copyrighted. Do not
commit the PDFs or the generated `private/*.yml` files. The seed task imports
those files, if present, into the `admin` account. `source_key` identifies an
imported entry independently of its display name, so user-created templates
are not changed. Later files override matching Core entries; the extraction
script also maps the Core Dragon and Goblin to the corresponding Fantasy
Companion Mature Dragon and Goblin Warrior entries.

From `backend/`, install `pdf-reader` locally (`gem install pdf-reader`) and run:

```bash
ruby script/extract_bestiary.rb \
  '/path/to/SWADE - Core Rulebook (v5.4).pdf' \
  '/path/to/SWADE_Fantasy_Companion.pdf'
bin/rails db:seed
```

For OCI deployment, transfer `core.yml` and `fantasy.yml` over SSH to
`/var/www/savage-worlds-private-data/bestiary/` (owned by the deployment user,
readable by container UID 1000). The private Compose override mounts that
directory read-only, and the deploy runs `db:seed` against the production DB.
A local `db:seed` only changes the local database.

**Review the private YAML against your PDFs before running `db:seed`.** The
extractor is a best-effort starting point, not a faithful digitization: it
only keeps stat blocks with all five attributes and a Pace/Parry/Toughness
line on the same page and column, and does not reliably recover Wild Card
status, Edges, special abilities, multiline attacks, or all weapons. Skill
names can also be lost to PDF typography. Correct these fields in the private
YAML as needed. Do not use unreviewed templates for rules-accurate simulations.
The importer validates the entire batch before writing it and does not delete
existing templates when a private file is absent.
