"""
Build the reproducible 2024-2025 PremValue dashboard data bundle.

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
import csv
import gzip
import hashlib
import io
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DASHBOARD_FILE = DATA_DIR / "dashboard.json"
STANDALONE_FILE = ROOT / "prem-value-for-money.html"

SEASON = "2024-2025"
SOURCE_NAMES = (
    "standings",
    "scorers",
    "assists",
    "goalkeeping",
    "facts",
    "finances",
    "players",
    "player_values",
    "squads",
)

TRANSFERMARKT_DATA_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"
PLAYER_VALUATION_CUTOFF = "2025-05-31"

TEAM_ALIASES = {
    "Brighton": "Brighton & Hove Albion",
    "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United",
    "Nottm Forest": "Nottingham Forest",
    "Tottenham": "Tottenham Hotspur",
    "West Ham": "West Ham United",
    "Wolves": "Wolverhampton Wanderers",
}

TRANSFERMARKT_CLUB_IDS = {
    "Arsenal": 11,
    "Liverpool": 31,
    "Manchester City": 281,
    "Chelsea": 631,
    "Manchester United": 985,
    "Tottenham Hotspur": 148,
    "Aston Villa": 405,
    "Newcastle United": 762,
    "Brighton & Hove Albion": 1237,
    "Crystal Palace": 873,
    "Bournemouth": 989,
    "Nottingham Forest": 703,
    "Wolverhampton Wanderers": 543,
    "Brentford": 1148,
    "West Ham United": 379,
    "Everton": 29,
    "Fulham": 931,
    "Southampton": 180,
    "Ipswich Town": 677,
    "Leicester City": 1003,
}

PLAYER_NAME_ALIASES = {
    "Joshua Acheampong": "Josh Acheampong",
    "Victor Bernth Kristiansen": "Victor Kristiansen",
    "Ben Brereton": "Ben Brereton D\u00edaz",
    "Emi Buend\u00eda": "Emiliano Buend\u00eda",
    "J\u00e1der Dur\u00e1n": "Jhon Dur\u00e1n",
    "Yunus Emre Konak": "Yunus Konak",
    "\u0141ukasz Fabia\u0144ski": "Lukasz Fabianski",
    "Abdul Fatawu Issahaku": "Abdul Fatawu",
    "Idrissa Gana Gueye": "Idrissa Gueye",
    "Toti Gomes": "Toti",
    "Nicol\u00e1s Gonz\u00e1lez": "Nico Gonz\u00e1lez",
    "Albert Gr\u00f8nbaek": "Albert Gr\u00f8nb\u00e6k",
    "Hwang Hee-chan": "Hee-chan Hwang",
    "Son Heung-min": "Heung-min Son",
    "Andy Irving": "Andrew Irving",
    "Kim Jisoo": "Ji-soo Kim",
    "Ferdi Kadioglu": "Ferdi Kad\u0131o\u011flu",
    "Max Kilman": "Maximilian Kilman",
    "Valentino Livramento": "Tino Livramento",
    "Gabriel Magalh\u00e3es": "Gabriel",
    "Edmond-Paris Maghoma": "Paris Maghoma",
    "Mykhailo Mudryk": "Mykhaylo Mudryk",
    "Chidozie Obi-Martin": "Chido Obi",
    "Emerson Palmieri": "Emerson",
    "Jaden Philogene Bidace": "Jaden Philogene",
    "Danilo Santos": "Danilo",
    "William Smallbone": "Will Smallbone",
    "Kostas Tsimikas": "Konstantinos Tsimikas",
    "Nathan Wood-Gordon": "Nathan Wood",
    "Yehor Yarmoliuk": "Yegor Yarmolyuk",
    "Illia Zabarnyi": "Ilya Zabarnyi",
}

# These short names refer to multiple Transfermarkt profiles. Keep the choice
# explicit so a new profile with the same display name cannot change the join.
PLAYER_PROFILE_OVERRIDES = {
    ("Aston Villa", "jader duran"): 649317,
    ("Arsenal", "gabriel magalhaes"): 435338,
    ("Nottingham Forest", "danilo santos"): 808509,
    ("West Ham United", "emerson palmieri"): 181778,
    ("Bournemouth", "neto"): 111819,
    ("Wolverhampton Wanderers", "chiquinho"): 695454,
}

REQUIRED_FIELDS = {
    "standings": {"position", "team", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts"},
    "scorers": {"rank", "player", "club", "apps", "goals", "assists"},
    "assists": {"rank", "player", "club", "apps", "goals", "assists"},
    "goalkeeping": {"rank", "goalkeeper", "club", "apps", "clean_sheets", "goals_conceded"},
    "finances": {"team", "squad_value_m", "wage_bill_m", "famous_players"},
    "players": {
        "player",
        "club",
        "position",
        "raw_position",
        "age",
        "apps",
        "mins",
        "goals",
        "assists",
        "market_value_m",
        "valuation_date",
    },
    "player_values": {
        "player",
        "club",
        "transfermarkt_id",
        "market_value_m",
        "valuation_date",
        "source_url",
    },
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
    parser.add_argument(
        "--refresh-players",
        action="store_true",
        help="Refresh the complete player roster and end-of-season valuations.",
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


def canonical_player_name(name: str) -> str:
    replacements = str.maketrans(
        {
            "\u00f8": "o",
            "\u00d8": "O",
            "\u0142": "l",
            "\u0141": "L",
            "\u0131": "i",
            "\u00e6": "ae",
            "\u00c6": "Ae",
        }
    )
    normalized = unicodedata.normalize("NFKD", name.translate(replacements))
    ascii_name = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", ascii_name.lower()).split())


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


def validate_players(
    players: list[dict[str, Any]], standings_teams: set[str], warnings: list[str]
) -> None:
    if len(players) < 400:
        raise DataValidationError(
            f"Expected a league-wide player snapshot, found only {len(players)} rows"
        )

    player_teams = {row["club"] for row in players}
    if player_teams != standings_teams:
        missing = sorted(standings_teams - player_teams)
        unknown = sorted(player_teams - standings_teams)
        raise DataValidationError(
            "Player club coverage mismatch "
            f"(missing: {', '.join(missing) or 'none'}; "
            f"unknown: {', '.join(unknown) or 'none'})"
        )

    positions = {row["position"] for row in players}
    expected_positions = {"GK", "DF", "MF", "FW"}
    if not expected_positions <= positions:
        raise DataValidationError(
            "Player snapshot must include goalkeepers, defenders, midfielders, and forwards"
        )

    missing_values = [row for row in players if row["market_value_m"] is None]
    if missing_values:
        warnings.append(
            f"{len(missing_values)} players have no published Transfermarkt valuation; "
            "their market value remains null."
        )


def validate_player_values(
    players: list[dict[str, Any]], player_values: list[dict[str, Any]]
) -> None:
    player_keys = {(row["player"], row["club"]) for row in players}
    value_keys = {(row["player"], row["club"]) for row in player_values}
    if player_keys != value_keys:
        raise DataValidationError("data/player_values.json must match data/players.json")


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
    validate_club_references("player_values", sources["player_values"], "club", standings_teams)

    players = dedupe_players(sources["players"], warnings)
    validate_players(players, standings_teams, warnings)
    validate_player_values(players, sources["player_values"])
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

    print("Refreshing optional FBRef squad enrichment for ENG-Premier League 2024-2025...")
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


def cached_fbref_player_frame(pandas: Any) -> Any | None:
    cache_path = (
        Path.home()
        / "soccerdata"
        / "data"
        / "FBref"
        / "players_ENG-Premier League_2425_standard.html"
    )
    if not cache_path.exists():
        return None

    from lxml import etree, html
    from soccerdata.fbref import _parse_table

    print(f"  Reading cached FBRef player stats from {cache_path}...")
    tree = html.parse(str(cache_path))
    comments = tree.xpath("//comment()[contains(.,'div_stats_standard')]")
    if not comments:
        raise DataValidationError(f"Cached FBRef file has no player table: {cache_path}")
    parser = etree.HTMLParser(recover=True)
    tables = etree.fromstring(comments[0].text, parser).xpath(
        "//table[contains(@id, 'stats_standard')]"
    )
    if not tables:
        raise DataValidationError(f"Cached FBRef file has no player table: {cache_path}")
    dataframe = _parse_table(tables[0])
    if isinstance(dataframe.columns, pandas.MultiIndex):
        dataframe.columns = [
            "_".join(
                str(part)
                for part in column
                if part and not str(part).startswith("Unnamed:")
            ).strip()
            for column in dataframe.columns
        ]
    return dataframe.reset_index()


def download_transfermarkt_csv(requests: Any, filename: str) -> list[dict[str, str]]:
    print(f"  Downloading {filename}...")
    response = requests.get(
        f"{TRANSFERMARKT_DATA_BASE}/{filename}",
        headers={"User-Agent": "Mozilla/5.0 (compatible; PremValue educational data pipeline)"},
        timeout=60,
    )
    response.raise_for_status()
    with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as compressed:
        text = io.TextIOWrapper(compressed, encoding="utf-8")
        return list(csv.DictReader(text))


def normalized_position(raw_position: str) -> str:
    positions = raw_position.split(",")
    if positions and positions[0] in {"GK", "DF", "MF", "FW"}:
        return positions[0]
    return "FW"


def refresh_players() -> None:
    try:
        import pandas as pd
        import requests
        import soccerdata as sd
    except ImportError as exc:
        raise DataValidationError(
            "Refreshing players requires pandas, requests, lxml, and soccerdata. "
            "Install them with: pip install pandas requests lxml soccerdata"
        ) from exc

    print("Refreshing complete 2024-2025 Premier League player snapshot...")
    dataframe = cached_fbref_player_frame(pd)
    if dataframe is None:
        print("  Fetching standard player stats from FBRef...")
        fbref = sd.FBref(leagues="ENG-Premier League", seasons="24-25")
        dataframe = flatten_columns(fbref.read_player_season_stats(stat_type="standard"), pd)

    def column(*candidates: str) -> str:
        for candidate in candidates:
            if candidate in dataframe.columns:
                return candidate
        raise DataValidationError(
            f"FBRef player table is missing expected columns: {', '.join(candidates)}"
        )

    player_col = column("player", "Player")
    team_col = column("team", "Squad")
    position_col = column("pos", "Pos")
    age_col = column("age", "Age")
    apps_col = column("Playing Time_MP")
    mins_col = column("Playing Time_Min")
    goals_col = column("Performance_Gls")
    assists_col = column("Performance_Ast")

    dataframe = dataframe[dataframe[player_col] != "Player"].copy()
    for numeric_col in (apps_col, mins_col, goals_col, assists_col):
        dataframe[numeric_col] = pd.to_numeric(dataframe[numeric_col], errors="coerce").fillna(0)

    stats_rows = []
    for player, rows in dataframe.groupby(player_col, sort=True):
        primary = rows.sort_values(mins_col, ascending=False).iloc[0]
        raw_position = str(primary[position_col])
        age_text = str(primary[age_col]).split("-", maxsplit=1)[0]
        age = int(float(age_text)) if age_text not in {"<NA>", "nan"} else None
        stats_rows.append(
            {
                "player": str(player),
                "club": canonical_team(str(primary[team_col])),
                "position": normalized_position(raw_position),
                "raw_position": raw_position,
                "age": age,
                "apps": int(rows[apps_col].sum()),
                "mins": int(rows[mins_col].sum()),
                "goals": int(rows[goals_col].sum()),
                "assists": int(rows[assists_col].sum()),
            }
        )

    profiles = download_transfermarkt_csv(requests, "players.csv.gz")
    valuations = download_transfermarkt_csv(requests, "player_valuations.csv.gz")
    profiles_by_id = {int(row["player_id"]): row for row in profiles}
    profiles_by_name: dict[str, list[dict[str, str]]] = {}
    for profile in profiles:
        profiles_by_name.setdefault(canonical_player_name(profile["name"]), []).append(profile)

    latest_valuations: dict[int, dict[str, str]] = {}
    for valuation in valuations:
        valuation_date = valuation["date"]
        if not valuation_date or valuation_date > PLAYER_VALUATION_CUTOFF:
            continue
        player_id = int(valuation["player_id"])
        previous = latest_valuations.get(player_id)
        if previous is None or valuation_date > previous["date"]:
            latest_valuations[player_id] = valuation

    player_values = []
    unresolved = []
    for player in stats_rows:
        player_name = player["player"]
        club = player["club"]
        normalized_name = canonical_player_name(player_name)
        player_id = PLAYER_PROFILE_OVERRIDES.get((club, normalized_name))

        if player_id is None:
            transfermarkt_name = PLAYER_NAME_ALIASES.get(player_name, player_name)
            candidates = profiles_by_name.get(canonical_player_name(transfermarkt_name), [])
            matching_club = [
                profile
                for profile in candidates
                if (
                    latest_valuations.get(int(profile["player_id"]), {}).get("current_club_id")
                    == str(TRANSFERMARKT_CLUB_IDS[club])
                )
            ]
            if len(matching_club) == 1:
                player_id = int(matching_club[0]["player_id"])
            elif len(candidates) == 1:
                player_id = int(candidates[0]["player_id"])
            else:
                unresolved.append(f"{player_name} ({club})")
                continue

        profile = profiles_by_id.get(player_id)
        if profile is None:
            unresolved.append(f"{player_name} ({club})")
            continue
        valuation = latest_valuations.get(player_id)
        market_value_m = (
            round(int(valuation["market_value_in_eur"]) / 1_000_000, 3)
            if valuation and valuation["market_value_in_eur"]
            else None
        )
        player["market_value_m"] = market_value_m
        player["valuation_date"] = valuation["date"] if valuation else None
        player_values.append(
            {
                "player": player_name,
                "club": club,
                "transfermarkt_id": player_id,
                "market_value_m": market_value_m,
                "valuation_date": valuation["date"] if valuation else None,
                "source_url": profile["url"],
            }
        )

    if unresolved:
        examples = ", ".join(unresolved[:8])
        raise DataValidationError(
            f"Could not resolve {len(unresolved)} FBRef players to Transfermarkt profiles. "
            f"Add explicit aliases or overrides. Examples: {examples}"
        )

    stats_rows.sort(key=lambda row: (row["club"], row["position"], -row["mins"], row["player"]))
    player_values.sort(key=lambda row: (row["club"], row["player"]))
    missing_values = sum(row["market_value_m"] is None for row in player_values)

    updated = [
        path.relative_to(ROOT)
        for path, content in (
            (DATA_DIR / "players.json", json_text(stats_rows)),
            (DATA_DIR / "player_values.json", json_text(player_values)),
        )
        if write_if_changed(path, content)
    ]
    if updated:
        print("Updated player snapshots:")
        for path in updated:
            print(f"  - {path}")
    else:
        print("Player snapshots are already current.")
    print(
        f"  Resolved {len(stats_rows)} players; "
        f"{missing_values} have no published valuation record."
    )


def main() -> int:
    args = parse_args()
    try:
        if args.refresh_squads:
            refresh_squads()
        if args.refresh_players:
            refresh_players()

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
