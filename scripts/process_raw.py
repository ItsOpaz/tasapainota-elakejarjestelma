#!/usr/bin/env python3
"""
Process raw JSON-stat data from PxWeb API into clean JSON series.

Reads:
    data/raw/<source_id>.json
    data/sources.json
    providers.json

Writes:
    data/<source_id>.json
    data/metadata.json

The source configuration may use either:
    - actual JSON-stat dimension IDs, or
    - human-readable PxWeb dimension labels.

The processor resolves human-readable dimension names to the
actual JSON-stat IDs using the metadata contained in the raw file.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

RAW_DIR = Path("data/raw")
OUTPUT_DIR = Path("data/processed")
SOURCES_PATH = Path("data/sources.json")
PROVIDERS_PATH = Path("data/providers.json")
METADATA_PATH = OUTPUT_DIR / "metadata.json"


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")


# ---------------------------------------------------------------------------
# JSON-stat dimension helpers
# ---------------------------------------------------------------------------

def build_dimension_info(
    stat: Dict[str, Any],
) -> Dict[str, Dict[str, Any]]:
    """
    Build a lookup for JSON-stat dimensions.

    Returns something like:

    {
        "timeperiod_y": {
            "id": "timeperiod_y",
            "label": "Vuosi",
            "labels": [...]
        }
    }

    Both the actual dimension ID and the human-readable label can
    subsequently be used in sources.json.
    """

    result: Dict[str, Dict[str, Any]] = {}

    dimensions = stat.get("dimension", {})

    for dimension_id, dimension in dimensions.items():
        result[dimension_id] = {
            "id": dimension_id,
            "label": dimension.get("label", dimension_id),
        }

    return result


def resolve_dimension(
    configured_dimension: str,
    stat: Dict[str, Any],
) -> str:
    """
    Resolve a configured dimension name to the actual JSON-stat ID.

    Accepts either:

        "timeperiod_y"

    or:

        "Vuosi"

    If the configured value is already an ID, it is returned unchanged.
    """

    dimensions = stat.get("dimension", {})

    # Already an actual JSON-stat dimension ID.
    if configured_dimension in dimensions:
        return configured_dimension

    # Try human-readable dimension label.
    for dimension_id, dimension in dimensions.items():
        label = dimension.get("label")

        if label == configured_dimension:
            return dimension_id

    available = []

    for dimension_id, dimension in dimensions.items():
        label = dimension.get("label", dimension_id)
        available.append(
            f"{dimension_id} ({label})"
        )

    raise ValueError(
        f"Could not resolve configured dimension "
        f"'{configured_dimension}'. "
        f"Available dimensions: {', '.join(available)}"
    )


def resolve_dimension_config(
    config: Dict[str, Any],
    stat: Dict[str, Any],
) -> Dict[str, str]:
    """
    Resolve all configured dimension names.

    Example:

        {
            "Vuosi": "year",
            "Ikä": "age"
        }

    becomes:

        {
            "timeperiod_y": "year",
            "ikaryhma_10_20180101": "age"
        }
    """

    resolved: Dict[str, str] = {}

    for configured_name, target_name in config.items():
        actual_id = resolve_dimension(
            configured_name,
            stat,
        )

        resolved[actual_id] = target_name

    return resolved


# ---------------------------------------------------------------------------
# JSON-stat conversion
# ---------------------------------------------------------------------------

def build_dimension_mapping(
    stat: Dict[str, Any],
) -> Dict[str, List[Any]]:
    """
    Build:

        dimension ID -> ordered list of category labels
    """

    mapping: Dict[str, List[Any]] = {}

    dimensions = stat.get("dimension", {})

    for dimension_id, dimension in dimensions.items():
        category = dimension.get("category", {})

        index = category.get("index", {})
        labels = category.get("label", {})

        if isinstance(index, list):
            ordered_codes = index
        else:
            ordered_codes = [
                code
                for code, _ in sorted(
                    index.items(),
                    key=lambda item: item[1],
                )
            ]

        mapping[dimension_id] = [
            labels.get(code, code)
            for code in ordered_codes
        ]

    return mapping


def jsonstat_to_observations(
    stat: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Convert JSON-stat into flat observations.

    Example:

        {
            "timeperiod_y": "2025",
            "ikaryhma_10_20180101": "25-29",
            "value": 12345
        }
    """

    dimension_mapping = build_dimension_mapping(stat)

    dimension_order = stat.get("id", [])
    sizes = stat.get("size", [])
    values = stat.get("value", [])

    if not dimension_order:
        raise ValueError(
            "JSON-stat response has no dimensions"
        )

    if not sizes:
        raise ValueError(
            "JSON-stat response has no dimension sizes"
        )

    if not isinstance(values, list):
        raise ValueError(
            "JSON-stat response has no value array"
        )

    expected_values = 1

    for size in sizes:
        expected_values *= size

    if len(values) != expected_values:
        raise ValueError(
            "Mismatch between JSON-stat dimensions and values: "
            f"expected {expected_values}, got {len(values)}"
        )

    observations: List[Dict[str, Any]] = []

    for flat_index, value in enumerate(values):

        coordinates = []
        remainder = flat_index

        # Last dimension changes fastest in JSON-stat.
        for size in reversed(sizes):
            coordinates.append(remainder % size)
            remainder //= size

        coordinates.reverse()

        observation: Dict[str, Any] = {}

        for dimension_index, dimension_id in enumerate(
            dimension_order
        ):
            category_index = coordinates[dimension_index]

            categories = dimension_mapping.get(
                dimension_id
            )

            if categories is None:
                raise ValueError(
                    f"No category mapping found for "
                    f"dimension '{dimension_id}'"
                )

            if category_index >= len(categories):
                raise ValueError(
                    f"Category index {category_index} out of "
                    f"range for dimension '{dimension_id}'"
                )

            observation[dimension_id] = (
                categories[category_index]
            )

        observation["value"] = value

        observations.append(observation)

    return observations


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------

