"""
Build the reproducible 2024-25 PremValue dashboard data bundle.

The checked-in JSON files in data/ are curated source snapshots. Running this
script validates them, performs small deterministic cleanups, and writes the
single data/dashboard.json artifact consumed by the web app. It also rebuilds
the self-contained prem-value-for-money.html export from the same bundle.

Use --refresh-squads to refresh the optional FBRef team-stat enrichment before
building. That network step requires pandas and soccerdata; the normal build
uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DASHBOARD_FILE = DATA_DIR / "dashboard.json"
STANDALONE_FILE = ROOT / "prem-value-for-money.html"

SEASON = "2024-25"
SOURCE_NAMES = (
    "standings",
    "scorers",
    "assists",
    "goalkeeping",
    "facts",
    "finances",
    "players",
    "squads",
)

TEAM_ALIASES = {
    "Brighton": "Brighton & Hove Albion",
    "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United",
    "Nottm Forest": "Nottingham Forest",
    "Tottenham": "Tottenham Hotspur",
    "West Ham": "West Ham United",
    "Wolves": "Wolverhampton Wanderers",
}

REQUIRED_FIELDS = {
    "standings": {"position", "team", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts"},
    "scorers": {"rank", "player", "club", "apps", "goals", "assists"},
    "assists": {"rank", "player", "club", "apps", "goals", "assists"},
    "goalkeeping": {"rank", "goalkeeper", "club", "apps", "clean_sheets", "goals_conceded"},
    "finances": {"team", "squad_value_m", "wage_bill_m", "famous_players"},
    "players": {"player", "club", "position", "apps", "mins", "goals", "assists", "market_value_m"},
    "squads": {"team"},
}


class DataValidationError(Exception):
    """Raised when a source snapshot cannot produce a safe dashboard bundle."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate sources and fail if generated artifacts are stale.",
    )
    parser.add_argument(
        "--refresh-squads",
        action="store_true",
        help="Refresh data/squads.json from FBRef before building.",
    )
    return parser.parse_args()


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise DataValidationError(f"Missing source file: {path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise DataValidationError(
            f"Invalid JSON in {path.relative_to(ROOT)}: {exc}"
        ) from exc


def canonical_team(name: str) -> str:
    return TEAM_ALIASES.get(name, name)


def validate_rows(name: str, rows: Any) -> None:
    if not isinstance(rows, list):
        raise DataValidationError(f"data/{name}.json must contain a JSON array")
    if not rows:
        raise DataValidationError(f"data/{name}.json must not be empty")

    required = REQUIRED_FIELDS[name]
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise DataValidationError(f"data/{name}.json row {index + 1} must be an object")
        missing = sorted(required - row.keys())
        if missing:
            raise DataValidationError(
                f"data/{name}.json row {index + 1} is missing: {', '.join(missing)}"
            )


def validate_standings(standings: list[dict[str, Any]]) -> set[str]:
    if len(standings) != 20:
        raise DataValidationError(f"Expected 20 standings rows, found {len(standings)}")

    teams = {row["team"] for row in standings}
    positions = {row["position"] for row in standings}
    if len(teams) != 20:
        raise DataValidationError("Standings must contain 20 unique clubs")
    if positions != set(range(1, 21)):
        raise DataValidationError("Standings positions must be the numbers 1 through 20")

    for row in standings:
        if row["MP"] != row["W"] + row["D"] + row["L"]:
            raise DataValidationError(f"Standings record does not add up for {row['team']}")
        if row["GD"] != row["GF"] - row["GA"]:
            raise DataValidationError(f"Goal difference does not add up for {row['team']}")
    return teams


def validate_club_references(
    source_name: str,
    rows: list[dict[str, Any]],
    club_field: str,
    standings_teams: set[str],
) -> None:
    unknown = sorted({row[club_field] for row in rows} - standings_teams)
    if unknown:
        raise DataValidationError(
            f"data/{source_name}.json references unknown clubs: {', '.join(unknown)}"
        )


