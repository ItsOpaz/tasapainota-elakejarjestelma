# Phase A Completion Report: Data Source Map and Inventory

## All Documented Series

The following 13 data series have been documented in `docs/DATA_SOURCES.md` and `data/sources.json`:

1. **Population by age and sex** - Statistics Finland Table 11re
2. **Age-specific fertility rates** - Statistics Finland Table 12ds
3. **Observed mortality (deaths)** - Statistics Finland Table 12ag
4. **Mortality projection reference** - Statistics Finland Population Projection 2024
5. **Net migration by age/sex** - Statistics Finland Table 11a7
6. **Employment by age/sex** - Statistics Finland Table 13aw
7. **Average monthly earnings** - Statistics Finland Table 14uw
8. **GDP** - Statistics Finland Table 15a9
9. **Pension expenditure (earnings-related)** - ETK statistical database
10. **Pension recipient counts** - ETK pension recipient statistical database
11. **Average pension (earnings-related)** - ETK statistical database
12. **Pension assets** - ETK time-series database
13. **Premium income (contributions)** - ETK time-series database
14. **Historical investment return** - ETK time-series database

## Exact Identifiers Confirmed

The following exact dataset identifiers have been confirmed from the sources:

- Population: `statfin_vaerak_pxt_11re`
- Fertility: `statfin_synty_pxt_12ds`
- Mortality (deaths): `statfin_kuol_pxt_12ag`
- Migration: `statfin_muutto_pxt_11a7`
- Employment: `statfin_tyovo_pxt_13aw`
- Earnings: `statfin_palk_pxt_14uw`
- GDP: `statfin_bkt_pxt_15a9`

## Remaining Unresolved Source/API Details

The following ETK datasets do not yet have established API endpoints or table identifiers (these require Phase B acquisition work):

- Pension expenditure (earnings-related) - ETK statistical database
- Pension recipient counts - ETK pension recipient statistical database
- Average pension (earnings-related) - ETK statistical database
- Pension assets - ETK time-series database
- Premium income (contributions) - ETK time-series database
- Historical investment return - ETK time-series database

**Note:** No API URLs were fabricated; these are left unresolved for Phase B as instructed.

For the mortality projection reference, the exact identifier for Statistics Finland population projection 2024 is not yet specified (left as reference only).

## Licensing Status

All documented sources have verified licensing:

- **Statistics Finland datasets** (7 series): CC BY 4.0
  - Verified via: https://www.stat.fi/tup/kasutajaoiked_en.html

- **ETK datasets** (6 series): CC BY 4.0
  - As provided by the user mid-turn: "Eläketurvakeskus (ETK) statistical database Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)"
  - Attribution required: "Finnish Centre for Pensions (Eläketurvakeskus / ETK) must be cited as the source"

External data licences remain separate from the repository MIT licence, as documented in `DATA-LICENSES.md`.

## Model Decisions Requiring Specification Before Phase C

The following modeling decisions still require specification before proceeding to Phase C (Model Specification):

1. **Pensioner definition**: Will use ETK pension recipient counts by age/benefit (more accurate) rather than population above retirement age. Confirmation needed.

2. **Wage bill calculation**: Will use average earnings from table 14uw multiplied by employed persons from table 13aw (age groups). Limitation: age groups, not single-year age; will document and assume uniform distribution within age groups or use group rate for each single year. Confirmation needed.

3. **GDP treatment**: Will treat GDP as exogenous from table 15a9 (observed) and use directly for pension expenditure/GDP ratio. For future years, will need to make an assumption (scenario) or use official projections. Confirmation needed.

4. **Migration distribution**: Will distribute net migration by age/sex using observed age/sex structure from table 11a7 (5-year groups). Will compute proportions and apply total net migration assumption. Confirmation needed.

5. **Mortality assumption for future years**: For baseline, may hold mortality rates constant at last observed year (2025) or use scenario based on Statistics Finland population projection 2024 reference. Needs explicit specification.

6. **Fertility assumption for future years**: Similarly, may hold fertility rates constant at last observed year or use scenario based on reference projections. Needs explicit specification.

7. **Employment rate assumption for future years**: Will need to make an assumption (scenario) for future employment rates by age group. Needs explicit specification.

8. **Average earnings growth assumption**: Will need to make an assumption (scenario) for future average earnings growth. Needs explicit specification.

9. **GDP growth assumption for future years**: Will need to make an assumption (scenario) for future GDP growth. Needs explicit specification.

10. **Investment return assumption for future years**: Baseline uses ETK 2026 long-term projection assumptions (3.18% real 2026-2035, 3.75% from 2036), but these are reference assumptions; will make them user-adjustable scenarios. Confirmation that these are acceptable as baseline assumptions.

## Base Year and Horizon

- **Base year**: 2025 (provisional) - confirmed as the year when major observed series are available
- **Horizon**: 2025-2095 (70 years) - subject to availability of documented long-term assumptions/reference data
- **Note**: Preliminary 2025 economic data (GDP, earnings, etc.) are marked as preliminary by Statistics Finland where applicable

## Files Created/Updated

1. `docs/DATA_SOURCES.md` - Detailed verified source map
2. `data/sources.json` - Machine-readable source inventory
3. `DATA-LICENSES.md` - Updated with verified CC BY 4.0 licences for all sources
4. `docs/DATA.md` - Updated to reference the new sources document and reflect verified series

## Next Steps

Upon your review and confirmation of the modeling decisions listed above, we can proceed to Phase B (Data Schema and Acquisition) to:
- Download and convert actual datasets to JSON format
- Establish ETK API connections or download files
- Populate the data/ directory with actual JSON files
- Create metadata.json with provenance for each series

**Stop after documentation. Do not proceed to data acquisition or model implementation.**