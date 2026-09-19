"""
Fetch PxWeb data for Tasapainota Suomen eläkejärjestelmä.

Reads provider configuration from providers.json and source configuration
from data/sources.json.

Supports PxWeb-compatible providers such as Statistics Finland and ETK.
Raw responses are saved under data/raw/ with provenance metadata.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests


PROVIDERS_PATH = Path("data/providers.json")
SOURCES_PATH = Path("data/sources.json")
RAW_DIR = Path("data/raw")

TIMEOUT_METADATA = 30
TIMEOUT_DATA = 60


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_api_url(provider: Dict[str, Any], table_path: List[str]) -> str:
    """
    Build a PxWeb API URL from provider configuration and table path.
    """
    print(provider)
    api = provider["api"]

    base_url = api["baseUrl"].rstrip("/")
    language = api["language"].strip("/")
    database = api["database"].strip("/")

    parts = [base_url, language, database]

    for part in table_path:
        parts.append(str(part).strip("/"))

    return "/".join(parts)


def fetch_metadata(url: str) -> Optional[Dict[str, Any]]:
    """
    Fetch PxWeb table metadata.
    """
    try:
        response = requests.get(
            url,
            headers={"Accept": "application/json"},
            timeout=TIMEOUT_METADATA,
        )
        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        print(f"  [ERROR] Failed to fetch metadata from {url}: {exc}")
        return None

    except ValueError as exc:
        print(f"  [ERROR] Metadata response was not valid JSON: {exc}")
        return None


def get_variable_metadata(
    metadata: Dict[str, Any],
) -> Dict[str, Dict[str, Any]]:
    """
    Return metadata variables indexed by both their code and text.
    """
    variables = {}

    for variable in metadata.get("variables", []):
        code = variable.get("code")
        text = variable.get("text")

        if code:
            variables[code] = variable

        if text:
            variables[text] = variable

    return variables


def resolve_value(
    variable: Dict[str, Any],
    requested_value: str,
) -> str:
    """
    Resolve a configured human-readable value to the PxWeb value code.

    If the configured value is already a valid code, keep it.
    Otherwise match against the category labels.
    """
    values = variable.get("values", [])
    value_texts = variable.get("valueTexts", [])

    if requested_value in values:
        return requested_value

    for code, label in zip(values, value_texts):
        if requested_value == label:
            return code

    raise ValueError(
        f"Could not resolve value {requested_value!r} "
        f"for variable {variable.get('text', variable.get('code'))!r}. "
        f"Available values include: {value_texts[:20]}"
    )


def build_pxweb_query(
    metadata: Dict[str, Any],
    configured_query: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Convert the convenient source configuration:

        {
            "Vuosi": "*",
            "Sukupuoli": ["Yhteensä"]
        }

    into the PxWeb POST query format.
    """
    variables = get_variable_metadata(metadata)

    query = []

    for variable_name, selection in configured_query.items():

        if variable_name not in variables:
            raise ValueError(
                f"Query variable {variable_name!r} was not found in "
                f"the table metadata. Available variables: "
                f"{[v.get('text', v.get('code')) for v in metadata.get('variables', [])]}"
            )

        variable = variables[variable_name]
        variable_code = variable["code"]

        if selection == "*":
            query.append(
                {
                    "code": variable_code,
                    "selection": {
                        "filter": "all",
                        "values": ["*"],
                    },
                }
            )
            continue

        if not isinstance(selection, list):
            selection = [selection]

        resolved_values = [
            resolve_value(variable, str(value))
            for value in selection
        ]

        query.append(
            {
                "code": variable_code,
                "selection": {
                    "filter": "item",
                    "values": resolved_values,
                },
            }
        )

    return query


