import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from utils import load_json, save_json


RAW_DIR = Path("data/raw")
OUTPUT_DIR = Path("data/processed")
SOURCES_PATH = Path("data/sources.json")
PROVIDERS_PATH = Path("data/providers.json")
METADATA_PATH = OUTPUT_DIR / "metadata.json"


def build_dimension_mapping(stat: Dict) -> Dict:
    mapping = {}
    for dim_id, dim in stat.get("dimension", {}).items():
        cat = dim.get("category", {})
        idx = cat.get("index", {})
        labels = cat.get("label", {})
        
        if isinstance(idx, list):
            codes = idx
        else:
            codes = [c for c, _ in sorted(idx.items(), key=lambda x: x[1])]
        
        mapping[dim_id] = [labels.get(c, c) for c in codes]
    
    return mapping


def jsonstat_to_observations(stat: Dict) -> list:
    mapping = build_dimension_mapping(stat)
    dims = stat.get("id", [])
    sizes = stat.get("size", [])
    values = stat.get("value", [])
    
    if not dims or not sizes or not isinstance(values, list):
        raise ValueError("Invalid JSON-stat structure")
    
    expected = 1
    for sz in sizes:
        expected *= sz
    
    if len(values) != expected:
        raise ValueError(f"Size mismatch: expected {expected}, got {len(values)}")
    
    observations = []
    for flat_idx, val in enumerate(values):
        coords = []
        rem = flat_idx
        for sz in reversed(sizes):
            coords.append(rem % sz)
            rem //= sz
        coords.reverse()
        
        obs = {}
        for dim_idx, dim_id in enumerate(dims):
            cat_idx = coords[dim_idx]
            cats = mapping.get(dim_id)
            if not cats or cat_idx >= len(cats):
                raise ValueError(f"Invalid category index for {dim_id}")
            obs[dim_id] = cats[cat_idx]
        
        obs["value"] = val
        observations.append(obs)
    
    return observations


def parse_year(value: Any) -> tuple:
    if isinstance(value, int):
        return value, None
    
    if not isinstance(value, str):
        raise ValueError(f"Invalid year: {value}")
    
    value = value.strip()
    marker = None
    if value.endswith("*"):
        marker = "*"
        value = value[:-1]
    
    try:
        return int(value), marker
    except ValueError:
        raise ValueError(f"Cannot parse year: {value}")


def resolve_dimension(dim_name: str, stat: Dict) -> str:
    dims = stat.get("dimension", {})
    
    if dim_name in dims:
        return dim_name
    
    for dim_id, dim in dims.items():
        if dim.get("label") == dim_name:
            return dim_id
    
    raise ValueError(f"Unknown dimension: {dim_name}")


def resolve_dimension_config(config: Dict, stat: Dict) -> Dict:
    resolved = {}
    for cfg_name, target in config.items():
        actual_id = resolve_dimension(cfg_name, stat)
        resolved[actual_id] = target
    return resolved


def resolve_filters(filters: Dict, stat: Dict) -> Dict:
    resolved = {}
    for cfg_dim, filter_cfg in filters.items():
        actual_dim = resolve_dimension(cfg_dim, stat)
        resolved[actual_dim] = filter_cfg
    return resolved


def obs_passes_filters(obs: Dict, filters: Dict) -> bool:
    for dim, filt in filters.items():
        if not isinstance(filt, dict):
            raise ValueError(f"Filter must be dict, not {type(filt)}")
        
        val = obs.get(dim)
        include = filt.get("include")
        exclude = filt.get("exclude")
        
        if include is not None and val not in include:
            return False
        if exclude is not None and val in exclude:
            return False
    
    return True


