# Gear data

The Gear API accepts YAML documents with a top-level `book` and `gears` array.
Fantasy Companion-derived data belongs in the ignored `private/` directory and
must be generated from a legally owned copy of the book. The importer supports
additional private files without requiring a code change.

Each entry stores mechanical values in `effects`, prerequisites in
`requirements`, exact source pricing in `cost_text`, and optional artwork as an
`artwork_url`. We intentionally do not store weight or encumbrance.
