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
import html
import io
import json
import math
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DASHBOARD_FILE = DATA_DIR / "dashboard.json"
DATA_HEALTH_AUDIT_FILE = DATA_DIR / "data_health_audit.json"
STANDALONE_FILE = ROOT / "prem-value-for-money.html"

SEASON = "2024-2025"
SOURCE_NAMES = (
    "standings",
    "scorers",
    "assists",
    "goalkeeping",
    "facts",
    "finances",
    "finance_sources",
    "club_value_references",
    "players",
    "player_values",
    "squads",
    "understat",
    "exchange_rates",
)

TRANSFERMARKT_DATA_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"
UNDERSTAT_LEAGUE_URL = "https://understat.com/main/getLeagueData/EPL/2024"
PLAYER_VALUATION_CUTOFF = "2025-05-31"
PLAYER_VALUATION_STALE_DAYS = 180
PLAYER_EXPLORER_MINUTES = 500
PLAYER_FEATURED_MINUTES = 900
FINANCE_CONFIDENCE_LEVELS = {"low", "medium", "high"}
ROLE_SCORE_VERSION = "position-aware-v1"
VFM_MODEL_VERSION = "position-adjusted-v1"
SQUAD_VALUATION_DISCREPANCY_THRESHOLD = 10
ROLE_SCORE_SAMPLE_MINUTES = 500
ROLE_SCORE_WEIGHTS = {
    "FW": {
        "goals_per90": 0.30,
        "assists_per90": 0.20,
        "xg_per90": 0.30,
        "xa_per90": 0.15,
        "defensive_actions_per90": 0.05,
    },
    "MF": {
        "goals_per90": 0.15,
        "assists_per90": 0.20,
        "xg_per90": 0.15,
        "xa_per90": 0.25,
        "defensive_actions_per90": 0.20,
        "clean_sheet_credit_per90": 0.05,
    },
    "DF": {
        "goals_per90": 0.05,
        "assists_per90": 0.08,
        "xg_per90": 0.05,
        "xa_per90": 0.07,
        "defensive_actions_per90": 0.55,
        "clean_sheet_credit_per90": 0.20,
    },
    "GK": {
        "clean_sheet_credit_per90": 0.35,
        "saves_per90": 0.45,
        "save_pct": 0.20,
    },
}

TEAM_ALIASES = {
    "Brighton": "Brighton & Hove Albion",
    "Ipswich": "Ipswich Town",
    "Leicester": "Leicester City",
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
    ("Brighton & Hove Albion", "igor"): 380350,
    ("Chelsea", "joao felix"): 462250,
    ("Chelsea", "renato veiga"): 805714,
    ("Crystal Palace", "jeffrey schlupp"): 157506,
    ("Crystal Palace", "odsonne edouard"): 344152,
    ("Fulham", "joshua king"): 1011131,
    ("Manchester City", "savio"): 743591,
    ("Manchester United", "marcus rashford"): 258923,
}
UNDERSTAT_PLAYER_ALIASES = {
    "Ezri Konsa": "Ezri Konsa Ngoyo",
    "Matty Cash": "Matthew Cash",
    "Kepa Arrizabalaga": "Kepa",
    "Kim Jisoo": "Kim Ji-Soo",
    "Igor Thiago": "Thiago",
    "Yehor Yarmoliuk": "Yehor Yarmolyuk",
    "Pervis Estupiñán": "Estupiñán",
    "Igor": "Igor Julio",
    "Benoît Badiashile": "Benoit Badiashile Mukinayi",
    "Cheick Doucouré": "Cheick Oumar Doucoure",
    "Vitaliy Mykolenko": "Vitalii Mykolenko",
    "Jaden Philogene Bidace": "Jaden Philogene",
    "Bobby De Cordova-Reid": "Bobby Reid",
    "Joe Gomez": "Joseph Gomez",
    "Stefan Ortega": "Stefan Ortega Moreno",
    "Abdukodir Khusanov": "Abduqodir Khusanov",
    "Chidozie Obi-Martin": "Chido Obi-Martin",
    "Amad Diallo": "Amad Diallo Traore",
    "Joe Aribo": "Joe Ayodele-Aribo",
    "Lesley Ugochukwu": "Chimuanya Ugochukwu",
    "Destiny Udogie": "Iyenoma Destiny Udogie",
    "Pape Matar Sarr": "Pape Sarr",
}

