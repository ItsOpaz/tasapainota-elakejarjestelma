# Data Specification

## 1. Purpose

This document defines the external data used by the pension-system simulation.

The application should prefer authoritative Finnish statistical sources and retain sufficient metadata to make every important input traceable.

See also:
- `docs/DATA_SOURCES.md` for the verified source map
- `data/sources.json` for machine-readable source inventory
- `DATA-LICENSES.md` for licence information

---

## 2. Data principles

The project follows these principles:

1. Prefer primary sources.
2. Record the original source of every dataset.
3. Do not silently modify source data.
4. Document transformations.
5. Store units explicitly.
6. Store years explicitly.
7. Distinguish historical observations from projections.
8. Record the date on which data was retrieved.
9. Preserve source licensing information.
10. Do not imply that model-generated values are official statistics.

---

## 3. Primary sources

Potential primary sources include:

* Eläketurvakeskus (ETK)
* Statistics Finland / Tilastokeskus
* Bank of Finland
* Finnish Ministry of Finance
* other relevant Finnish public authorities

The exact source for each variable must be recorded in the dataset metadata.

---

## 4. Data directory

The initial data structure is:

```text
data/
├── sources.json        # machine-readable source inventory
├── metadata.json       # provenance for each series
└── [series files]      # e.g., population_by_age.json, fertility_rates.json, etc.
```

This structure may evolve as the number of datasets grows.

---

## 5. Data record format

Every data series should contain metadata similar to:

```json
{
  "id": "population_by_age_sex",
  "name": "Population according to age (1-year) and sex",
  "unit": "persons",
  "source": "Statistics Finland",
  "sourceUrl": "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11re.px",
  "license": "CC BY 4.0",
  "retrieved": "YYYY-MM-DD",
  "seriesType": "observed",
  "values": [
    {
      "year": 2025,
      "age": 0,
      "value": 55432
    }
  ]
}
```

Note: The exact structure may vary by series (e.g., fertility rates have age groups, mortality has death counts that need conversion to rates).

---

## 6. Series types

Each series must be classified as one of:

```text
observed
projection
assumption
derived
```

### observed

Published historical or current observation.

### projection

Published external projection.

### assumption

A model parameter or scenario assumption.

### derived

A value calculated from other data.

---

## 7. Initial datasets

The initial implementation uses the following verified data sources (see `docs/DATA_SOURCES.md` for details):

### Demography

* population by age (1-year) and sex (Statistics Finland table 11re)
* age-specific fertility (5-year) rates (Statistics Finland table 12ds)
* deaths by age (1-year) and sex (Statistics Finland table 12ag)
* immigration and emigration by age (5-year), sex and area (Statistics Finland table 11a7)

### Labour market

* employed persons and employees in part-time or full-time work by sex and age (Statistics Finland table 13aw)
* average monthly earnings of full-time wage and salary earners by sector (Statistics Finland table 14uw)

### Economy

* gross domestic product and national income (Statistics Finland table 15a9)

### Pension system

* total expenditure on pensions (ETK statistical database)
* pension recipient counts (ETK pension recipient statistical database)
* average pension of earnings-related pension recipients (ETK statistical database)
* pension assets (ETK time-series database)
* premium income (contributions) (ETK time-series database)
* historical investment return on pension assets (ETK time-series database)

---

## 8. Historical data

Historical data should be retained where practical.

Historical data is important because it allows users to see how the model relates to actual past development.

Historical data should not automatically be treated as a forecast.

---

## 9. Projection data

Official projections should be stored separately from observed data.

Example:

```text
historical.json
    1990–2025

projections.json
    2026–2095
```

The actual years depend on the source.

For the baseline long-term assumption, document ETK 2026 long-term projection assumptions:
- Investment return: 3.18% real return annually in 2026-2035 and 3.75% from 2036 onward.
- Mortality: ETK 2026 long-term projection assumptions used as baseline reference for future mortality.

These are baseline/reference assumptions, not immutable model truth.

Long-term reference:
ETK 2026 long-term projections span 70 years.
Statistics Finland population projection 2024 is also a reference source.

Do not simply copy an official projection into the simulator; use it as a calibration/reference scenario.

---

## 10. Data transformations

If source data is transformed, the transformation must be documented.

Examples:

```text
death counts → death rates (probability) by dividing by population
monthly earnings → annual earnings (×12)
aggregate over areas → national total
net migration = immigration - emigration
```

If the historical net-migration profile is noisy, the smoothing/normalization method must be documented explicitly.

A transformation should never overwrite the original source without documentation.

---

## 11. Update process

The preferred architecture is:

```text
External source
      ↓
Data retrieval script
      ↓
Validation
      ↓
Normalised JSON
      ↓
Git repository
      ↓
Browser
```

The browser should not depend on an external API for the core simulation.

This makes the application robust when embedded on third-party websites.

---

## 12. Data validation

Before data is committed, automated checks should verify:

* expected fields exist
* years are valid
* numerical values are valid
* units are present
* source metadata exists
* duplicate years are detected
* missing values are detected
* unexpected changes can be flagged

---

## 13. Provenance

For every important series, the project should be able to answer:

> Where did this number come from?

and:

> What transformation was applied before it entered the simulation?

---

## 14. Licensing

The project source code is licensed under the project's software licence.

External datasets remain subject to their own licences and terms.

See:

`DATA-LICENSES.md`

for the dataset-specific licence information.

---

## 15. Data quality

External data may be revised by its publisher.

When a source revises historical data, the project should update its copy and record the update where the change materially affects results.

Data should never be presented as permanently fixed if the source itself is revised over time.