def dedupe_players(
    players: list[dict[str, Any]], warnings: list[str]
) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    seen: dict[tuple[Any, ...], str] = {}

    for player in players:
        base_name = re.sub(r"\s+\([^)]*\)$", "", player["player"]).strip()
        key = (
            base_name,
            player["club"],
            player["position"],
            player["apps"],
            player["mins"],
            player["goals"],
            player["assists"],
            player["market_value_m"],
        )
        if key in seen:
            warnings.append(
                f"Removed duplicate player alias '{player['player']}' "
                f"(kept '{seen[key]}')."
            )
            continue
        seen[key] = player["player"]
        cleaned.append(player)

    return cleaned


def normalize_squads(
    squads: list[dict[str, Any]],
    standings: list[dict[str, Any]],
    warnings: list[str],
) -> list[dict[str, Any]]:
    normalized = [{**row, "team": canonical_team(row["team"])} for row in squads]
    standings_by_team = {row["team"]: row for row in standings}
    squad_teams = {row["team"] for row in normalized}
    standings_teams = set(standings_by_team)

    missing = sorted(standings_teams - squad_teams)
    unknown = sorted(squad_teams - standings_teams)
    if missing or unknown:
        parts = []
        if missing:
            parts.append(f"missing clubs: {', '.join(missing)}")
        if unknown:
            parts.append(f"unknown clubs: {', '.join(unknown)}")
        raise DataValidationError(f"data/squads.json club coverage mismatch ({'; '.join(parts)})")

    mismatches = []
    overlap = {
        "matches_played": "MP",
        "goals": "GF",
        "goals_against": "GA",
        "points": "Pts",
        "position": "position",
    }
    for squad in normalized:
        standing = standings_by_team[squad["team"]]
        for squad_field, standing_field in overlap.items():
            squad_value = squad.get(squad_field)
            standing_value = standing[standing_field]
            if squad_value is not None and squad_value != standing_value:
                mismatches.append(
                    f"{squad['team']} {squad_field}={squad_value} "
                    f"(standings {standing_field}={standing_value})"
                )
    if mismatches:
        examples = "; ".join(mismatches[:3])
        raise DataValidationError(
            f"data/squads.json contains {len(mismatches)} league-table values that "
            f"differ from data/standings.json. Run: python fetch_data.py "
            f"--refresh-squads. Examples: {examples}"
        )

    return sorted(normalized, key=lambda row: standings_by_team[row["team"]]["position"])


def validate_cross_file_facts(
    standings: list[dict[str, Any]], facts: dict[str, Any], warnings: list[str]
) -> None:
    matches = sum(row["MP"] for row in standings) // 2
    stated_matches = int(facts["Total matches played"])
    if matches != stated_matches:
        warnings.append(
            f"Facts report {stated_matches} matches but standings imply {matches}."
        )

    goals = sum(row["GF"] for row in standings)
    stated_goals = int(facts["Total goals scored"])
    if goals != stated_goals:
        warnings.append(
            f"Facts report {stated_goals} goals but standings sum to {goals}."
        )


def source_digest(name: str) -> str:
    digest = hashlib.sha256((DATA_DIR / f"{name}.json").read_bytes()).hexdigest()
    return f"sha256:{digest}"


def build_bundle() -> tuple[dict[str, Any], list[str]]:
    sources = {name: read_json(DATA_DIR / f"{name}.json") for name in SOURCE_NAMES}
    warnings: list[str] = []

    for name in SOURCE_NAMES:
        if name != "facts":
            validate_rows(name, sources[name])

    facts = sources["facts"]
    if not isinstance(facts, dict):
        raise DataValidationError("data/facts.json must contain a JSON object")

    standings = sources["standings"]
    standings_teams = validate_standings(standings)
    finances = sources["finances"]
    if {row["team"] for row in finances} != standings_teams:
        raise DataValidationError("Finance clubs must exactly match standings clubs")

    validate_club_references("scorers", sources["scorers"], "club", standings_teams)
    validate_club_references("assists", sources["assists"], "club", standings_teams)
    validate_club_references("goalkeeping", sources["goalkeeping"], "club", standings_teams)
    validate_club_references("players", sources["players"], "club", standings_teams)

    players = dedupe_players(sources["players"], warnings)
    squads = normalize_squads(sources["squads"], standings, warnings)
    validate_cross_file_facts(standings, facts, warnings)

    bundle = {
        "_meta": {
            "schema_version": 1,
            "season": SEASON,
            "generated_by": "fetch_data.py",
            "source_files": {name: source_digest(name) for name in SOURCE_NAMES},
            "warnings": warnings,
        },
        "standings": standings,
        "scorers": sources["scorers"],
        "assists": sources["assists"],
        "goalkeeping": sources["goalkeeping"],
        "facts": facts,
        "finances": finances,
        "players": players,
        "squads": squads,
    }
    return bundle, warnings