def fetch_data(
    url: str,
    pxweb_query: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    POST a PxWeb query and return the JSON-stat2 response.
    """
    payload = {
        "query": pxweb_query,
        "response": {
            "format": "json-stat2"
        },
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=TIMEOUT_DATA,
        )

        response.raise_for_status()
        return response.json()

    except requests.RequestException as exc:
        print(f"  [ERROR] Failed to fetch data from {url}: {exc}")

        try:
            print(f"  [ERROR] API response: {response.text[:1000]}")
        except Exception:
            pass

        return None

    except ValueError as exc:
        print(f"  [ERROR] Data response was not valid JSON: {exc}")
        return None


def save_raw(
    source_id: str,
    provider_key: str,
    metadata_url: str,
    query_url: str,
    configured_query: Dict[str, Any],
    resolved_query: List[Dict[str, Any]],
    metadata: Dict[str, Any],
    raw_data: Dict[str, Any],
) -> None:
    """
    Save raw response together with provenance.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    fetched_at = datetime.now(timezone.utc)

    outfile = RAW_DIR / f"{source_id}.json"

    output = {
        "provenance": {
            "fetched_at": fetched_at.isoformat(),
            "source_id": source_id,
            "provider": provider_key,
            "metadata_url": metadata_url,
            "query_url": query_url,
            "configured_query": configured_query,
            "resolved_query": resolved_query,
        },
        "metadata": metadata,
        "data": raw_data,
    }

    temp_file = RAW_DIR / f"{source_id}.tmp.json"

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    temp_file.replace(outfile)

    print(f"  [OK] Saved raw data to {outfile}.")


def process_source(
    provider_key: str,
    provider: Dict[str, Any],
    source_id: str,
    source: Dict[str, Any],
) -> bool:
    """
    Fetch one configured source.
    """
    description = source.get("description", source_id)

    print(f"Processing source: {source_id} ({description})")

    table = source.get("table", {})
    table_path = table.get("path")

    if not table_path:
        print("  [ERROR] Source has no table.path configured.")
        return False

    metadata_url = build_api_url(provider, table_path)

    print(f"  Metadata URL: {metadata_url}")

    metadata = fetch_metadata(metadata_url)

    if metadata is None:
        print("  [SKIP] Could not retrieve metadata.")
        return False

    configured_query = source.get("query")

    if not configured_query:
        print("  [ERROR] No query configured.")
        return False

    try:
        resolved_query = build_pxweb_query(
            metadata,
            configured_query,
        )
    except ValueError as exc:
        print(f"  [ERROR] Query configuration: {exc}")
        return False

    print("  Query resolved successfully.")

    raw_data = fetch_data(
        metadata_url,
        resolved_query,
    )

    if raw_data is None:
        print("  [SKIP] Could not retrieve data.")
        return False

    save_raw(
        source_id=source_id,
        provider_key=provider_key,
        metadata_url=metadata_url,
        query_url=metadata_url,
        configured_query=configured_query,
        resolved_query=resolved_query,
        metadata=metadata,
        raw_data=raw_data,
    )

    return True


def main():
    if not PROVIDERS_PATH.is_file():
        print(f"Error: {PROVIDERS_PATH} not found.")
        sys.exit(1)

    if not SOURCES_PATH.is_file():
        print(f"Error: {SOURCES_PATH} not found.")
        sys.exit(1)

    provider_wrapper = load_json(PROVIDERS_PATH)
    providers = provider_wrapper.get("providers", {})

    sources_wrapper = load_json(SOURCES_PATH)
    sources = sources_wrapper.get("sources", {})

    args = sys.argv[1:]

    if len(args) == 0:
        print(
            "Usage: python scripts/fetch_pxweb.py --all "
            "OR python scripts/fetch_pxweb.py <source_id> [<source_id> ...]"
        )
        sys.exit(1)

    if args[0] == "--all":
        selected = list(sources.keys())
        print(f"Fetching all {len(selected)} sources...")
    else:
        selected = args
        invalid = [s for s in selected if s not in sources]
        if invalid:
            print(f"Error: unknown source(s): {', '.join(invalid)}")
            sys.exit(1)

        print(f"Fetching {len(selected)} source(s): {', '.join(selected)}")

    failed = False

    for source_id in selected:
        source = sources[source_id]
        provider_key = source.get("provider")

        if provider_key is None:
            print(f"  [SKIP] Source {source_id} missing provider.")
            failed = True
            continue

        provider = providers.get(provider_key)

        if provider is None:
            print(
                f"  [ERROR] Provider '{provider_key}' not found "
                f"in providers.json."
            )
            failed = True
            continue

        try:
            process_source(
                provider_key,
                provider,
                source_id,
                source,
            )
        except Exception as e:
            print(
                f"  [ERROR] Unexpected error processing "
                f"{source_id}: {e}"
            )
            failed = True

        print()

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()