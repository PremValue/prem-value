# PremValue

PremValue is a static Premier League 2024-25 value-for-money dashboard.

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
- verifies club references across finance, player, scorer, assist, goalkeeper,
  and squad-enrichment snapshots;
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

The normal build does not need network access or third-party Python packages.