def json_text(value: Any, *, compact: bool = False) -> str:
    separators = (",", ":") if compact else None
    return json.dumps(
        value,
        ensure_ascii=False,
        indent=None if compact else 2,
        separators=separators,
    ) + ("" if compact else "\n")


def build_standalone_html(bundle: dict[str, Any]) -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    styles = (ROOT / "style.css").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    inline_data = json_text(bundle, compact=True).replace("</", "<\\/")

    html = html.replace(
        '  <link rel="stylesheet" href="style.css" />',
        f"  <style>\n{styles}\n  </style>",
    )
    html = html.replace(
        '  <script src="app.js"></script>',
        f"  <script>window.INLINE_DATA = {inline_data};</script>\n"
        f"  <script>\n{app}\n  </script>",
    )
    return html


def write_if_changed(path: Path, content: str) -> bool:
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def check_current(path: Path, expected: str) -> bool:
    return path.exists() and path.read_text(encoding="utf-8") == expected


def flatten_columns(dataframe: Any, pandas: Any) -> Any:
    if isinstance(dataframe.columns, pandas.MultiIndex):
        dataframe.columns = [
            "_".join(str(part) for part in column if part).strip()
            for column in dataframe.columns
        ]
    return dataframe.reset_index()


def refresh_squads() -> None:
    try:
        import pandas as pd
        import soccerdata as sd
    except ImportError as exc:
        raise DataValidationError(
            "Refreshing squads requires pandas and soccerdata. "
            "Install them with: pip install pandas soccerdata"
        ) from exc

    print("Refreshing optional FBRef squad enrichment for ENG-Premier League 24-25...")
    fbref = sd.FBref(leagues="ENG-Premier League", seasons="24-25")
    def fetch_frame(stat_type: str, *, opponent_stats: bool = False) -> Any:
        suffix = " against" if opponent_stats else ""
        print(f"  Fetching {stat_type}{suffix} stats...")
        dataframe = fbref.read_team_season_stats(
            stat_type=stat_type,
            opponent_stats=opponent_stats,
        )
        dataframe = flatten_columns(dataframe, pd)
        dataframe["team"] = (
            dataframe["team"]
            .astype(str)
            .str.removeprefix("vs ")
            .str.strip()
            .map(canonical_team)
        )
        return dataframe.set_index("team")

    # soccerdata 1.9 exposes these five FBRef team-stat categories. Keep each
    # table separate so duplicate column names do not overwrite one another.
    frames = {
        "standard": fetch_frame("standard"),
        "keeper": fetch_frame("keeper"),
        "shooting": fetch_frame("shooting"),
        "shooting_against": fetch_frame("shooting", opponent_stats=True),
        "playing_time": fetch_frame("playing_time"),
        "misc": fetch_frame("misc"),
    }

    def value(frame_name: str, team: str, *candidates: str) -> Any:
        dataframe = frames[frame_name]
        if team not in dataframe.index:
            return None
        row = dataframe.loc[team]
        for column in candidates:
            if column not in dataframe.columns or pd.isna(row[column]):
                continue
            return round(float(row[column]), 2)
        return None

    rows = []
    records = {}
    for team in frames["standard"].index:
        wins = value("keeper", team, "Performance_W")
        draws = value("keeper", team, "Performance_D")
        losses = value("keeper", team, "Performance_L")
        matches_played = value("standard", team, "Playing Time_MP")
        goals = value("playing_time", team, "Team Success_onG") or value(
            "standard", team, "Performance_Gls"
        )
        goals_against = value("playing_time", team, "Team Success_onGA") or value(
            "keeper", team, "Performance_GA"
        )
        points = wins * 3 + draws if wins is not None and draws is not None else None
        records[team] = {
            "matches_played": matches_played,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "goals": goals,
            "goals_against": goals_against,
            "points": points,
        }
        rows.append(
            {
                "team": team,
                "matches_played": matches_played,
                "goals": goals,
                "goals_against": goals_against,
                "assists": value("standard", team, "Performance_Ast"),
                "xG": value("shooting", team, "Expected_xG"),
                "xGA": value("shooting_against", team, "Expected_xG"),
                "possession": value("standard", team, "Poss"),
                "progressive_carries": value("standard", team, "Progression_PrgC"),
                "progressive_passes": value("standard", team, "Progression_PrgP"),
                "tackles": value("misc", team, "Performance_TklW"),
                "yellow_cards": value("misc", team, "Performance_CrdY"),
                "red_cards": value("misc", team, "Performance_CrdR"),
                "clean_sheets": value("keeper", team, "Performance_CS"),
                "points": points,
            }
        )

    rows.sort(
        key=lambda row: (
            -(row["points"] or 0),
            -((row["goals"] or 0) - (row["goals_against"] or 0)),
            -(row["goals"] or 0),
        )
    )
    for position, row in enumerate(rows, start=1):
        row["position"] = position

    def as_int(value: Any, label: str) -> int:
        if value is None or value != int(value):
            raise DataValidationError(f"FBRef returned invalid {label}: {value}")
        return int(value)

    standings = []
    for row in rows:
        team = row["team"]
        record = records[team]
        goals = as_int(record["goals"], f"goals for {team}")
        goals_against = as_int(record["goals_against"], f"goals against for {team}")
        standings.append(
            {
                "position": row["position"],
                "team": team,
                "MP": as_int(record["matches_played"], f"matches played for {team}"),
                "W": as_int(record["wins"], f"wins for {team}"),
                "D": as_int(record["draws"], f"draws for {team}"),
                "L": as_int(record["losses"], f"losses for {team}"),
                "GF": goals,
                "GA": goals_against,
                "GD": goals - goals_against,
                "Pts": as_int(record["points"], f"points for {team}"),
            }
        )
    validate_standings(standings)

    score_metrics = {
        "goals": 1.5,
        "assists": 1.0,
        "xG": 1.2,
        "progressive_carries": 0.5,
        "progressive_passes": 0.5,
        "tackles": 0.8,
    }
    maxima = {
        metric: max((row[metric] or 0 for row in rows), default=0)
        for metric in score_metrics
    }
    raw_scores = [
        sum(
            ((row[metric] or 0) / maxima[metric]) * weight
            for metric, weight in score_metrics.items()
            if maxima[metric]
        )
        for row in rows
    ]
    max_score = max(raw_scores, default=0)
    for row, score in zip(rows, raw_scores):
        row["performance_score"] = round(score / max_score * 100, 1) if max_score else None

    updated = [
        path.relative_to(ROOT)
        for path, content in (
            (DATA_DIR / "standings.json", json_text(standings)),
            (DATA_DIR / "squads.json", json_text(rows)),
        )
        if write_if_changed(path, content)
    ]
    if updated:
        print("Updated FBRef snapshots:")
        for path in updated:
            print(f"  - {path}")
    else:
        print("FBRef snapshots are already current.")


