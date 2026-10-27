# Power reference data

Fantasy Companion reference data is private and must not be committed. Place
locally licensed YAML in `private/*.yml`; `Powers::Importer` loads those files
when `db:seed` runs.

Each document should use this shape:

```yaml
book: Fantasy Companion
page: 146
powers:
  - name: Example Power
    rank: novice
    power_points: "2"
    duration: "3 rounds"
    range: "Smarts"
    summary: A concise, original summary.
```
