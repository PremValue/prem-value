# PremValue

PremValue is a static Premier League 2024-2025 value-for-money dashboard.

The dashboard includes a wage-based team efficiency table and spending trend
line, linked club drill-down views, a tactical club comparison, a filterable
player explorer, and a formation-aware Best Value XI builder with optional
budget and per-club limits.

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
- calculates reproducible squad values as dated aggregates of player valuations;
- compares derived euro squad totals with converted external GBP references
  using the checked-in ECB exchange-rate snapshot;
- computes versioned position-aware player scores from role-specific metrics;
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
or current FBRef team tables do not expose them. The generated data-health
panel reports those coverage gaps explicitly.

## Optional Understat Refresh

`data/understat.json` is a dated EPL 2024-2025 snapshot used for team `xG` and
`xGA` plus player `xG` and `xA`. Refresh and rebuild it with:

```powershell
pip install requests
python fetch_data.py --refresh-understat
```

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

The player refresh also joins the FBRef miscellaneous and goalkeeper tables.
Those supported tables provide tackles won, interceptions, clean sheets, saves,
and save percentage. Current FBRef historical tables do not expose progression,
blocks, or clearances through `soccerdata 1.9.0`; missing optional inputs remain
`null` or are omitted from score weighting rather than being treated as zero.

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
are rounded gross annual base-payroll estimates. Curated club squad values are
directional, low-confidence external references only.

The canonical club squad values shown by the dashboard are derived in euros by
summing dated player valuations at the `2025-05-31` cutoff. The discrepancy
report converts external GBP references using `data/exchange_rates.json`, an
ECB reference-rate snapshot dated `2025-05-30`, the last trading day before the
cutoff.

## Position-Aware Player Scores

Player value-for-money rankings use a generated role score rather than raw
goals plus assists. The pipeline converts role inputs to within-position
percentiles and applies versioned `GK`, `DF`, `MF`, and `FW` weights. Available
metrics are reweighted when an optional source field is unavailable, and each
player record exposes a score completeness percentage and component breakdown.

The normal build does not need network access or third-party Python packages.
