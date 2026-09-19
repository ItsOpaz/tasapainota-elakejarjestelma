# Data Specification

## 1. Purpose

This document defines the external data used by the pension-system simulation.

The application should prefer authoritative Finnish statistical sources and retain sufficient metadata to make every important input traceable.

---

# 2. Data principles

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

# 3. Primary sources

Potential primary sources include:

* Eläketurvakeskus (ETK)
* Statistics Finland / Tilastokeskus
* Bank of Finland
* Finnish Ministry of Finance
* other relevant Finnish public authorities

The exact source for each variable must be recorded in the dataset metadata.

---

# 4. Data directory

The initial data structure is:

```text
data/
├── current.json
├── historical.json
├── projections.json
└── metadata.json
```

This structure may evolve as the number of datasets grows.

---

# 5. Data record format

Every data series should contain metadata similar to:

```json
{
  "id": "tyel_contribution_rate",
  "name": "TyEL contribution rate",
  "unit": "%",
  "source": "Eläketurvakeskus",
  "sourceUrl": "https://...",
  "license": "...",
  "retrieved": "YYYY-MM-DD",
  "seriesType": "observed",
  "values": [
    {
      "year": 2026,
      "value": 24.4
    }
  ]
}
```

---

# 6. Series types

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

# 7. Initial datasets

The initial implementation should investigate the availability of the following data.

## Demography

* total population
* population by age
* births
* deaths
* migration
* fertility
* life expectancy

## Labour market

* employment
* employment rate
* unemployment
* labour force
* average earnings
* wage bill

## Economy

* GDP
* GDP growth
* inflation
* wage growth
* investment returns

## Pension system

* pension expenditure
* pension recipients
* pension assets
* pension contributions
* contribution rates
* average pensions
* pension expenditure / GDP
* relevant pension-system projections

---

# 8. Historical data

Historical data should be retained where practical.

Historical data is important because it allows users to see how the model relates to actual past development.

Historical data should not automatically be treated as a forecast.

---

# 9. Projection data

Official projections should be stored separately from observed data.

Example:

```text
historical.json
    1990–2025

projections.json
    2026–2090
```

The actual years depend on the source.

---

# 10. Data transformations

If source data is transformed, the transformation must be documented.

Examples:

```text
EUR → EUR billion
```

or:

```text
population groups → working-age population
```

or:

```text
monthly value → annual value
```

A transformation should never overwrite the original source without documentation.

---

# 11. Update process

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

# 12. Data validation

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

# 13. Provenance

For every important series, the project should be able to answer:

> Where did this number come from?

and:

> What transformation was applied before it entered the simulation?

---

# 14. Licensing

The project source code is licensed under the project's software licence.

External datasets remain subject to their own licences and terms.

See:

`DATA-LICENSES.md`

for the dataset-specific licence information.

---

# 15. Data quality

External data may be revised by its publisher.

When a source revises historical data, the project should update its copy and record the update where the change materially affects results.

Data should never be presented as permanently fixed if the source itself is revised over time.
