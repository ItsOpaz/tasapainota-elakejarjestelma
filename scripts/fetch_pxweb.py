import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests

from utils import load_json, save_json


PROVIDERS_PATH = Path("data/providers.json")
SOURCES_PATH = Path("data/sources.json")
RAW_DIR = Path("data/raw")
MANIFEST_PATH = Path("data/.fetch_manifest.json")


def get_data_hash(data: Dict[str, Any]) -> str:
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()


def load_manifest() -> Dict[str, Dict[str, Any]]:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        return load_json(MANIFEST_PATH)
    except Exception:
        return {}


def save_manifest(manifest: Dict[str, Dict[str, Any]]) -> None:
    save_json(MANIFEST_PATH, manifest)


def data_changed(source_id: str, raw_data: Dict[str, Any], manifest: Dict) -> bool:
    new_hash = get_data_hash(raw_data)
    if source_id not in manifest:
        return True
    return new_hash != manifest[source_id].get("hash")


def build_api_url(provider: Dict, table_path: list) -> str:
    api = provider["api"]
    base_url = api["baseUrl"].rstrip("/")
    language = api["language"].strip("/")
    database = api["database"].strip("/")
    parts = [base_url, language, database] + [str(p).strip("/") for p in table_path]
    return "/".join(parts)


def fetch_metadata(url: str) -> Optional[Dict]:
    try:
        resp = requests.get(url, headers={"Accept": "application/json"}, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"  [ERROR] Metadata: {exc}")
        return None


def get_variable_metadata(metadata: Dict) -> Dict:
    variables = {}
    for var in metadata.get("variables", []):
        if code := var.get("code"):
            variables[code] = var
        if text := var.get("text"):
            variables[text] = var
    return variables


def resolve_value(variable: Dict, requested: str) -> str:
    values = variable.get("values", [])
    value_texts = variable.get("valueTexts", [])
    
    if requested in values:
        return requested
    
    for code, label in zip(values, value_texts):
        if requested == label:
            return code
    
    raise ValueError(f"Could not resolve value {requested!r}")


def build_pxweb_query(metadata: Dict, config_query: Dict) -> list:
    variables = get_variable_metadata(metadata)
    query = []
    
    for var_name, selection in config_query.items():
        if var_name not in variables:
            raise ValueError(f"Variable {var_name!r} not found")
        
        var = variables[var_name]
        var_code = var["code"]
        
        if selection == "*":
            query.append({
                "code": var_code,
                "selection": {"filter": "all", "values": ["*"]},
            })
        else:
            sel_list = selection if isinstance(selection, list) else [selection]
            resolved = [resolve_value(var, str(v)) for v in sel_list]
            query.append({
                "code": var_code,
                "selection": {"filter": "item", "values": resolved},
            })
    
    return query


def fetch_data(url: str, pxweb_query: list) -> Optional[Dict]:
    payload = {
        "query": pxweb_query,
        "response": {"format": "json-stat2"}
    }
    try:
        resp = requests.post(
            url,
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=60
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        print(f"  [ERROR] Data fetch: {exc}")
        return None


def save_raw(source_id: str, provider_key: str, metadata_url: str, 
             config_query: Dict, resolved_query: list, metadata: Dict, 
             raw_data: Dict, manifest: Dict, changed: list) -> bool:
    if not data_changed(source_id, raw_data, manifest):
        print(f"  [SKIP] Unchanged")
        return False
    
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    fetched_at = datetime.now(timezone.utc).isoformat()
    
    output = {
        "provenance": {
            "fetched_at": fetched_at,
            "source_id": source_id,
            "provider": provider_key,
            "metadata_url": metadata_url,
            "query_url": metadata_url,
            "configured_query": config_query,
            "resolved_query": resolved_query,
        },
        "metadata": metadata,
        "data": raw_data,
    }
    
    outfile = RAW_DIR / f"{source_id}.json"
    save_json(outfile, output)
    print(f"  [OK] Saved")
    
    new_hash = get_data_hash(raw_data)
    manifest[source_id] = {"hash": new_hash, "fetched_at": fetched_at}
    changed.append(source_id)
    return True


def process_source(provider_key: str, provider: Dict, source_id: str, 
                   source: Dict, manifest: Dict, changed: list) -> bool:
    desc = source.get("description", source_id)
    print(f"Processing: {source_id} ({desc})")
    
    table_path = source.get("table", {}).get("path")
    if not table_path:
        print("  [ERROR] No table.path")
        return False
    
    metadata_url = build_api_url(provider, table_path)
    metadata = fetch_metadata(metadata_url)
    if not metadata:
        print("  [SKIP] No metadata")
        return False
    
    config_query = source.get("query")
    if not config_query:
        print("  [ERROR] No query")
        return False
    
    try:
        resolved_query = build_pxweb_query(metadata, config_query)
    except ValueError as exc:
        print(f"  [ERROR] {exc}")
        return False
    
    raw_data = fetch_data(metadata_url, resolved_query)
    if not raw_data:
        print("  [SKIP] No data")
        return False
    
    save_raw(source_id, provider_key, metadata_url, config_query, 
             resolved_query, metadata, raw_data, manifest, changed)
    return True


def main():
    if not PROVIDERS_PATH.exists() or not SOURCES_PATH.exists():
        print("Error: providers.json or sources.json not found")
        sys.exit(1)
    
    providers = load_json(PROVIDERS_PATH).get("providers", {})
    sources = load_json(SOURCES_PATH).get("sources", {})
    
    args = sys.argv[1:]
    if not args:
        print("Usage: fetch_pxweb.py --all  OR  fetch_pxweb.py <source_id> [...]")
        sys.exit(1)
    
    if args[0] == "--all":
        selected = list(sources.keys())
        print(f"Fetching all {len(selected)} sources...\n")
    else:
        invalid = [s for s in args if s not in sources]
        if invalid:
            print(f"Error: unknown source(s): {', '.join(invalid)}")
            sys.exit(1)
        selected = args
        print(f"Fetching {len(selected)} source(s): {', '.join(selected)}\n")
    
    manifest = load_manifest()
    changed = []
    failed = False
    
    for source_id in selected:
        source = sources[source_id]
        provider_key = source.get("provider")
        
        if not provider_key:
            print(f"[SKIP] {source_id}: no provider\n")
            failed = True
            continue
        
        provider = providers.get(provider_key)
        if not provider:
            print(f"[ERROR] {source_id}: provider '{provider_key}' not found\n")
            failed = True
            continue
        
        try:
            process_source(provider_key, provider, source_id, source, manifest, changed)
        except Exception as e:
            print(f"[ERROR] {source_id}: {e}\n")
            failed = True
        
        print()
    
    save_manifest(manifest)
    
    print("=" * 60)
    if changed:
        print(f"[OK] Updated {len(changed)} source(s): {', '.join(changed)}")
        print("::set-output name=changes_detected::true")
    else:
        print("[OK] No changes detected")
        print("::set-output name=changes_detected::false")
    print("=" * 60)
    
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()