def transform_value(value: Any, transforms: list) -> Any:
    if value is None:
        return None
    
    result = value
    for tr in transforms:
        if isinstance(tr, str):
            t_type, cfg = tr, {}
        elif isinstance(tr, dict):
            t_type, cfg = tr.get("type"), tr
        else:
            raise ValueError(f"Invalid transform: {tr}")
        
        if t_type == "multiply_12":
            result *= 12
        elif t_type == "divide_12":
            result /= 12
        elif t_type == "absolute":
            result = abs(result)
        elif t_type == "multiply":
            result *= cfg.get("factor", 1)
        elif t_type == "divide":
            factor = cfg.get("factor")
            if factor == 0:
                raise ValueError("Cannot divide by 0")
            result /= factor
        elif t_type == "add":
            result += cfg.get("amount", 0)
        elif t_type == "subtract":
            result -= cfg.get("amount", 0)
        else:
            raise ValueError(f"Unknown transform: {t_type}")
    
    return result


def apply_generic_transform(observations: list, out_cfg: Dict, stat: Dict) -> list:
    dims_cfg = out_cfg.get("dimensions", {})
    fixed = out_cfg.get("fixed", {})
    filters = out_cfg.get("filters", {})
    val_transforms = out_cfg.get("transforms", {}).get("value", [])
    
    resolved_dims = resolve_dimension_config(dims_cfg, stat)
    resolved_filters = resolve_filters(filters, stat)
    
    result = []
    for obs in observations:
        if not obs_passes_filters(obs, resolved_filters):
            continue
        
        output = {}
        for src_dim, tgt_dim in resolved_dims.items():
            if src_dim not in obs:
                raise ValueError(f"Dimension {src_dim} not in observation")
            
            val = obs[src_dim]
            if tgt_dim == "year":
                year, marker = parse_year(val)
                output["year"] = year
                if marker:
                    output["yearStatus"] = "provisional"
            output[tgt_dim] = val
        
        output.update(fixed)
        
        val = obs.get("value")
        if val is not None and val_transforms:
            val = transform_value(val, val_transforms)
        output["value"] = val
        
        result.append(output)
    
    return result


def apply_difference_transform(observations: list, cfg: Dict, stat: Dict) -> list:
    dim_name = cfg.get("dimension")
    positive = cfg.get("positive")
    negative = cfg.get("negative")
    
    if not all([dim_name, positive is not None, negative is not None]):
        raise ValueError("difference requires dimension, positive, negative")
    
    dim = resolve_dimension(dim_name, stat)
    grouped = {}
    
    for obs in observations:
        if dim not in obs:
            raise ValueError(f"Dimension {dim} not in obs")
        
        key = tuple((k, v) for k, v in obs.items() if k not in ("value", dim))
        
        if key not in grouped:
            grouped[key] = {"dims": dict(key), "pos": None, "neg": None}
        
        cat = obs[dim]
        val = obs.get("value")
        
        if cat == positive:
            grouped[key]["pos"] = val
        elif cat == negative:
            grouped[key]["neg"] = val
    
    result = []
    for g in grouped.values():
        if g["pos"] is None or g["neg"] is None:
            continue
        out = dict(g["dims"])
        out["value"] = g["pos"] - g["neg"]
        result.append(out)
    
    return result


def apply_transformations(observations: list, out_cfg: Dict, stat: Dict) -> list:
    derived = out_cfg.get("transform")
    
    if derived:
        t_type = derived.get("type")
        if t_type == "difference":
            observations = apply_difference_transform(observations, derived, stat)
        else:
            raise ValueError(f"Unknown transform: {t_type}")
    
    return apply_generic_transform(observations, out_cfg, stat)


def build_series_metadata(source_id: str, source: Dict, provider: Dict, 
                         raw: Dict, stat: Dict) -> Dict:
    prov = raw.get("provenance", {})
    prov_name = provider.get("name", provider.get("shortName", ""))
    licence = source.get("licence", provider.get("licence", ""))
    attrib = source.get("attribution", provider.get("attribution", prov_name))
    url = prov.get("metadata_url") or source.get("url", "")
    fetched = prov.get("fetched_at", "").split("T")[0] if prov.get("fetched_at") else None
    
    out_cfg = source.get("output", {})
    name = out_cfg.get("name", stat.get("title", source.get("description", source_id)))
    unit = out_cfg.get("unit", "")
    series_type = out_cfg.get("seriesType", "observed")
    
    return {
        "id": source_id,
        "name": name,
        "unit": unit,
        "source": prov_name,
        "sourceUrl": url,
        "license": licence,
        "attribution": attrib,
        "retrieved": fetched,
        "seriesType": series_type,
    }