def main() -> int:
    args = parse_args()
    try:
        if args.refresh_squads:
            refresh_squads()

        bundle, warnings = build_bundle()
        dashboard_text = json_text(bundle)
        standalone_text = build_standalone_html(bundle)

        if args.check:
            stale = [
                path.relative_to(ROOT)
                for path, content in (
                    (DASHBOARD_FILE, dashboard_text),
                    (STANDALONE_FILE, standalone_text),
                )
                if not check_current(path, content)
            ]
            if stale:
                print("Generated artifacts are stale:")
                for path in stale:
                    print(f"  - {path}")
                print("Run: python fetch_data.py")
                return 1
            print("Generated artifacts are current.")
        else:
            changed = [
                path.relative_to(ROOT)
                for path, content in (
                    (DASHBOARD_FILE, dashboard_text),
                    (STANDALONE_FILE, standalone_text),
                )
                if write_if_changed(path, content)
            ]
            if changed:
                print("Updated generated artifacts:")
                for path in changed:
                    print(f"  - {path}")
            else:
                print("Generated artifacts are already current.")

        print(
            f"Built {SEASON} dashboard bundle: "
            f"{len(bundle['standings'])} clubs, {len(bundle['players'])} players."
        )
        for warning in warnings:
            print(f"WARNING: {warning}")
        return 0
    except DataValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
