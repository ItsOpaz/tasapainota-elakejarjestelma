# Assumptions for Tasapainota Suomen eläkejärjestelmä

This document documents all modeling assumptions used in the pension-system simulation that are not directly taken from observed data. Assumptions are grouped by topic and reference the source or methodology used.

## 1. Pensioner Definition

- **Assumption**: Pensioner counts are taken from the Finnish Centre for Pensions (ETK) pension recipient statistical database, classified by age and benefit type (earnings-related, national, etc.).
- **Justification**: Using ETK recipient counts provides a more accurate representation of actual pension recipients than assuming all persons above retirement age are pensioners.
- **Source**: ETK pension recipient statistical database (see `data/sources.json`).
- **Note**: If ETK recipient data are unavailable for a given year or age group, we will fallback to population above retirement age and document the gap.

## 2. Wage Bill Calculation

- **Assumption**: Total wage bill = (average monthly earnings of full-time wage and salary earners from Statistics Finland Table 14uw) × 12 × (total employed persons from Statistics Finland Table 13aw).
- **Limitation**: Table 13aw provides employed persons by age groups (e.g., 15-19, 20-24, …, 65-74, 75+), not single‑year ages. We assume uniform distribution within each age group or apply the group rate to each single year within the group.
- **Justification**: This keeps average earnings separate from total insured wage sum and uses the best available observed earnings data.
- **Source**: Statistics Finland Tables 13aw and 14uw (see `data/sources.json`).

## 3. GDP Treatment

- **Assumption**: Gross Domestic Product (GDP) is taken as observed values from Statistics Finland Table 15a9 (current‑price, million euros). For future years (projection period), GDP is treated as an external scenario (user‑adjustable assumption) or derived from official projections (e.g., Ministry of Finance).
- **Justification**: Using observed GDP ensures the model is calibrated to historical economic size. Future GDP is uncertain and therefore treated as a scenario.
- **Source**: Statistics Finland Table 15a9 (see `data/sources.json`).

## 4. Migration Distribution

- **Assumption**: Net migration (immigration minus emigration) is distributed by age and sex using the observed age/sex structure from Statistics Finland Table 11a7 (5‑year age groups). For each year, we compute the proportion of net migration in each age/sex group from the historical data and apply the total net migration assumption (scenario) to those proportions.
- **Additional Note**: We do NOT assume all migrants are a single age or that migration is uniformly distributed across ages. If the historical net‑migration profile is noisy, we will apply smoothing (e.g., moving average over 3‑5 years) or normalization (e.g., Logan‑Poisson smoothing) and document the method explicitly in the model code.
- **Justification**: This uses the best available observed migration age/sex patterns while allowing the overall migration level to be varied via scenario.
- **Source**: Statistics Finland Table 11a7 (see `data/sources.json`).

## 5. Mortality Assumption for Future Years

- **Assumption**: Future mortality rates (probability of death by age and sex) are based on the ETK 2026 long‑term projection assumptions. Specifically, we use the projected life‑expecancy or mortality improvement rates from ETK 2026 to project mortality rates forward from the last observed year (2025). If ETK does not publish age‑specific mortality rates, we derive them from the projected life‑expecancy using a standard model (e.g., Lee‑Carter) and document the derivation.
- **Justification**: The ETK 2026 long‑term projections are an authoritative source for future mortality trends in the Finnish pension system.
- **Source**: ETK 2026 long‑term projections (see `data/sources.json`).
- **Reference**: ETK API changes guidance: https://stat.fi/fi/palvelut/tilastodatapalvelut/avoin-data-ja-rajapinnat/tietokantojen-rajapintakaytto/api-kyselyjen-muutosohje

## 6. Fertility Assumption for Future Years

- **Assumption**: Future fertility rates (age‑specific) are held constant at the last observed year (2025) values from Statistics Finland Table 12ds, unless a scenario is specified that adjusts rates (e.g., a proportional shift based on reference projections).
- **Justification**: The observed fertility rates for 2025 are the most recent reliable data. Alternative scenarios can be explored via user‑adjustable parameters.
- **Source**: Statistics Finland Table 12ds (see `data/sources.json`).

## 7. Employment Rate Assumption for Future Years