def resolve_filters(
    filters: Dict[str, Any],
    stat: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Resolve filter dimension names from human-readable labels
    to actual JSON-stat IDs.
    """

    resolved: Dict[str, Any] = {}

    for configured_dimension, filter_config in filters.items():

        actual_dimension = resolve_dimension(
            configured_dimension,
            stat,
        )

        resolved[actual_dimension] = filter_config

    return resolved


def observation_passes_filters(
    observation: Dict[str, Any],
    filters: Dict[str, Any],
) -> bool:

    for dimension, filter_config in filters.items():

        value = observation.get(dimension)

        if not isinstance(filter_config, dict):
            raise ValueError(
                f"Filter for '{dimension}' must be an object"
            )

        include = filter_config.get("include")
        exclude = filter_config.get("exclude")

        if include is not None:
            if value not in include:
                return False

        if exclude is not None:
            if value in exclude:
                return False

    return True


# ---------------------------------------------------------------------------
# Value transformations
# ---------------------------------------------------------------------------

def transform_value(
    value: Any,
    transforms: List[Any],
) -> Any:

    if value is None:
        return None

    result = value

    for transform in transforms:

        if isinstance(transform, str):
            transform_type = transform
            config = {}

        elif isinstance(transform, dict):
            transform_type = transform.get("type")
            config = transform

        else:
            raise ValueError(
                f"Invalid value transformation: "
                f"{transform!r}"
            )

        if transform_type == "multiply_12":
            result *= 12

        elif transform_type == "divide_12":
            result /= 12

        elif transform_type == "absolute":
            result = abs(result)

        elif transform_type == "multiply":
            factor = config.get("factor")

            if factor is None:
                raise ValueError(
                    "multiply transformation requires 'factor'"
                )

            result *= factor

        elif transform_type == "divide":
            factor = config.get("factor")

            if factor is None:
                raise ValueError(
                    "divide transformation requires 'factor'"
                )

            if factor == 0:
                raise ValueError(
                    "divide transformation cannot use factor 0"
                )

            result /= factor

        elif transform_type == "add":
            amount = config.get("amount")

            if amount is None:
                raise ValueError(
                    "add transformation requires 'amount'"
                )

            result += amount

        elif transform_type == "subtract":
            amount = config.get("amount")

            if amount is None:
                raise ValueError(
                    "subtract transformation requires 'amount'"
                )

            result -= amount

        else:
            raise ValueError(
                f"Unknown value transformation: "
                f"{transform_type}"
            )

    return result


# ---------------------------------------------------------------------------
# Generic transformation
# ---------------------------------------------------------------------------

def apply_generic_transform(
    observations: List[Dict[str, Any]],
    output_config: Dict[str, Any],
    stat: Dict[str, Any],
) -> List[Dict[str, Any]]:

    dimensions = output_config.get(
        "dimensions",
        {},
    )

    fixed = output_config.get(
        "fixed",
        {},
    )

    filters = output_config.get(
        "filters",
        {},
    )

    transforms_config = output_config.get(
        "transforms",
        {},
    )

    value_transforms = transforms_config.get(
        "value",
        [],
    )

    resolved_dimensions = resolve_dimension_config(
        dimensions,
        stat,
    )

    resolved_filters = resolve_filters(
        filters,
        stat,
    )

    result: List[Dict[str, Any]] = []

    for observation in observations:

        if not observation_passes_filters(
            observation,
            resolved_filters,
        ):
            continue

        output: Dict[str, Any] = {}

        # ---------------------------------------------------------------
        # Dimension mapping
        # ---------------------------------------------------------------

        for source_dimension, target_dimension in (
            resolved_dimensions.items()
        ):

            if source_dimension not in observation:
                raise ValueError(
                    f"Resolved dimension "
                    f"'{source_dimension}' not present "
                    f"in observation"
                )

            value = observation[
                source_dimension
            ]

            # Generic year conversion.
            if target_dimension == "year":
                year, marker = parse_year(value)

                output["year"] = year

                if marker:
                    output["yearStatus"] = "provisional"

            output[target_dimension] = value

        # ---------------------------------------------------------------
        # Fixed dimensions
        # ---------------------------------------------------------------

        output.update(fixed)

        # ---------------------------------------------------------------
        # Value
        # ---------------------------------------------------------------

        value = observation.get("value")

        if (
            value is not None
            and value_transforms
        ):
            value = transform_value(
                value,
                value_transforms,
            )

        output["value"] = value

        result.append(output)

    return result


def parse_year(value: Any) -> tuple[int, str | None]:
    """
    Parse PxWeb year labels such as:

        2025
        2025*
        2024*

    Returns:

        (numeric_year, original_marker)

    Examples:

        "2025"  -> (2025, None)
        "2025*" -> (2025, "*")
    """

    if isinstance(value, int):
        return value, None

    if not isinstance(value, str):
        raise ValueError(
            f"Invalid year value: {value!r}"
        )

    value = value.strip()

    marker = None

    if value.endswith("*"):
        marker = "*"
        value = value[:-1]

    try:
        year = int(value)
    except ValueError as exc:
        raise ValueError(
            f"Could not parse year '{value}'"
        ) from exc

    return year, marker

# ---------------------------------------------------------------------------
# Derived transformations
# ---------------------------------------------------------------------------

def apply_difference_transform(
    observations: List[Dict[str, Any]],
    config: Dict[str, Any],
    stat: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Calculate:

        positive - negative

    grouped by every dimension except the selected
    transformation dimension.
    """

    configured_dimension = config.get(
        "dimension"
    )

    positive = config.get(
        "positive"
    )

    negative = config.get(
        "negative"
    )

    if not configured_dimension:
        raise ValueError(
            "difference transformation requires "
            "'dimension'"
        )

    if positive is None:
        raise ValueError(
            "difference transformation requires "
            "'positive'"
        )

    if negative is None:
        raise ValueError(
            "difference transformation requires "
            "'negative'"
        )

    dimension = resolve_dimension(
        configured_dimension,
        stat,
    )

    grouped: Dict[Any, Dict[str, Any]] = {}

    for observation in observations:

        if dimension not in observation:
            raise ValueError(
                f"Difference dimension '{dimension}' "
                f"not found in observation"
            )

        key = tuple(
            (key, value)
            for key, value in observation.items()
            if key not in (
                "value",
                dimension,
            )
        )

        if key not in grouped:
            grouped[key] = {
                "dimensions": {
                    key_name: key_value
                    for key_name, key_value in key
                },
                "positive": None,
                "negative": None,
            }

        category = observation[
            dimension
        ]

        value = observation.get(
            "value"
        )

        if category == positive:
            grouped[key]["positive"] = value

        elif category == negative:
            grouped[key]["negative"] = value

    result: List[Dict[str, Any]] = []

    for group in grouped.values():

        positive_value = group[
            "positive"
        ]

        negative_value = group[
            "negative"
        ]

        # Never silently interpret missing data as zero.
        if (
            positive_value is None
            or negative_value is None
        ):
            continue

        output = dict(
            group["dimensions"]
        )

        output["value"] = (
            positive_value
            - negative_value
        )

        result.append(output)

    return result


def apply_transformations(
    observations: List[Dict[str, Any]],
    output_config: Dict[str, Any],
    stat: Dict[str, Any],
) -> List[Dict[str, Any]]:

    derived_transform = output_config.get(
        "transform"
    )

    if derived_transform:

        transform_type = (
            derived_transform.get("type")
        )

        if transform_type == "difference":

            observations = apply_difference_transform(
                observations,
                derived_transform,
                stat,
            )

        else:
            raise ValueError(
                f"Unknown derived transformation: "
                f"{transform_type}"
            )

    return apply_generic_transform(
        observations,
        output_config,
        stat,
    )


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------

def get_provider_config(
    providers: Dict[str, Any],
    provider_key: str,
) -> Dict[str, Any]:

    provider = providers.get(
        provider_key
    )

    if provider is None:
        raise ValueError(
            f"Provider '{provider_key}' "
            f"not found in providers.json"
        )

    return provider


def build_series_metadata(
    source_id: str,
    source: Dict[str, Any],
    provider: Dict[str, Any],
    raw_data: Dict[str, Any],
    stat: Dict[str, Any],
) -> Dict[str, Any]:

    provenance = raw_data.get(
        "provenance",
        {}
    )

    provider_name = provider.get(
        "name",
        provider.get(
            "shortName",
            source.get(
                "provider",
                "",
            ),
        ),
    )

    licence = source.get(
        "licence",
        provider.get(
            "licence",
            "",
        ),
    )

    attribution = source.get(
        "attribution",
        provider.get(
            "attribution",
            provider_name,
        ),
    )

    source_url = provenance.get(
        "metadata_url"
    )

    if not source_url:
        source_url = source.get(
            "url",
            "",
        )

    fetched_at = provenance.get(
        "fetched_at"
    )

    retrieved = None

    if fetched_at:
        retrieved = fetched_at.split(
            "T",
            1,
        )[0]

    output_config = source.get(
        "output",
        {},
    )

    name = output_config.get(
        "name",
        stat.get(
            "title",
            source.get(
                "description",
                source_id,
            ),
        ),
    )

    unit = output_config.get(
        "unit",
        "",
    )

    series_type = output_config.get(
        "seriesType",
        "observed",
    )

    return {
        "id": source_id,
        "name": name,
        "unit": unit,
        "source": provider_name,
        "sourceUrl": source_url,
        "license": licence,
        "attribution": attribution,
        "retrieved": retrieved,
        "seriesType": series_type,
    }


# ---------------------------------------------------------------------------
# Source processing
# ---------------------------------------------------------------------------

def process_source(
    source_id: str,
    source: Dict[str, Any],
    providers: Dict[str, Any],
) -> str:

    print(
        f"Processing source: {source_id}"
    )

    raw_path = (
        RAW_DIR
        / f"{source_id}.json"
    )

    if not raw_path.exists():
        print(
            f"  [ERROR] Raw file not found: "
            f"{raw_path}"
        )
        return "failed"

    provider_key = source.get(
        "provider"
    )

    if not provider_key:
        print(
            "  [ERROR] Source has no provider"
        )
        return "failed"

    try:
        provider = get_provider_config(
            providers,
            provider_key,
        )

    except ValueError as exc:
        print(
            f"  [ERROR] {exc}"
        )
        return "failed"

    try:
        raw_data = load_json(
            raw_path
        )

    except Exception as exc:
        print(
            f"  [ERROR] Could not read raw "
            f"file: {exc}"
        )
        return "failed"

    stat = raw_data.get(
        "data"
    )

    if not isinstance(stat, dict):
        print(
            "  [ERROR] Raw file does not "
            "contain a valid 'data' object"
        )
        return "failed"

    output_config = source.get(
        "output"
    )

    if not isinstance(
        output_config,
        dict,
    ):
        print(
            "  [ERROR] Source has no "
            "'output' configuration"
        )
        return "failed"

    # ---------------------------------------------------------------
    # Optional source disabling
    # ---------------------------------------------------------------

    if output_config.get(
        "enabled",
        True,
    ) is False:

        print(
            "  [SKIP] Output disabled "
            "for this source"
        )

        return "skipped"

    # ---------------------------------------------------------------
    # JSON-stat conversion
    # ---------------------------------------------------------------

    try:
        observations = (
            jsonstat_to_observations(
                stat
            )
        )

    except Exception as exc:
        print(
            f"  [ERROR] JSON-stat "
            f"conversion failed: {exc}"
        )
        return "failed"

    print(
        f"  JSON-stat observations: "
        f"{len(observations)}"
    )

    # ---------------------------------------------------------------
    # Transformations
    # ---------------------------------------------------------------

    try:
        transformed = (
            apply_transformations(
                observations,
                output_config,
                stat,
            )
        )

    except Exception as exc:
        print(
            f"  [ERROR] Transformation "
            f"failed: {exc}"
        )
        return "failed"

    if not transformed:
        print(
            "  [ERROR] No observations "
            "after transformation"
        )
        return "failed"

    print(
        f"  Processed observations: "
        f"{len(transformed)}"
    )

    # ---------------------------------------------------------------
    # Metadata
    # ---------------------------------------------------------------

    try:
        metadata = build_series_metadata(
            source_id,
            source,
            provider,
            raw_data,
            stat,
        )

    except Exception as exc:
        print(
            f"  [ERROR] Metadata creation "
            f"failed: {exc}"
        )
        return "failed"

    # ---------------------------------------------------------------
    # Final output
    # ---------------------------------------------------------------

    series = dict(metadata)

    series["values"] = transformed

    output_path = (
        OUTPUT_DIR
        / f"{source_id}.json"
    )

    try:
        save_json(
            output_path,
            series,
        )

    except Exception as exc:
        print(
            f"  [ERROR] Could not write "
            f"{output_path}: {exc}"
        )
        return "failed"

    print(
        f"  [OK] Written to "
        f"{output_path}"
    )

    return "success"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:

    if not SOURCES_PATH.exists():
        print(
            f"[ERROR] Sources file not "
            f"found: {SOURCES_PATH}"
        )
        sys.exit(1)

    if not PROVIDERS_PATH.exists():
        print(
            f"[ERROR] Providers file not "
            f"found: {PROVIDERS_PATH}"
        )
        sys.exit(1)

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------------
    # Providers
    # ---------------------------------------------------------------

    providers_config = load_json(
        PROVIDERS_PATH
    )

    if "providers" in providers_config:
        providers = (
            providers_config["providers"]
        )
    else:
        providers = providers_config

    # ---------------------------------------------------------------
    # Sources
    # ---------------------------------------------------------------

    sources_config = load_json(
        SOURCES_PATH
    )

    sources = sources_config.get(
        "sources",
        {},
    )

    if not isinstance(
        sources,
        dict,
    ):
        print(
            "[ERROR] sources.json must "
            "contain 'sources' as an object"
        )
        sys.exit(1)

    print(
        f"Processing {len(sources)} "
        f"configured sources..."
    )

    print()

    all_metadata: List[
        Dict[str, Any]
    ] = []

    failed_sources: List[str] = []

    skipped_sources: List[str] = []

    # ---------------------------------------------------------------
    # Process
    # ---------------------------------------------------------------

    for source_id, source in (
        sources.items()
    ):

        status = process_source(
            source_id,
            source,
            providers,
        )

        if status == "success":

            # Read the metadata back from
            # the generated series file.
            output_path = (
                OUTPUT_DIR
                / f"{source_id}.json"
            )

            generated = load_json(
                output_path
            )

            metadata = {
                key: value
                for key, value
                in generated.items()
                if key != "values"
            }

            all_metadata.append(
                metadata
            )

        elif status == "skipped":

            skipped_sources.append(
                source_id
            )

        else:

            failed_sources.append(
                source_id
            )

        print()

    # ---------------------------------------------------------------
    # metadata.json
    # ---------------------------------------------------------------

    try:
        save_json(
            METADATA_PATH,
            all_metadata,
        )

    except Exception as exc:
        print(
            f"[ERROR] Could not write "
            f"{METADATA_PATH}: {exc}"
        )
        sys.exit(1)

    print(
        f"[OK] Written metadata to "
        f"{METADATA_PATH}"
    )

    print()

    print(
        f"Successful: "
        f"{len(all_metadata)} / "
        f"{len(sources)}"
    )

    if skipped_sources:
        print(
            "Skipped: "
            + ", ".join(
                skipped_sources
            )
        )

    if failed_sources:

        print(
            "Failed sources: "
            + ", ".join(
                failed_sources
            )
        )

        sys.exit(1)

    print(
        "All enabled sources processed "
        "successfully."
    )


if __name__ == "__main__":
    main()