REQUIRED_FIELDS = {
    "standings": {"position", "team", "MP", "W", "D", "L", "GF", "GA", "GD", "Pts"},
    "scorers": {"rank", "player", "club", "apps", "goals", "assists"},
    "assists": {"rank", "player", "club", "apps", "goals", "assists"},
    "goalkeeping": {"rank", "goalkeeper", "club", "apps", "clean_sheets", "goals_conceded"},
    "finances": {
        "team",
        "wage_bill_m",
        "wage_bill_source",
        "famous_player_wage_source",
        "famous_players",
    },
    "finance_sources": {
        "id",
        "kind",
        "source_name",
        "source_url",
        "season",
        "as_of_date",
        "retrieved_at",
        "confidence",
        "notes",
    },
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
    parser.add_argument(
        "--refresh-understat",
        action="store_true",
        help="Refresh data/understat.json from the dated EPL 2024 Understat endpoint.",
    )
    parser.add_argument(
        "--refresh-player-values",
        action="store_true",
        help="Refresh dated Transfermarkt player valuations without re-scraping FBRef.",
    )
    parser.add_argument(
        "--audit-data-health",
        action="store_true",
        help="Print the generated data-health audit after validating source snapshots.",
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
    normalized = unicodedata.normalize("NFKD", html.unescape(name).translate(replacements))
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


def parse_iso_date(value: str, label: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise DataValidationError(f"{label} must be an ISO date: {value!r}") from exc


def validate_url(value: str, label: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise DataValidationError(f"{label} must be an HTTP(S) URL: {value!r}")


def validate_text_encoding(source_name: str, value: Any, path: str = "") -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            validate_text_encoding(source_name, nested, f"{path}.{key}" if path else str(key))
        return
    if isinstance(value, list):
        for index, nested in enumerate(value):
            validate_text_encoding(source_name, nested, f"{path}[{index}]")
        return
    if not isinstance(value, str):
        return
    markers = ("\u00c3", "\u00c2", "\u00e2", "\u00f0", "\ufffd")
    if any(marker in value for marker in markers):
        raise DataValidationError(
            f"data/{source_name}.json contains possible UTF-8 mojibake at {path}: {value!r}"
        )


def validate_understat(snapshot: dict[str, Any], standings_teams: set[str]) -> None:
    if not isinstance(snapshot, dict):
        raise DataValidationError("data/understat.json must contain a JSON object")
    required = {"source_url", "season", "as_of_date", "retrieved_at", "teams", "players"}
    missing = required - snapshot.keys()
    if missing:
        raise DataValidationError(
            f"data/understat.json is missing: {', '.join(sorted(missing))}"
        )
    validate_url(snapshot["source_url"], "Understat source_url")
    parse_iso_date(snapshot["as_of_date"], "Understat as_of_date")
    parse_iso_date(snapshot["retrieved_at"], "Understat retrieved_at")
    teams = {canonical_team(row["team"]) for row in snapshot["teams"]}
    if teams != standings_teams:
        raise DataValidationError("data/understat.json team coverage must match standings")


def validate_exchange_rates(snapshot: dict[str, Any]) -> None:
    if not isinstance(snapshot, dict):
        raise DataValidationError("data/exchange_rates.json must contain a JSON object")
    required = {"source_url", "rate_date", "gbp_to_eur"}
    missing = required - snapshot.keys()
    if missing:
        raise DataValidationError(
            f"data/exchange_rates.json is missing: {', '.join(sorted(missing))}"
        )
    validate_url(snapshot["source_url"], "Exchange-rate source_url")
    parse_iso_date(snapshot["rate_date"], "Exchange-rate rate_date")
    if snapshot["gbp_to_eur"] <= 0:
        raise DataValidationError("Exchange-rate gbp_to_eur must be positive")


def validate_club_value_references(
    snapshot: dict[str, Any], standings_teams: set[str]
) -> None:
    if not isinstance(snapshot, dict):
        raise DataValidationError("data/club_value_references.json must contain an object")
    required = {"source", "references"}
    missing = required - snapshot.keys()
    if missing:
        raise DataValidationError(
            f"data/club_value_references.json is missing: {', '.join(sorted(missing))}"
        )
    source = snapshot["source"]
    for field in (
        "id",
        "source_name",
        "source_url",
        "season",
        "as_of_date",
        "retrieved_at",
        "confidence",
        "comparison_only",
        "roster_definition",
        "notes",
    ):
        if field not in source:
            raise DataValidationError(
                f"data/club_value_references.json source is missing: {field}"
            )
    validate_url(source["source_url"], "Club-value reference source_url")
    parse_iso_date(source["as_of_date"], "Club-value reference as_of_date")
    parse_iso_date(source["retrieved_at"], "Club-value reference retrieved_at")
    if source["confidence"] not in FINANCE_CONFIDENCE_LEVELS:
        raise DataValidationError("Club-value reference has invalid confidence")
    references = snapshot["references"]
    if not isinstance(references, list) or not references:
        raise DataValidationError("Club-value references must be a non-empty array")
    teams = {row.get("team") for row in references}
    if teams != standings_teams or len(references) != len(standings_teams):
        raise DataValidationError("Club-value references must exactly cover standings clubs")
    for row in references:
        if row.get("value_m", 0) <= 0 or row.get("currency") != "GBP":
            raise DataValidationError(
                f"Club-value reference must be a positive GBP value: {row.get('team')}"
            )


def percentile(value: float, values: list[float]) -> float:
    if not values:
        return 0.0
    below = sum(item < value for item in values)
    equal = sum(item == value for item in values)
    score = (below + (equal - 1) / 2) / max(len(values) - 1, 1) * 100
    return round(max(0.0, min(100.0, score)), 3)


def per90(value: float | int | None, minutes: int) -> float | None:
    if value is None or minutes <= 0:
        return None
    return round(float(value) / minutes * 90, 3)


def annotate_player_scores(
    players: list[dict[str, Any]],
    squads: list[dict[str, Any]],
    understat: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    squads_by_team = {row["team"]: row for row in squads}
    understat_by_key = {
        (canonical_team(row["team"]), canonical_player_name(row["player"])): row
        for row in understat["players"]
    }
    understat_by_name: dict[str, list[dict[str, Any]]] = {}
    for row in understat["players"]:
        understat_by_name.setdefault(canonical_player_name(row["player"]), []).append(row)
    unmatched = []
    annotated = []
    for player in players:
        source_names = (
            UNDERSTAT_PLAYER_ALIASES.get(player["player"]),
            player["player"],
            PLAYER_NAME_ALIASES.get(player["player"]),
        )
        expected = None
        for source_name in (name for name in source_names if name):
            normalized_name = canonical_player_name(source_name)
            expected = understat_by_key.get((player["club"], normalized_name))
            if expected is None and len(understat_by_name.get(normalized_name, [])) == 1:
                expected = understat_by_name[normalized_name][0]
            if expected is not None:
                break
        if expected is None:
            unmatched.append(f"{player['player']} ({player['club']})")
        minutes = player["mins"]
        defensive_actions = sum(
            player.get(field) or 0
            for field in ("tackles_won", "interceptions", "blocks", "clearances")
        )
        squad_clean_sheets = squads_by_team[player["club"]].get("clean_sheets")
        if player["position"] == "GK":
            clean_sheet_credit = player.get("clean_sheets")
        elif player["position"] in {"DF", "MF"} and squad_clean_sheets is not None:
            clean_sheet_credit = round(
                squad_clean_sheets * min(minutes / (38 * 90), 1), 3
            )
        else:
            clean_sheet_credit = 0
        row = {
            **player,
            "xg": round(float(expected["xg"]), 3) if expected else None,
            "xa": round(float(expected["xa"]), 3) if expected else None,
            "defensive_actions": defensive_actions,
            "clean_sheet_credit": clean_sheet_credit,
        }
        for metric, value in (
            ("goals", row["goals"]),
            ("assists", row["assists"]),
            ("xg", row["xg"]),
            ("xa", row["xa"]),
            ("defensive_actions", row["defensive_actions"]),
            ("clean_sheet_credit", row["clean_sheet_credit"]),
            ("saves", row.get("saves")),
        ):
            row[f"{metric}_per90"] = per90(value, minutes)
        annotated.append(row)

    if unmatched:
        warnings.append(
            f"{len(unmatched)} players could not be joined to Understat xG/xA enrichment; "
            f"their expected metrics remain null. Examples: {', '.join(unmatched[:5])}."
        )

    distributions: dict[tuple[str, str], list[float]] = {}
    for player in annotated:
        for metric in ROLE_SCORE_WEIGHTS[player["position"]]:
            value = player.get(metric)
            if value is not None:
                distributions.setdefault((player["position"], metric), []).append(value)

    for player in annotated:
        weights = ROLE_SCORE_WEIGHTS[player["position"]]
        available_weight = 0.0
        score = 0.0
        components = {}
        for metric, weight in weights.items():
            value = player.get(metric)
            if value is None:
                continue
            metric_percentile = percentile(
                value, distributions.get((player["position"], metric), [])
            )
            components[metric] = metric_percentile
            available_weight += weight
            score += metric_percentile * weight
        player["role_score"] = (
            round(score / available_weight, 3) if available_weight else None
        )
        player["role_score_completeness"] = round(
            available_weight / sum(weights.values()) * 100, 1
        )
        missing_metrics = [metric for metric in weights if player.get(metric) is None]
        if not missing_metrics:
            role_score_status = (
                "provisional" if player["mins"] < ROLE_SCORE_SAMPLE_MINUTES else "complete"
            )
            role_score_notes = (
                [f"Below the {ROLE_SCORE_SAMPLE_MINUTES}-minute comparison sample."]
                if role_score_status == "provisional"
                else []
            )
        elif (
            player["position"] == "GK"
            and missing_metrics == ["save_pct"]
            and (player.get("saves") or 0) == 0
        ):
            role_score_status = "not_applicable"
            role_score_notes = ["Save percentage is not applicable because no saves were recorded."]
        elif player["mins"] < ROLE_SCORE_SAMPLE_MINUTES:
            role_score_status = "provisional"
            role_score_notes = [
                f"Optional metrics are incomplete below the {ROLE_SCORE_SAMPLE_MINUTES}-minute sample."
            ]
        else:
            role_score_status = "source_missing"
            role_score_notes = [f"Missing weighted source metrics: {', '.join(missing_metrics)}."]
        player["role_score_version"] = ROLE_SCORE_VERSION
        player["role_score_components"] = components
        player["role_score_status"] = role_score_status
        player["role_score_notes"] = role_score_notes
    return annotated


def annotate_player_value_metrics(players: list[dict[str, Any]]) -> list[dict[str, Any]]:
    eligible = [
        player
        for player in players
        if player["mins"] >= PLAYER_EXPLORER_MINUTES
        and player.get("role_score") is not None
        and (player.get("market_value_m") or 0) > 0
        and player.get("valuation_status") == "fresh"
    ]
    distributions: dict[tuple[str, str], list[float]] = {}
    for player in eligible:
        market_value = player["market_value_m"]
        raw_vfm = player["role_score"] / market_value
        adjusted_vfm = player["role_score"] / math.sqrt(market_value)
        for metric, value in (
            ("role_score", player["role_score"]),
            ("market_value", market_value),
            ("raw_vfm", raw_vfm),
            ("adjusted_vfm", adjusted_vfm),
        ):
            distributions.setdefault((player["position"], metric), []).append(value)

    for player in players:
        market_value = player.get("market_value_m")
        role_score = player.get("role_score")
        if role_score is None or not market_value or market_value <= 0:
            player.update(
                {
                    "raw_vfm": None,
                    "adjusted_vfm": None,
                    "role_score_position_percentile": None,
                    "market_value_position_percentile": None,
                    "raw_vfm_position_percentile": None,
                    "adjusted_vfm_position_percentile": None,
                    "bargain_candidate": False,
                }
            )
            continue

        position = player["position"]
        raw_vfm = role_score / market_value
        adjusted_vfm = role_score / math.sqrt(market_value)
        role_percentile = percentile(
            role_score, distributions.get((position, "role_score"), [])
        )
        value_percentile = percentile(
            market_value, distributions.get((position, "market_value"), [])
        )
        adjusted_percentile = percentile(
            adjusted_vfm, distributions.get((position, "adjusted_vfm"), [])
        )
        player.update(
            {
                "raw_vfm": round(raw_vfm, 3),
                "adjusted_vfm": round(adjusted_vfm, 3),
                "role_score_position_percentile": role_percentile,
                "market_value_position_percentile": value_percentile,
                "raw_vfm_position_percentile": percentile(
                    raw_vfm, distributions.get((position, "raw_vfm"), [])
                ),
                "adjusted_vfm_position_percentile": adjusted_percentile,
                "bargain_candidate": (
                    player["mins"] >= PLAYER_FEATURED_MINUTES
                    and player.get("valuation_status") == "fresh"
                    and role_percentile >= 50
                    and value_percentile <= 50
                    and adjusted_percentile >= 50
                ),
            }
        )
    return players


def validate_player_value_metrics(players: list[dict[str, Any]]) -> None:
    percentile_fields = (
        "role_score_position_percentile",
        "market_value_position_percentile",
        "raw_vfm_position_percentile",
        "adjusted_vfm_position_percentile",
    )
    for player in players:
        for field in ("raw_vfm", "adjusted_vfm"):
            value = player[field]
            if value is not None and value < 0:
                raise DataValidationError(
                    f"Player {field} must be non-negative for {player['player']}"
                )
        for field in percentile_fields:
            value = player[field]
            if value is not None and not 0 <= value <= 100:
                raise DataValidationError(
                    f"Player {field} must be between 0 and 100 for {player['player']}"
                )
        if player["bargain_candidate"] and (
            player["mins"] < PLAYER_FEATURED_MINUTES
            or player.get("valuation_status") != "fresh"
        ):
            raise DataValidationError(
                f"Bargain candidate must have featured eligibility: {player['player']}"
            )


def build_squad_valuations(
    players: list[dict[str, Any]],
    club_value_references: dict[str, Any],
    exchange_rates: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    gbp_to_eur = exchange_rates["gbp_to_eur"]
    reference_source = club_value_references["source"]
    players_by_team: dict[str, list[dict[str, Any]]] = {}
    for player in players:
        players_by_team.setdefault(player["club"], []).append(player)
    rows = []
    for reference in club_value_references["references"]:
        team_players = players_by_team[reference["team"]]
        valued = [row for row in team_players if row["market_value_m"] is not None]
        derived_value = round(sum(row["market_value_m"] for row in valued), 3)
        external_gbp = reference["value_m"]
        external_eur = round(external_gbp * gbp_to_eur, 3)
        difference = round(derived_value - external_eur, 3)
        difference_pct = round(difference / external_eur * 100, 1)
        above_threshold = abs(difference_pct) >= SQUAD_VALUATION_DISCREPANCY_THRESHOLD
        reconciliation_status = (
            "explained_reference_scope"
            if above_threshold and reference_source["comparison_only"]
            else "unexplained"
            if above_threshold
            else "aligned"
        )
        rows.append(
            {
                "team": reference["team"],
                "squad_value_eur_m": derived_value,
                "valued_player_count": len(valued),
                "missing_player_value_count": len(team_players) - len(valued),
                "valuation_cutoff": PLAYER_VALUATION_CUTOFF,
                "external_reference_gbp_m": external_gbp,
                "external_reference_eur_m": external_eur,
                "external_reference_source": reference_source["id"],
                "fx_rate_date": exchange_rates["rate_date"],
                "gbp_to_eur": gbp_to_eur,
                "difference_eur_m": difference,
                "difference_pct": difference_pct,
                "severity": "warning" if reconciliation_status == "unexplained" else "info",
                "reconciliation_status": reconciliation_status,
                "comparison_only": reference_source["comparison_only"],
                "roster_definition": reference_source["roster_definition"],
            }
        )
    flagged = [row for row in rows if row["severity"] == "warning"]
    if flagged:
        warnings.append(
            f"{len(flagged)} clubs have player-derived squad values differing by at least "
            f"{SQUAD_VALUATION_DISCREPANCY_THRESHOLD}% from converted external references."
        )
    return rows


def build_health_records(
    players: list[dict[str, Any]],
    squads: list[dict[str, Any]],
    finance_sources: list[dict[str, Any]],
    squad_valuations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    missing = [
        row
        for row in players
        if row["valuation_status"] == "missing"
        and row["valuation_resolution_status"] != "expected_missing"
    ]
    expected_missing = [
        row for row in players if row["valuation_resolution_status"] == "expected_missing"
    ]
    stale = [row for row in players if row["valuation_status"] == "stale"]
    low_confidence = [row for row in finance_sources if row["confidence"] == "low"]
    low_coverage = [
        field
        for field in ("xG", "xGA")
        if 0 < sum(row.get(field) is not None for row in squads) < len(squads)
        or sum(row.get(field) is not None for row in squads) == 0
    ]
    unavailable_optional = [
        field
        for field in ("progressive_carries", "progressive_passes")
        if sum(row.get(field) is not None for row in squads) == 0
    ]
    discrepancies = [row for row in squad_valuations if row["severity"] == "warning"]
    explained_discrepancies = [
        row for row in squad_valuations if row["reconciliation_status"] == "explained_reference_scope"
    ]
    incomplete_scores = [row for row in players if row["role_score_status"] == "source_missing"]
    score_caveats = [
        row for row in players if row["role_score_status"] in {"not_applicable", "provisional"}
    ]
    player_item = lambda row: {
        "label": row["player"],
        "club": row["club"],
        "status": row.get("valuation_resolution_status"),
        "source_url": row.get("valuation_source_url"),
    }
    score_item = lambda row: {
        "label": row["player"],
        "club": row["club"],
        "status": row.get("role_score_status"),
        "source_url": row.get("valuation_source_url"),
    }
    club_item = lambda row: {
        "label": row["team"],
        "status": row.get("reconciliation_status"),
        "difference_pct": row.get("difference_pct"),
    }
    return [
        {
            "code": "missing-player-valuations",
            "severity": "warning" if missing else "ok",
            "summary": f"{len(missing)} unresolved player valuations",
            "details": "Unexplained source gaps or identity joins require review.",
            "affected_count": len(missing),
            "affected": [player_item(row) for row in missing],
            "resolution": "Resolve the profile identity or confirm that no dated valuation exists.",
        },
        {
            "code": "expected-unpublished-valuations",
            "severity": "info",
            "summary": f"{len(expected_missing)} expected unpublished valuations",
            "details": "Verified profiles had no published value at or before the cutoff.",
            "affected_count": len(expected_missing),
            "affected": [player_item(row) for row in expected_missing],
            "resolution": "No imputation is applied; these players stay visible and unranked.",
        },
        {
            "code": "stale-player-valuations",
            "severity": "info" if stale else "ok",
            "summary": f"{len(stale)} published-stale player valuations",
            "details": f"Verified records older than {PLAYER_VALUATION_STALE_DAYS} days remain visible but unfeatured.",
            "affected_count": len(stale),
            "affected": [player_item(row) for row in stale],
            "resolution": "Retained as the latest published point-in-time values before the cutoff.",
        },
        {
            "code": "low-confidence-finance-sources",
            "severity": "warning" if low_confidence else "ok",
            "summary": f"{len(low_confidence)} low-confidence primary finance sources",
            "details": "Canonical dashboard metrics use validated primary or reproducible sources.",
            "affected_count": len(low_confidence),
            "affected": [
                {"label": row["source_name"], "source_url": row["source_url"]}
                for row in low_confidence
            ],
            "resolution": "Comparison-only references are audited separately from primary finance inputs.",
        },
        {
            "code": "advanced-squad-coverage",
            "severity": "warning" if low_coverage else "ok",
            "summary": (
                "Advanced squad coverage complete"
                if not low_coverage
                else f"{len(low_coverage)} squad fields have partial coverage"
            ),
            "details": ", ".join(low_coverage) if low_coverage else "All tracked fields populated.",
            "affected_count": len(low_coverage),
            "affected": [{"label": field, "status": "incomplete"} for field in low_coverage],
            "resolution": "Refresh the upstream source and require complete club coverage.",
        },
        {
            "code": "optional-squad-source-limitations",
            "severity": "info",
            "summary": f"{len(unavailable_optional)} optional squad fields unavailable",
            "details": ", ".join(unavailable_optional) if unavailable_optional else "Optional progression fields populated.",
            "affected_count": len(unavailable_optional),
            "affected": [
                {"label": field, "status": "source_unavailable"}
                for field in unavailable_optional
            ],
            "resolution": "FBRef historical passing and possession tables are unavailable; null is preserved.",
        },
        {
            "code": "squad-valuation-discrepancies",
            "severity": "warning" if discrepancies else "ok",
            "summary": f"{len(discrepancies)} squad valuation discrepancies",
            "details": (
                f"Player-derived totals differ by at least "
                f"{SQUAD_VALUATION_DISCREPANCY_THRESHOLD}% from converted references."
            ),
            "affected_count": len(discrepancies),
            "affected": [club_item(row) for row in discrepancies],
            "resolution": "Investigate roster scope and point-in-time reference semantics.",
        },
        {
            "code": "explained-squad-reference-differences",
            "severity": "info",
            "summary": f"{len(explained_discrepancies)} explained squad reference differences",
            "details": "Comparison-only curated references use a different, unaudited roster scope.",
            "affected_count": len(explained_discrepancies),
            "affected": [club_item(row) for row in explained_discrepancies],
            "resolution": "Canonical euro totals remain reproducible player aggregates.",
        },
        {
            "code": "incomplete-role-scores",
            "severity": "warning" if incomplete_scores else "ok",
            "summary": f"{len(incomplete_scores)} eligible role-score source gaps",
            "details": "Weighted source metrics are missing for otherwise eligible players.",
            "affected_count": len(incomplete_scores),
            "affected": [score_item(row) for row in incomplete_scores],
            "resolution": "Refresh or replace the missing player-level source metric.",
        },
        {
            "code": "role-score-caveats",
            "severity": "info",
            "summary": f"{len(score_caveats)} provisional or not-applicable role scores",
            "details": "Low-minute samples and mathematically unavailable metrics remain transparent.",
            "affected_count": len(score_caveats),
            "affected": [score_item(row) for row in score_caveats],
            "resolution": "These scores stay visible but are excluded by featured ranking thresholds.",
        },
    ]


def build_enrichment_coverage(
    players: list[dict[str, Any]], squads: list[dict[str, Any]], understat: dict[str, Any]
) -> dict[str, Any]:
    return {
        "understat": {
            "source_url": understat["source_url"],
            "as_of_date": understat["as_of_date"],
            "retrieved_at": understat["retrieved_at"],
        },
        "squads": {
            field: {
                "populated": sum(row.get(field) is not None for row in squads),
                "total": len(squads),
                "status": (
                    "complete"
                    if sum(row.get(field) is not None for row in squads) == len(squads)
                    else "source_unavailable"
                    if field in {"progressive_carries", "progressive_passes"}
                    and sum(row.get(field) is not None for row in squads) == 0
                    else "incomplete"
                ),
            }
            for field in (
                "xG",
                "xGA",
                "possession",
                "progressive_carries",
                "progressive_passes",
                "tackles",
                "clean_sheets",
                "performance_score",
            )
        },
        "players": {
            field: {
                "populated": sum(row.get(field) is not None for row in players),
                "total": len(players),
            }
            for field in (
                "xg",
                "xa",
                "interceptions",
                "tackles_won",
                "saves",
                "save_pct",
                "role_score",
            )
        },
    }


def build_data_health_audit(health_records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "season": SEASON,
        "valuation_cutoff": PLAYER_VALUATION_CUTOFF,
        "generated_by": "fetch_data.py",
        "records": health_records,
    }


def validate_finances(
    finances: list[dict[str, Any]],
    finance_sources: list[dict[str, Any]],
    players: list[dict[str, Any]],
    warnings: list[str],
) -> None:
    source_ids = {row["id"] for row in finance_sources}
    if len(source_ids) != len(finance_sources):
        raise DataValidationError("data/finance_sources.json IDs must be unique")

    for source in finance_sources:
        label = f"Finance source '{source['id']}'"
        if source["kind"] not in {"wage_bill", "player_wage"}:
            raise DataValidationError(f"{label} has unknown kind: {source['kind']}")
        if source["season"] != SEASON:
            raise DataValidationError(f"{label} must use season {SEASON}")
        if source["confidence"] not in FINANCE_CONFIDENCE_LEVELS:
            raise DataValidationError(
                f"{label} confidence must be one of: "
                f"{', '.join(sorted(FINANCE_CONFIDENCE_LEVELS))}"
            )
        validate_url(source["source_url"], f"{label} source_url")
        as_of_date = parse_iso_date(source["as_of_date"], f"{label} as_of_date")
        retrieved_at = parse_iso_date(source["retrieved_at"], f"{label} retrieved_at")
        if as_of_date > retrieved_at:
            raise DataValidationError(f"{label} has an as_of_date after retrieved_at")

    low_confidence = [source for source in finance_sources if source["confidence"] == "low"]
    if low_confidence:
        warnings.append(
            f"{len(low_confidence)} finance source has low confidence: "
            f"{', '.join(source['source_name'] for source in low_confidence)}."
        )

    sources_by_id = {source["id"]: source for source in finance_sources}
    expected_sources = {
        "wage_bill_source": "wage_bill",
        "famous_player_wage_source": "player_wage",
    }
    player_keys = {
        (canonical_player_name(row["player"]), row["club"])
        for row in players
    }
    for finance in finances:
        team = finance["team"]
        for field, expected_kind in expected_sources.items():
            if finance[field] not in source_ids:
                raise DataValidationError(
                    f"Finance row for {team} references unknown source: {finance[field]}"
                )
            if sources_by_id[finance[field]]["kind"] != expected_kind:
                raise DataValidationError(
                    f"Finance row for {team} field {field} must reference "
                    f"a {expected_kind} source"
                )
        if finance["wage_bill_m"] <= 0:
            raise DataValidationError(f"Finance wage bill must be positive for {team}")
        if not finance["famous_players"]:
            raise DataValidationError(f"Finance row for {team} must list notable players")
        for player in finance["famous_players"]:
            missing = {"player", "position", "weekly_k"} - player.keys()
            if missing:
                raise DataValidationError(
                    f"Finance notable player for {team} is missing: "
                    f"{', '.join(sorted(missing))}"
                )
            if player["weekly_k"] <= 0:
                raise DataValidationError(
                    f"Finance notable player wage must be positive: "
                    f"{player['player']} ({team})"
                )
            key = (canonical_player_name(player["player"]), team)
            if key not in player_keys:
                raise DataValidationError(
                    f"Finance notable player is not in the {SEASON} snapshot: "
                    f"{player['player']} ({team})"
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

def validate_player_values(
    players: list[dict[str, Any]], player_values: list[dict[str, Any]]
) -> None:
    player_keys = {(row["player"], row["club"]) for row in players}
    value_keys = {(row["player"], row["club"]) for row in player_values}
    if player_keys != value_keys:
        raise DataValidationError("data/player_values.json must match data/players.json")


def annotate_player_valuations(
    players: list[dict[str, Any]],
    player_values: list[dict[str, Any]],
    warnings: list[str],
) -> list[dict[str, Any]]:
    cutoff = parse_iso_date(PLAYER_VALUATION_CUTOFF, "PLAYER_VALUATION_CUTOFF")
    values_by_key = {
        (row["player"], row["club"]): row
        for row in player_values
    }
    annotated = []
    stale = []
    unresolved_missing = []

    for player in players:
        value = values_by_key[(player["player"], player["club"])]
        if player["market_value_m"] != value["market_value_m"]:
            raise DataValidationError(
                f"Player valuation mismatch for {player['player']} ({player['club']})"
            )
        if player["valuation_date"] != value["valuation_date"]:
            raise DataValidationError(
                f"Player valuation date mismatch for {player['player']} ({player['club']})"
            )
        validate_url(value["source_url"], f"Player source URL for {player['player']}")

        valuation_age_days = None
        valuation_status = "missing"
        if player["valuation_date"]:
            valuation_date = parse_iso_date(
                player["valuation_date"],
                f"Valuation date for {player['player']}",
            )
            valuation_age_days = (cutoff - valuation_date).days
            if valuation_age_days < 0:
                raise DataValidationError(
                    f"Valuation date exceeds cutoff for {player['player']}: "
                    f"{player['valuation_date']}"
                )
            valuation_status = (
                "stale"
                if valuation_age_days > PLAYER_VALUATION_STALE_DAYS
                else "fresh"
            )
        if valuation_status == "stale":
            stale.append(player)
        valuation_resolution_status = value.get("valuation_resolution_status")
        if not valuation_resolution_status:
            valuation_resolution_status = (
                "expected_missing"
                if valuation_status == "missing" and value.get("transfermarkt_id")
                else "published_stale"
                if valuation_status == "stale"
                else "verified"
            )
        if valuation_status == "missing" and valuation_resolution_status != "expected_missing":
            unresolved_missing.append(player)

        annotated.append(
            {
                **player,
                "valuation_age_days": valuation_age_days,
                "valuation_status": valuation_status,
                "valuation_resolution_status": valuation_resolution_status,
                "valuation_resolution_method": value.get("resolution_method", "legacy_snapshot"),
                "valuation_resolution_confidence": value.get("resolution_confidence", "medium"),
                "valuation_source_url": value["source_url"],
            }
        )

    if unresolved_missing:
        warnings.append(
            f"{len(unresolved_missing)} players have unexplained missing Transfermarkt values."
        )

    return annotated


def normalize_squads(
    squads: list[dict[str, Any]],
    standings: list[dict[str, Any]],
    understat: dict[str, Any],
    warnings: list[str],
) -> list[dict[str, Any]]:
    normalized = [{**row, "team": canonical_team(row["team"])} for row in squads]
    understat_by_team = {
        canonical_team(row["team"]): row for row in understat["teams"]
    }
    for row in normalized:
        expected = understat_by_team.get(row["team"], {})
        row["xG"] = expected.get("xG")
        row["xGA"] = expected.get("xGA")
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

    for field in ("xG", "xGA", "progressive_carries", "progressive_passes"):
        populated = sum(row.get(field) is not None for row in normalized)
        if populated < len(normalized) and not (
            field in {"progressive_carries", "progressive_passes"} and populated == 0
        ):
            warnings.append(
                f"Squad enrichment field {field} is populated for {populated}/{len(normalized)} clubs."
            )
    score_weights = {
        "goals": 1.5,
        "assists": 1.0,
        "xG": 1.2,
        "tackles": 0.8,
        "clean_sheets": 0.8,
        "possession": 0.4,
    }
    maxima = {
        field: max((row.get(field) or 0 for row in normalized), default=0)
        for field in score_weights
    }
    xga_max = max((row.get("xGA") or 0 for row in normalized), default=0)
    raw_scores = []
    for row in normalized:
        score = sum(
            ((row.get(field) or 0) / maxima[field]) * weight
            for field, weight in score_weights.items()
            if maxima[field]
        )
        if xga_max and row.get("xGA") is not None:
            score += (1 - row["xGA"] / xga_max) * 0.8
        raw_scores.append(score)
    maximum_score = max(raw_scores, default=0)
    for row, score in zip(normalized, raw_scores):
        row["performance_score"] = (
            round(score / maximum_score * 100, 1) if maximum_score else None
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


def build_team_metrics(
    standings: list[dict[str, Any]],
    finances: list[dict[str, Any]],
    squad_valuations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    standings_by_team = {row["team"]: row for row in standings}
    squad_values_by_team = {row["team"]: row for row in squad_valuations}
    rows = []
    for finance in finances:
        standing = standings_by_team[finance["team"]]
        wage_bill = finance["wage_bill_m"]
        squad_value = squad_values_by_team[finance["team"]]["squad_value_eur_m"]
        points = standing["Pts"]
        goals = standing["GF"]
        rows.append(
            {
                "team": finance["team"],
                "league_position": standing["position"],
                "points": points,
                "goals_for": goals,
                "wage_bill_m": wage_bill,
                "squad_value_m": squad_value,
                "squad_value_currency": "EUR",
                "cost_per_point": round(wage_bill / points, 3),
                "cost_per_goal": round(wage_bill / goals, 3),
                "squad_value_per_point": round(squad_value / points, 3),
                "squad_value_per_goal": round(squad_value / goals, 3),
                "squad_value_source": "player_valuations_aggregate",
                "wage_bill_source": finance["wage_bill_source"],
            }
        )

    avg_cost_per_point = sum(row["cost_per_point"] for row in rows) / len(rows)
    mean_wages = sum(row["wage_bill_m"] for row in rows) / len(rows)
    mean_points = sum(row["points"] for row in rows) / len(rows)
    denominator = sum((row["wage_bill_m"] - mean_wages) ** 2 for row in rows)
    slope = (
        sum(
            (row["wage_bill_m"] - mean_wages) * (row["points"] - mean_points)
            for row in rows
        )
        / denominator
        if denominator
        else 0
    )
    intercept = mean_points - slope * mean_wages

    for row in rows:
        predicted_points = intercept + slope * row["wage_bill_m"]
        residual = row["points"] - predicted_points
        row["value_index"] = round(row["cost_per_point"] / avg_cost_per_point, 3)
        row["predicted_points"] = round(predicted_points, 2)
        row["residual_points"] = round(residual, 2)
        row["performance_class"] = (
            "overperforming"
            if residual > 3
            else "underperforming"
            if residual < -3
            else "near_expected"
        )

    for rank, row in enumerate(
        sorted(rows, key=lambda item: (item["cost_per_point"], item["team"])), start=1
    ):
        row["value_rank"] = rank
    return sorted(rows, key=lambda row: row["league_position"])


def validate_team_metrics(
    team_metrics: list[dict[str, Any]], standings_teams: set[str]
) -> None:
    if len(team_metrics) != 20 or {row["team"] for row in team_metrics} != standings_teams:
        raise DataValidationError("Team metrics must exactly cover the 20 standings clubs")
    if {row["value_rank"] for row in team_metrics} != set(range(1, 21)):
        raise DataValidationError("Team metric value ranks must be the numbers 1 through 20")
    for row in team_metrics:
        for field in (
            "points",
            "goals_for",
            "wage_bill_m",
            "squad_value_m",
            "cost_per_point",
            "cost_per_goal",
            "squad_value_per_point",
            "squad_value_per_goal",
            "value_index",
        ):
            if row[field] <= 0:
                raise DataValidationError(
                    f"Team metric {field} must be positive for {row['team']}"
                )


def source_digest(name: str) -> str:
    digest = hashlib.sha256((DATA_DIR / f"{name}.json").read_bytes()).hexdigest()
    return f"sha256:{digest}"


def build_bundle() -> tuple[dict[str, Any], list[str]]:
    sources = {name: read_json(DATA_DIR / f"{name}.json") for name in SOURCE_NAMES}
    warnings: list[str] = []

    for name in SOURCE_NAMES:
        validate_text_encoding(name, sources[name])
        if name not in {"facts", "understat", "exchange_rates", "club_value_references"}:
            validate_rows(name, sources[name])

    facts = sources["facts"]
    if not isinstance(facts, dict):
        raise DataValidationError("data/facts.json must contain a JSON object")

    standings = sources["standings"]
    standings_teams = validate_standings(standings)
    validate_understat(sources["understat"], standings_teams)
    validate_exchange_rates(sources["exchange_rates"])
    validate_club_value_references(sources["club_value_references"], standings_teams)
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
    players = annotate_player_valuations(players, sources["player_values"], warnings)
    validate_finances(finances, sources["finance_sources"], players, warnings)
    squads = normalize_squads(sources["squads"], standings, sources["understat"], warnings)
    players = annotate_player_scores(players, squads, sources["understat"], warnings)
    players = annotate_player_value_metrics(players)
    validate_player_value_metrics(players)
    squad_valuations = build_squad_valuations(
        players, sources["club_value_references"], sources["exchange_rates"], warnings
    )
    validate_cross_file_facts(standings, facts, warnings)
    team_metrics = build_team_metrics(standings, finances, squad_valuations)
    validate_team_metrics(team_metrics, standings_teams)
    health_records = build_health_records(
        players, squads, sources["finance_sources"], squad_valuations
    )
    data_health_audit = build_data_health_audit(health_records)
    enrichment_coverage = build_enrichment_coverage(players, squads, sources["understat"])

    bundle = {
        "_meta": {
            "schema_version": 6,
            "season": SEASON,
            "generated_by": "fetch_data.py",
            "player_value_policy": {
                "valuation_cutoff": PLAYER_VALUATION_CUTOFF,
                "valuation_stale_days": PLAYER_VALUATION_STALE_DAYS,
                "explorer_min_minutes": PLAYER_EXPLORER_MINUTES,
                "featured_min_minutes": PLAYER_FEATURED_MINUTES,
            },
            "source_files": {name: source_digest(name) for name in SOURCE_NAMES},
            "warnings": warnings,
            "health": health_records,
            "role_score": {
                "version": ROLE_SCORE_VERSION,
                "weights": ROLE_SCORE_WEIGHTS,
            },
            "vfm_model": {
                "version": VFM_MODEL_VERSION,
                "raw_formula": "role_score / market_value_m",
                "adjusted_formula": "role_score / sqrt(market_value_m)",
                "percentile_sample": "fresh valuations with at least 500 minutes",
                "bargain_rule": (
                    "fresh value, at least 900 minutes, role score percentile >= 50, "
                    "market value percentile <= 50, adjusted VFM percentile >= 50"
                ),
            },
            "enrichment_coverage": enrichment_coverage,
        },
        "standings": standings,
        "scorers": sources["scorers"],
        "assists": sources["assists"],
        "goalkeeping": sources["goalkeeping"],
        "facts": facts,
        "finances": finances,
        "finance_sources": sources["finance_sources"],
        "club_value_references": sources["club_value_references"],
        "team_metrics": team_metrics,
        "players": players,
        "squads": squads,
        "squad_valuations": squad_valuations,
        "exchange_rates": sources["exchange_rates"],
        "data_health_audit": data_health_audit,
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


def refresh_understat() -> None:
    try:
        import requests
    except ImportError as exc:
        raise DataValidationError(
            "Refreshing Understat enrichment requires requests. "
            "Install it with: pip install requests"
        ) from exc

    print("Refreshing dated Understat EPL 2024-2025 enrichment...")
    response = requests.get(
        UNDERSTAT_LEAGUE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; PremValue educational data pipeline)",
            "X-Requested-With": "XMLHttpRequest",
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    teams = []
    for team in payload["teams"].values():
        history = team["history"]
        teams.append(
            {
                "team": canonical_team(team["title"]),
                "xG": round(sum(float(row["xG"]) for row in history), 3),
                "xGA": round(sum(float(row["xGA"]) for row in history), 3),
                "npxG": round(sum(float(row["npxG"]) for row in history), 3),
                "npxGA": round(sum(float(row["npxGA"]) for row in history), 3),
            }
        )
    players = [
        {
            "player": row["player_name"],
            "team": canonical_team(row["team_title"]),
            "xg": round(float(row["xG"]), 3),
            "xa": round(float(row["xA"]), 3),
        }
        for row in payload["players"]
    ]
    snapshot = {
        "source_url": UNDERSTAT_LEAGUE_URL,
        "season": SEASON,
        "as_of_date": "2025-05-25",
        "retrieved_at": date.today().isoformat(),
        "teams": sorted(teams, key=lambda row: row["team"]),
        "players": sorted(players, key=lambda row: (row["team"], row["player"])),
    }
    changed = write_if_changed(DATA_DIR / "understat.json", json_text(snapshot))
    print("Updated data/understat.json." if changed else "Understat snapshot is already current.")


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
        "passing": fetch_frame("passing"),
        "possession": fetch_frame("possession"),
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
                "progressive_carries": value(
                    "possession", team, "Carries_PrgC", "Progression_PrgC", "PrgC"
                ),
                "progressive_passes": value(
                    "passing", team, "PrgP", "Progression_PrgP", "Total_PrgP"
                ),
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


def normalized_transfermarkt_position(raw_position: str) -> str:
    return {
        "Goalkeeper": "GK",
        "Defender": "DF",
        "Midfield": "MF",
        "Attack": "FW",
    }.get(raw_position, "FW")


def resolve_transfermarkt_profile(
    player: dict[str, Any],
    profiles_by_id: dict[int, dict[str, str]],
    profiles_by_name: dict[str, list[dict[str, str]]],
    latest_valuations: dict[int, dict[str, str]],
) -> tuple[dict[str, str] | None, str, str]:
    club = player["club"]
    normalized_name = canonical_player_name(player["player"])
    override = PLAYER_PROFILE_OVERRIDES.get((club, normalized_name))
    if override is not None:
        return profiles_by_id.get(override), "explicit_override", "high"

    transfermarkt_name = PLAYER_NAME_ALIASES.get(player["player"], player["player"])
    candidates = profiles_by_name.get(canonical_player_name(transfermarkt_name), [])
    expected_club_id = str(TRANSFERMARKT_CLUB_IDS[club])
    valued_at_club = [
        profile
        for profile in candidates
        if latest_valuations.get(int(profile["player_id"]), {}).get("current_club_id")
        == expected_club_id
    ]
    if len(valued_at_club) == 1:
        return valued_at_club[0], "cutoff_club_match", "high"

    current_club = [
        profile for profile in candidates if profile.get("current_club_id") == expected_club_id
    ]
    if len(current_club) == 1:
        return current_club[0], "profile_club_match", "high"

    position_matches = [
        profile
        for profile in candidates
        if normalized_transfermarkt_position(profile.get("position", "")) == player["position"]
    ]
    if len(position_matches) == 1 and len(candidates) == 1:
        return position_matches[0], "unique_name_position_match", "medium"
    return None, "unresolved", "low"


def build_player_values_snapshot(
    players: list[dict[str, Any]], requests: Any
) -> list[dict[str, Any]]:
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
    for player in players:
        profile, resolution_method, resolution_confidence = resolve_transfermarkt_profile(
            player, profiles_by_id, profiles_by_name, latest_valuations
        )
        if profile is None:
            unresolved.append(f"{player['player']} ({player['club']})")
            continue
        player_id = int(profile["player_id"])
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
                "player": player["player"],
                "club": player["club"],
                "transfermarkt_id": player_id,
                "market_value_m": market_value_m,
                "valuation_date": valuation["date"] if valuation else None,
                "valuation_resolution_status": (
                    "expected_missing" if valuation is None else "verified_profile"
                ),
                "resolution_method": resolution_method,
                "resolution_confidence": resolution_confidence,
                "profile_name": profile["name"],
                "profile_position": profile.get("position"),
                "profile_date_of_birth": profile.get("date_of_birth"),
                "source_url": profile["url"],
            }
        )

    if unresolved:
        examples = ", ".join(unresolved[:8])
        raise DataValidationError(
            f"Could not safely resolve {len(unresolved)} FBRef players to Transfermarkt profiles. "
            f"Add explicit aliases or overrides. Examples: {examples}"
        )
    return sorted(player_values, key=lambda row: (row["club"], row["player"]))


def refresh_player_values() -> None:
    try:
        import requests
    except ImportError as exc:
        raise DataValidationError(
            "Refreshing player valuations requires requests. Install it with: pip install requests"
        ) from exc
    print("Refreshing dated Transfermarkt player valuations...")
    players = read_json(DATA_DIR / "players.json")
    player_values = build_player_values_snapshot(players, requests)
    updated = [
        path.relative_to(ROOT)
        for path, content in (
            (DATA_DIR / "players.json", json_text(players)),
            (DATA_DIR / "player_values.json", json_text(player_values)),
        )
        if write_if_changed(path, content)
    ]
    for path in updated:
        print(f"  - {path}")
    missing_values = sum(row["market_value_m"] is None for row in player_values)
    print(f"  Resolved {len(players)} players; {missing_values} have no published valuation record.")


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
    fbref = sd.FBref(leagues="ENG-Premier League", seasons="24-25")
    dataframe = cached_fbref_player_frame(pd)
    if dataframe is None:
        print("  Fetching standard player stats from FBRef...")
        dataframe = flatten_columns(fbref.read_player_season_stats(stat_type="standard"), pd)
    print("  Fetching supported FBRef miscellaneous and goalkeeper stats...")
    misc_frame = flatten_columns(fbref.read_player_season_stats(stat_type="misc"), pd)
    keeper_frame = flatten_columns(fbref.read_player_season_stats(stat_type="keeper"), pd)

    def aggregate_frame(frame: Any, fields: dict[str, str]) -> dict[str, dict[str, float]]:
        player_column = "player" if "player" in frame.columns else "Player"
        output: dict[str, dict[str, float]] = {}
        for field in fields.values():
            if field in frame.columns:
                frame[field] = pd.to_numeric(frame[field], errors="coerce").fillna(0)
        for player_name, rows in frame.groupby(player_column, sort=True):
            key = canonical_player_name(str(player_name))
            output[key] = {
                target: float(rows[source].sum()) if source in frame.columns else 0
                for target, source in fields.items()
            }
        return output

    misc_by_player = aggregate_frame(
        misc_frame,
        {
            "interceptions": "Performance_Int",
            "tackles_won": "Performance_TklW",
        },
    )
    keeper_by_player = aggregate_frame(
        keeper_frame,
        {
            "saves": "Performance_Saves",
            "shots_on_target_against": "Performance_SoTA",
            "clean_sheets": "Performance_CS",
        },
    )

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
        canonical_name = canonical_player_name(str(player))
        misc = misc_by_player.get(canonical_name, {})
        keeper = keeper_by_player.get(canonical_name, {})
        saves = keeper.get("saves") if keeper else None
        shots_on_target_against = keeper.get("shots_on_target_against") if keeper else None
        save_pct = (
            round(saves / shots_on_target_against * 100, 3)
            if saves is not None and shots_on_target_against
            else None
        )
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
                "interceptions": round(misc.get("interceptions", 0), 3),
                "tackles_won": round(misc.get("tackles_won", 0), 3),
                "blocks": None,
                "clearances": None,
                "saves": round(saves, 3) if saves is not None else None,
                "shots_on_target_against": (
                    round(shots_on_target_against, 3)
                    if shots_on_target_against is not None
                    else None
                ),
                "save_pct": save_pct,
                "clean_sheets": (
                    round(keeper.get("clean_sheets", 0), 3) if keeper else None
                ),
            }
        )

    player_values = build_player_values_snapshot(stats_rows, requests)

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
        if args.refresh_understat:
            refresh_understat()
        if args.refresh_squads:
            refresh_squads()
        if args.refresh_players:
            refresh_players()
        elif args.refresh_player_values:
            refresh_player_values()

        bundle, warnings = build_bundle()
        dashboard_text = json_text(bundle)
        data_health_audit_text = json_text(bundle["data_health_audit"])
        standalone_text = build_standalone_html(bundle)

        if args.check:
            stale = [
                path.relative_to(ROOT)
                for path, content in (
                    (DASHBOARD_FILE, dashboard_text),
                    (DATA_HEALTH_AUDIT_FILE, data_health_audit_text),
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
                    (DATA_HEALTH_AUDIT_FILE, data_health_audit_text),
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
        if args.audit_data_health:
            print("Data-health audit:")
            for record in bundle["data_health_audit"]["records"]:
                print(
                    f"  - {record['severity'].upper()}: {record['summary']} "
                    f"({record['details']})"
                )
        return 0
    except DataValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