- **Assumption**: Future employment rates (by age group, from Statistics Finland Table 13aw) are held constant at the last observed year (2025) values, unless a scenario is specified that adjusts rates (e.g., a linear trend or shock).
- **Justification**: The observed employment rates for 2025 are the most recent reliable data. Alternative scenarios can be explored via user‑adjustable parameters.
- **Source**: Statistics Finland Table 13aw (see `data/sources.json`).

## 8. Average Earnings Growth Assumption

- **Assumption**: Future average monthly earnings (from Statistics Finland Table 14uw) grow at a constant annual rate (scenario), or follow a user‑defined path (e.g., tied to productivity or inflation). The baseline assumption may be zero growth (constant real earnings) or linked to GDP per worker growth.
- **Justification**: Earnings growth is uncertain and therefore treated as a scenario.
- **Source**: Statistics Finland Table 14uw (see `data/sources.json`).

## 9. GDP Growth Assumption for Future Years

- **Assumption**: Future GDP growth (from Statistics Finland Table 15a9) is treated as a scenario (user‑adjustable annual growth rate or path). The baseline may follow the IMF or Ministry of Finance medium‑term forecast, but this is documented as a reference assumption only.
- **Justification**: GDP growth is uncertain and therefore treated as a scenario.
- **Source**: Statistics Finland Table 15a9 (see `data/sources.json`).

## 10. Investment Return Assumption for Future Years

- **Assumption**: The baseline long‑term assumption for the real investment return on pension assets is taken from the ETK 2026 long‑term projections:
  - 3.18% real return annually for 2026‑2035
  - 3.75% real return annually from 2036 onward
  These values are reference assumptions; users can adjust them via scenarios.
- **Justification**: The ETK 2026 long‑term projections provide an authoritative baseline for expected returns on Finnish pension assets.
- **Source**: ETK 2026 long‑term projections (see `data/sources.json`).
- **Reference**: ETK API changes guidance: https://stat.fi/fi/palvelut/tilastodatapalvelut/avoin-data-ja-rajapinnat/tietokantojen-rajapintakaytto/api-kyselyjen-muutosohje

## 11. Base Year and Horizon

- **Assumption**: The model base year is 2025 (provisional), as the major observed series (population, fertility, mortality, migration, employment, earnings, GDP, pension expenditure, recipients, assets, contributions, returns) are available through 2025. Preliminary 2025 economic data are marked as such where applicable.
- **Horizon**: The simulator target horizon is 2025‑2095 (70 years), subject to the availability of documented long‑term assumptions/reference data (ETK 2026 long‑term projections and Statistics Finland population projection 2024).
- **Justification**: 2025 is the latest year with comprehensive observed data; a 70‑year horizon is sufficient to show long‑term pension‑system dynamics.
- **Source**: Various observed sources (see `data/sources.json`).

## 12. Data Transformations (Associated with Assumptions)

The following transformations are applied to source data and are documented here to ensure transparency:

- Death counts → death rates (probability) by dividing by the population from Statistics Finland Table 11re for the same year, age, sex.
- Monthly earnings → annual earnings (×12) using Statistics Finland Table 14uw.
- Aggregate over areas → national total (sum over all regions) for population and migration.
- Net migration = immigration − emigration (from Statistics Finland Table 11a7).
- If historical net‑migration profile is noisy, apply smoothing (e.g., 3‑year moving average) before computing age/sex proportions; document the exact method in model code.
- All transformations are recorded in `data/sources.json` and the model specification (`docs/MODEL.md`).

## 13. Sources of Assumptions

- Statistics Finland open statistical data: CC BY 4.0 (https://www.stat.fi/tup/kasutajaoiked_en.html)
- Finnish Centre for Pensions (ETK) statistical database: CC BY 4.0 (as confirmed by the user)
- ETK API usage and changes guidance: https://stat.fi/fi/palvelut/tilastodatapalvelut/avoin-data-ja-rajapinnat/tietokantojen-rajapintakaytto/api-kyselyjen-muutosohje

---
*This document captures all assumptions that are not directly observed. It will be kept in sync with the model specification (`docs/MODEL.md`) and the code. No simulation engine, UI, or placeholder data has been created; this is documentation only.*