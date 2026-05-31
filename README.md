# PremValue

PremValue is a static Premier League 2024-2025 value-for-money dashboard.

The dashboard includes a wage-based team efficiency table and spending trend
line, linked club drill-down views, a filterable player explorer, and a
formation-aware Best Value XI builder with optional budget and per-club limits.

## Data Pipeline

The checked-in JSON files under `data/` are curated source snapshots. The
browser reads one generated artifact: `data/dashboard.json`.

Build and validate the bundle with:

```powershell
python fetch_data.py
python fetch_data.py --check
```

The build also regenerates `prem-value-for-money.html`, the self-contained
version of the dashboard. Both dashboard variants therefore use the same
validated data.

The build performs deterministic cleanup and validation:

- validates required fields and the 20-club standings table;
- generates and validates team efficiency metrics, value ranks, regression
  predictions, and spending residuals;
- verifies club references across finance, player, scorer, assist, goalkeeper,
  and squad-enrichment snapshots;
- validates finance source URLs, dates, confidence levels, and notable-player
  club associations;
- verifies that the player snapshot covers all clubs and all four broad
  positions;
- flags missing or stale player valuations and excludes stale valuations from
  featured value-for-money rankings;
- normalizes shortened club names in `data/squads.json`;
- removes duplicate player aliases such as `Cole Palmer (ast)`;
- reports cross-file inconsistencies as warnings.

## Optional FBRef Refresh

`data/squads.json` is optional FBRef team-stat enrichment. Refresh it together
with the authoritative `data/standings.json` snapshot and rebuild the bundle
with:

```powershell
pip install pandas soccerdata
python fetch_data.py --refresh-squads
```

Some enrichment fields may be `null` when the installed `soccerdata` version
or current FBRef team tables do not expose them.

## Optional Player Refresh

`data/players.json` contains the complete 2024-2025 Premier League player roster.
Its performance data comes from FBRef and its end-of-season market values use
the latest Transfermarkt record on or before `2025-05-31` from the CC0
[`dcaribou/transfermarkt-datasets`](https://github.com/dcaribou/transfermarkt-datasets)
export. Player market values are stored and displayed in millions of euros.
The joined valuation snapshot is stored separately in
`data/player_values.json`.

Refresh the snapshots and rebuild the bundle with:

```powershell
pip install pandas requests lxml soccerdata
python fetch_data.py --refresh-players
```

Because the dashboard is locked to the completed 2024-2025 season, the refresh
reuses soccerdata's cached FBRef standard player table when it is available.
If the cache is absent, soccerdata fetches it before building the snapshot.
Players without a published Transfermarkt record remain visible in the roster
with a `null` value but are excluded from featured value-for-money rankings.

Valuations more than 180 days older than the `2025-05-31` cutoff remain visible
for transparency but are excluded from featured rankings and bargain cards.

## Finance Sources

`data/finance_sources.json` records the provenance and confidence level for
team squad values, Capology annual payroll estimates, and notable-player wage
estimates. `data/finances.json` references those source IDs. Capology payrolls
are rounded gross annual base-payroll estimates; squad values are directional
estimates and are explicitly marked low confidence.

The normal build does not need network access or third-party Python packages.