def process_source(source_id: str, source: Dict, providers: Dict) -> str:
    print(f"Processing: {source_id}")
    
    raw_path = RAW_DIR / f"{source_id}.json"
    if not raw_path.exists():
        print(f"  [ERROR] Raw file not found\n")
        return "failed"
    
    provider_key = source.get("provider")
    if not provider_key:
        print(f"  [ERROR] No provider\n")
        return "failed"
    
    provider = providers.get(provider_key)
    if not provider:
        print(f"  [ERROR] Provider '{provider_key}' not found\n")
        return "failed"
    
    try:
        raw = load_json(raw_path)
    except Exception as e:
        print(f"  [ERROR] Load failed: {e}\n")
        return "failed"
    
    stat = raw.get("data")
    if not isinstance(stat, dict):
        print(f"  [ERROR] Invalid data object\n")
        return "failed"
    
    out_cfg = source.get("output")
    if not isinstance(out_cfg, dict):
        print(f"  [ERROR] No output config\n")
        return "failed"
    
    if not out_cfg.get("enabled", True):
        print(f"  [SKIP] Disabled\n")
        return "skipped"
    
    try:
        observations = jsonstat_to_observations(stat)
    except Exception as e:
        print(f"  [ERROR] JSON-stat: {e}\n")
        return "failed"
    
    print(f"  Observations: {len(observations)}")
    
    try:
        transformed = apply_transformations(observations, out_cfg, stat)
    except Exception as e:
        print(f"  [ERROR] Transform: {e}\n")
        return "failed"
    
    if not transformed:
        print(f"  [ERROR] No observations after transform\n")
        return "failed"
    
    print(f"  Processed: {len(transformed)}")
    
    try:
        metadata = build_series_metadata(source_id, source, provider, raw, stat)
    except Exception as e:
        print(f"  [ERROR] Metadata: {e}\n")
        return "failed"
    
    series = dict(metadata)
    series["values"] = transformed
    
    out_path = OUTPUT_DIR / f"{source_id}.json"
    try:
        save_json(out_path, series, trailing_newline=True)
    except Exception as e:
        print(f"  [ERROR] Write failed: {e}\n")
        return "failed"
    
    print(f"  [OK] Saved\n")
    return "success"


def main():
    if not SOURCES_PATH.exists() or not PROVIDERS_PATH.exists():
        print("[ERROR] Missing sources.json or providers.json")
        sys.exit(1)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    prov_cfg = load_json(PROVIDERS_PATH)
    providers = prov_cfg.get("providers", prov_cfg)
    
    src_cfg = load_json(SOURCES_PATH)
    sources = src_cfg.get("sources", {})
    
    if not isinstance(sources, dict):
        print("[ERROR] sources.json must contain 'sources' object")
        sys.exit(1)
    
    print(f"Processing {len(sources)} sources...\n")
    
    metadata = []
    failed = []
    skipped = []
    
    for source_id, source in sources.items():
        status = process_source(source_id, source, providers)
        
        if status == "success":
            out_path = OUTPUT_DIR / f"{source_id}.json"
            generated = load_json(out_path)
            meta = {k: v for k, v in generated.items() if k != "values"}
            metadata.append(meta)
        elif status == "skipped":
            skipped.append(source_id)
        else:
            failed.append(source_id)
    
    try:
        save_json(METADATA_PATH, metadata, trailing_newline=True)
    except Exception as e:
        print(f"[ERROR] Write metadata: {e}")
        sys.exit(1)
    
    print(f"[OK] Metadata: {METADATA_PATH}\n")
    print(f"Success: {len(metadata)}/{len(sources)}")
    
    if skipped:
        print(f"Skipped: {', '.join(skipped)}")
    
    if failed:
        print(f"Failed: {', '.join(failed)}")
        sys.exit(1)
    
    print("All sources processed.")


if __name__ == "__main__":
    main()