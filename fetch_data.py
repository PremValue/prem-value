"""
fetch_data.py
Fetches 2024-25 Premier League squad stats from FBRef via soccerdata
and exports a merged JSON file for the dashboard.
"""

import json
import warnings
import pandas as pd

warnings.filterwarnings("ignore")

try:
    import soccerdata as sd
except ImportError:
    print("ERROR: soccerdata not installed. Run: pip3 install soccerdata")
    raise

LEAGUE = "ENG-Premier League"
SEASON = "24-25"
OUT_FILE = "data/squads.json"

print(f"Fetching FBRef data for {LEAGUE} {SEASON}...")

fbref = sd.FBref(leagues=LEAGUE, seasons=SEASON)

# ── Fetch each stat category ────────────────────────────────────────────────

def fetch(stat_type, label):
    print(f"  → {label}...")
    try:
        df = fbref.read_team_season_stats(stat_type=stat_type)
        # Flatten MultiIndex columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ["_".join(filter(None, col)).strip() for col in df.columns]
        df = df.reset_index()
        return df
    except Exception as e:
        print(f"    WARNING: could not fetch {label}: {e}")
        return None

standard  = fetch("standard",  "Standard (G/A/Mins)")
shooting  = fetch("shooting",  "Shooting (xG)")
passing   = fetch("passing",   "Passing")
defense   = fetch("defense",   "Defense")
misc      = fetch("misc",      "Misc (Fouls/Cards)")

# ── Identify the team column ─────────────────────────────────────────────────

def get_team_col(df):
    """Return the name of the team column (varies by soccerdata version)."""
    for candidate in ["team", "squad", "Team", "Squad"]:
        if candidate in df.columns:
            return candidate
    # Fallback: first string column
    for col in df.columns:
        if df[col].dtype == object:
            return col
    return df.columns[0]

# ── Merge ────────────────────────────────────────────────────────────────────

merged = None

for df, name in [
    (standard, "standard"),
    (shooting,  "shooting"),
    (passing,   "passing"),
    (defense,   "defense"),
    (misc,      "misc"),
]:
    if df is None:
        continue
    tc = get_team_col(df)

    # Keep only the season level if there's a "season" index column
    if "season" in df.columns:
        df = df[df["season"] == SEASON] if df["season"].nunique() > 1 else df

    # Drop duplicate/index columns that will conflict
    drop_cols = [c for c in ["league", "season"] if c in df.columns]
    df = df.drop(columns=drop_cols, errors="ignore")

    # Rename team col to a standard name
    df = df.rename(columns={tc: "team"})
    df["team"] = df["team"].astype(str).str.strip()

    if merged is None:
        merged = df
    else:
        # Drop columns already present (except team)
        overlap = [c for c in df.columns if c in merged.columns and c != "team"]
        df = df.drop(columns=overlap, errors="ignore")
        merged = merged.merge(df, on="team", how="outer")

if merged is None or merged.empty:
    print("ERROR: No data fetched. Check network/FBRef access.")
    raise SystemExit(1)

# ── Select & rename key metrics ──────────────────────────────────────────────

print("Processing merged data...")
print("Available columns:", list(merged.columns))

# Helper to find a column by partial name (case-insensitive)
def find_col(keywords, df=merged):
    kws = [k.lower() for k in keywords]
    for col in df.columns:
        cl = col.lower()
        if all(k in cl for k in kws):
            return col
    return None

def safe_float(df, col):
    if col and col in df.columns:
        return pd.to_numeric(df[col], errors="coerce").round(2)
    return pd.Series([None] * len(df))

# Build output dataframe
out = pd.DataFrame()
out["team"] = merged["team"]

# Matches played
mp_col = find_col(["mp"]) or find_col(["matches"])
out["matches_played"] = safe_float(merged, mp_col)

# Goals & Assists
gls_col = find_col(["gls"]) or find_col(["goals"])
ast_col = find_col(["ast"]) or find_col(["assists"])
out["goals"]   = safe_float(merged, gls_col)
out["assists"] = safe_float(merged, ast_col)

# xG / xAG
xg_col  = find_col(["xg"])
xag_col = find_col(["xag"]) or find_col(["xassist"])
out["xG"]  = safe_float(merged, xg_col)
out["xAG"] = safe_float(merged, xag_col)

# Possession %
poss_col = find_col(["poss"])
out["possession"] = safe_float(merged, poss_col)

# Progressive carries / passes
prog_c_col = find_col(["prgc"]) or find_col(["progressive", "carr"])
prog_p_col = find_col(["prgp"]) or find_col(["progressive", "pass"])
out["progressive_carries"] = safe_float(merged, prog_c_col)
out["progressive_passes"]  = safe_float(merged, prog_p_col)

# Tackles won
tkl_col = find_col(["tkl"])
out["tackles"] = safe_float(merged, tkl_col)

# Yellow / Red cards
yc_col = find_col(["crdy"]) or find_col(["yellow"])
rc_col = find_col(["crdr"]) or find_col(["red"])
out["yellow_cards"] = safe_float(merged, yc_col)
out["red_cards"]    = safe_float(merged, rc_col)

# Clean sheets / GA (if available)
ga_col = find_col(["ga"]) or find_col(["goals_against"])
cs_col = find_col(["cs"]) or find_col(["clean"])
out["goals_against"] = safe_float(merged, ga_col)
out["clean_sheets"]  = safe_float(merged, cs_col)

# ── Compute composite performance score (normalized 0–100) ──────────────────

metrics = {
    "goals":               1.5,
    "assists":             1.0,
    "xG":                  1.2,
    "xAG":                 0.8,
    "progressive_carries": 0.5,
    "progressive_passes":  0.5,
    "tackles":             0.8,
}

score = pd.Series([0.0] * len(out))
for col, weight in metrics.items():
    if col in out.columns:
        s = pd.to_numeric(out[col], errors="coerce").fillna(0)
        max_val = s.max()
        if max_val > 0:
            score += (s / max_val) * weight

# Normalize to 0–100
score = (score / score.max() * 100).round(1)
out["performance_score"] = score

# ── Sort & export ─────────────────────────────────────────────────────────────

out = out.sort_values("performance_score", ascending=False).reset_index(drop=True)
out = out.where(pd.notnull(out), None)  # Replace NaN with None for JSON

records = out.to_dict(orient="records")

import os
os.makedirs("data", exist_ok=True)
with open(OUT_FILE, "w") as f:
    json.dump(records, f, indent=2)

print(f"\n✓ Saved {len(records)} teams to {OUT_FILE}")
print(f"  Top 3: {[r['team'] for r in records[:3]]}")
print("\nDone! Open index.html in your browser to see the dashboard.")
