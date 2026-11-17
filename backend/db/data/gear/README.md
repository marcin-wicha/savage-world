# Gear data

The Gear API accepts YAML documents with a top-level `book` and `gears` array.
Fantasy Companion-derived data belongs in the ignored `private/` directory and
must be generated from a legally owned copy of the book. The importer supports
additional private files without requiring a code change.

Each entry stores mechanical values in `effects`, prerequisites in
`requirements`, exact source pricing in `cost_text`, and optional artwork as an
`artwork_url`. We intentionally do not store weight or encumbrance.

## Combat keys in `effects`

`Gears::CombatProfile` reads these optional keys from `effects` so equipped
items work in derived statistics and the battle simulator. Other keys are kept
for display only. Invalid values are ignored rather than rejected.

| Key | Example | Meaning |
| --- | --- | --- |
| `damage` | `Str+d8`, `2d6+1` | Damage expression; marks the item as a weapon |
| `ap` | `2` | Armor Piercing |
| `range` | `12/24/48` | Short/Medium/Long range in inches |
| `rof` | `1` | Rate of Fire |
| `reach` | `1` | Extra melee reach in inches |
| `parry` | `1` | Parry modifier while equipped |
| `armor` | `2` | Armor bonus (the highest equipped non-shield value applies) |
| `min_str` | `d8` | Minimum Strength |
| `shots` | `1` | Shots before reloading |
| `cover` | `2` | Shield cover against ranged attacks |
| `blast` | `MBT` | Area template: `SBT`, `MBT`, `LBT`, or `Cone` |
| `thrown` | `true` | Thrown weapon (melee weapons with a range are thrown) |
| `two_handed` | `true` | Requires both hands |
| `skill` | `athletics` | Overrides the attack skill (`fighting`, `shooting`, `athletics`) |
