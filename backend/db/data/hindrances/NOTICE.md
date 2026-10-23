# Hindrance data attribution

`swade.yml` contains mechanical hindrance data derived from the official SWADE
Foundry Virtual Tabletop system:

- Source: <https://gitlab.com/peginc/swade>
- Copyright: Pinnacle Entertainment Group
- License: Apache License 2.0 (see `LICENSE`)

The tracked `swade.yml` data is limited to hindrance names, severities,
requirements, and source page references. Licensed descriptions extracted from
legally owned rulebooks may be placed in the ignored `private/` directory and
are loaded locally by the same importer. Description-only overlays use a
`descriptions` array keyed by the mechanical record's `slug`.

Savage Worlds, SWADE, and Fantasy Companion are trademarks of Pinnacle
Entertainment Group. This project is not affiliated with or endorsed by
Pinnacle Entertainment Group.

Fantasy Companion hindrance data is not included in this repository. Files
placed in `private/` are ignored by git and must be derived from a legally owned
copy of the Fantasy Companion.
