# Data Sources for Tasapainota Suomen eläkejärjestelmä

This document lists the authoritative Finnish data sources used in the pension-system simulation, as verified in Phase A.

## Population
- **Provider**: Statistics Finland (Tilastokeskus)
- **Dataset/Table**: Table 11re
- **Description**: "Population according to age (1-year) and sex by area, 1972-2025"
- **Used**: Whole country, both sexes combined, single-year age (0-100+)
- **Unit**: persons
- **Frequency**: annual
- **Historical period**: 1972-2025
- **Projection period**: Not used directly; Statistics Finland population projection 2024 is a reference for future mortality/fertility assumptions.
- **Series type**: observed
- **Model use**: Initial population vector (age 0–max_age); aged each year; births added at age 0; deaths removed by age; net migration distributed by age/sex.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11re.px
- **Licence**: CC BY 4.0
- **Notes**: The table provides population by area; we aggregate over areas to get national total.

## Fertility (Age-specific)
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 12ds
- **Description**: "Age-specific fertility (5-year) rates by age of mother, 1990-2025"
- **Used**: Age-group fertility rates (e.g., 15-19, 20-24, ..., 45-49)
- **Unit**: births per woman per year (average over the 5-year age group)
- **Frequency**: annual
- **Historical period**: 1990-2025
- **Projection period**: Not used directly; reference to Statistics Finland population projection 2024 for assumptions.
- **Series type**: observed
- **Model use**: Births = sum over age groups of (number of women in age group * fertility rate for that age group). Births added to age 0.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/synty/statfin_synty_pxt_12ds.px
- **Licence**: CC BY 4.0
- **Notes**: The table provides 5-year age groups. We assume uniform distribution within the group or use the given rate as the average for the group.

## Mortality (Observed)
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 12ag
- **Description**: "Deaths by age (1-year) and sex, 1980-2025"
- **Used**: Whole country, both sexes combined, single-year age (0-100+)
- **Unit**: deaths (count)
- **Frequency**: annual
- **Historical period**: 1980-2025
- **Projection period**: Not used directly; reference to ETK 2026 long-term projection assumptions for future mortality.
- **Series type**: observed
- **Model use**: Deaths = population[age, year, sex] * (deaths count / population) -> we compute death rates (probability of death) from the data.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/kuol/statfin_kuol_pxt_12ag.px
- **Licence**: CC BY 4.0
- **Notes**: We convert death counts to death rates (probability) by dividing by the population from table 11re for the same year, age, sex.

## Mortality (Projection Reference)
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: ETK 2026 long-term projections
- **Description**: Used as baseline reference for future mortality trends (life expectancy). Not copied into the simulator; only used to document assumptions.
- **Series type**: official projection (reference)
- **Model use**: Informs the assumption for future mortality rates (baseline uses ETK 2026 long-term projection assumptions). For the baseline, we use the ETK 2026 long-term projection assumptions for mortality rates from 2026 onward, or we may hold rates constant at the last observed year if alternative scenario chosen.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/
- **Licence**: To be confirmed (see DATA-LICENSES.md)
- **Notes**: We do not use the projection data directly in the model; we only reference it for documentation. The baseline assumption for future mortality is taken from ETK 2026 long-term projections.

## Migration (Net Migration by Age/Sex)
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 11a7
- **Description**: "Immigration and emigration by age (5-year), sex and area, 1990-2025"
- **Used**: Whole country, both sexes combined, 5-year age groups (0-4, 5-9, ..., 80-84, 85+)
- **Unit**: persons (net: immigration - emigration)
- **Frequency**: annual
- **Historical period**: 1990-2025
- **Projection period**: Not used directly; reference to same source for assumptions.
- **Series type**: observed
- **Model use**: Net migration distributed by age/sex using the observed age/sex structure from table 11a7. We compute the proportion of net migration in each age/sex group and apply the total net migration assumption (which may be scenario-based) to those proportions. We do NOT assume all migrants are a single age or that migration is uniformly distributed across ages. If the historical net-migration profile is noisy, we will document the smoothing/normalization method explicitly.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/muutto/statfin_muutto_pxt_11a7.px
- **Licence**: CC BY 4.0
- **Notes**: The table gives immigration and emigration separately; we compute net migration = immigration - emigration for each age/sex/area, then aggregate over area.

## Employment (Age/Sex)
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 13aw
- **Description**: "Employed persons and employees in part-time or full-time work by sex and age, 2009-2025"
- **Used**: Whole country, both sexes combined, age groups (e.g., 15-19, 20-24, ..., 65-74, 75+)
- **Unit**: persons (employed)
- **Frequency**: annual
- **Historical period**: 2009-2025
- **Projection period**: Not used directly; assumption for future employment rates.
- **Series type**: observed
- **Model use**: Employed[age group] = value from table. For single-year age, we assume uniform distribution within the age group or use the group rate for each single year. Limitation: age groups, not single-year age.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyovo/statfin_tyovo_pxt_13aw.px
- **Licence**: CC BY 4.0
- **Notes**: Important: this provides age groups, not single-year age employment rates. We document this limitation and do not claim single-year employment rates exist.

## Earnings (Average Monthly Earnings)
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 14uw
- **Description**: "Average monthly earnings of full-time wage and salary earners by sector, annual data"
- **Used**: Whole country, all sectors combined (or we can use total average)
- **Unit**: euros per month
- **Frequency**: annual
- **Historical period**: 1995-2025 (approx)
- **Projection period**: Not used directly; assumption for future wage growth.
- **Series type**: observed
- **Model use**: Average monthly earnings converted to annual (x12). Used as the average wage for full-time wage and salary earners. Total wage bill = sum over age groups of (employed[age group] * average annual earnings). Note: we keep average earnings separate from total insured wage sum; we use this average earnings to compute wage bill by multiplying with employed persons (from table 13aw). This assumes that the average earnings apply to all employed persons (full-time equivalent). We do not have age-specific earnings; we use the same average for all age groups.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/palk/statfin_palk_pxt_14uw.px
- **Licence**: CC BY 4.0
- **Notes**: Keep average earnings separate from total insured wage sum. We use this to compute wage bill.

## GDP
- **Provider**: Statistics Finland
- **Dataset/Table**: Table 15a9
- **Description**: "Gross domestic product and national income, supply and demand, annually, 1975-2025"
- **Used**: Whole country
- **Unit**: million euros
- **Frequency**: annual
- **Historical period**: 1975-2025
- **Projection period**: Not used directly; reference to official projections (e.g., Ministry of Finance) for assumptions.
- **Series type**: observed
- **Model use**: Used directly for GDP in pension expenditure/GDP ratio. We also have a volume/real series (chain-linked volumes, reference year 2020) for real GDP if needed.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/bkt/statfin_bkt_pxt_15a9.px
- **Licence**: CC BY 4.0
- **Notes**: Document current-price and volume/real series separately. 2025 is preliminary where marked by Statistics Finland.

## Pension Expenditure (Earnings-related)
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: ETK statistical database
- **Description**: "Total expenditure on pensions, mill. euros"
- **Used**: Earnings-related pension expenditure (separate from Kela/national pension)
- **Unit**: million euros
- **Frequency**: annual
- **Historical period**: 1980-2025 (approx)
- **Projection period**: ETK publishes long-term projections (e.g., ETK 2026 long-term projections)
- **Series type**: observed
- **Model use**: Used to calibrate average pension in base year: average_pension[base_year] = total_pension_expenditure[base_year] / pensioner_count[base_year] (where pensioner count is from ETK recipient data). Then evolved via indexation.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/ (specific table to be identified in Phase B)
- **Licence**: To be confirmed (see DATA-LICENSES.md)
- **Notes**: For the core earnings-related pension model, keep earnings-related expenditure separate from total Finnish pension expenditure.

## Pension Recipients
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: ETK pension recipient statistical database
- **Description**: Recipient counts by age/benefit where available
- **Used**: Whole country, by age and pension type (earnings-related, national, etc.)
- **Unit**: persons
- **Frequency**: annual
- **Historical period**: 1980-2025 (approx)
- **Projection period**: Not used directly; assumption for future recipient numbers.
- **Series type**: observed
- **Model use**: Used as the pensioner count (instead of population above retirement age) for more accurate calculation. We use recipient counts by age/benefit to compute total pension expenditure if we have average pension by age/benefit, or to derive average pension from total expenditure.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/
- **Licence**: To be confirmed
- **Notes**: Do NOT define all people above retirement age as pensioners if better ETK data are available.

## Average Pension (Earnings-related)
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: ETK statistical database
- **Description**: "Average pension of earnings-related pension recipients in 1981-2025"
- **Used**: By age and benefit type where available
- **Unit**: euros per month
- **Frequency**: annual
- **Historical period**: 1981-2025
- **Projection period**: Not used directly; assumption for future average pension (via indexation).
- **Series type**: observed
- **Model use**: Used for calibration and to derive indexation rules. We do NOT use a generic 40-years × accrual-rate × average-wage formula as the primary base-year pension model.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/
- **Licence**: To be confirmed
- **Notes**: Use age/benefit information where useful for calibration.

## Pension Assets and Premium Income
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: ETK time-series database
- **Description**: Actual pension assets and premium income (contributions) series
- **Used**: Whole earnings-related pension system
- **Unit**: million euros
- **Frequency**: annual
- **Historical period**: 1980-2025 (approx)
- **Projection period**: ETK publishes long-term projections for assets and contributions.
- **Series type**: observed
- **Model use**: Initial condition for pension assets; evolved each year: assets[t] = assets[t-1] + assets[t-1]*investment_return[t] + contributions[t] - pension_expenditure[t]. Premium income (contributions) used to validate contribution revenue model.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/
- **Licence**: To be confirmed
- **Notes**: Keep PAYG/funded-system simplifications explicitly documented.

## Investment Return
- **Provider**: Finnish Centre for Pensions (ETK)
- **Dataset**: historical return data from ETK
- **Description**: Historical investment return on pension assets
- **Used**: Whole pension assets
- **Unit**: percent (real)
- **Frequency**: annual
- **Historical period**: 1996-2025 (approx)
- **Projection period**: For the baseline long-term assumption, document ETK 2026 long-term projection assumptions: 3.18% real return annually in 2026-2035 and 3.75% from 2036 onward.
- **Series type**: observed (historical), assumption (future)
- **Model use**: Investment income = pension_assets[t-1] * investment_return[t]. The baseline assumption uses the ETK 2026 long-term projection values, but these are reference assumptions, not immutable model truth.
- **Source URL**: https://www.etk.fi/tilastot-ja-tutkimukset/tilastot/
- **Licence**: To be confirmed
- **Notes**: Historical return data from ETK. The baseline long-term assumption is taken from ETK 2026 long-term projections.

## Base Year and Horizon
- **Base year**: 2025 (provisional) because the major required observed series are now available through 2025.
- **Note**: Preliminary 2025 economic data (GDP, earnings, etc.) are marked as preliminary by Statistics Finland where applicable.
- **Horizon**: 2025-2095 for the simulator target horizon (70 years), subject to the availability of documented long-term assumptions/reference data.
- **Reference**: ETK 2026 long-term projections span 70 years; Statistics Finland population projection 2024 is also a reference source.
- **Note**: Do not simply copy an official projection into the simulator; use it as a calibration/reference scenario.

## Licensing
- **Statistics Finland open statistical data**: CC BY 4.0.
- **ETK licensing**: Do not guess or generalize. Record the specific terms for the actual ETK datasets used in DATA-LICENSES.md.
- External data licences remain separate from the repository MIT licence.

## Remaining Unresolved Source/API Details
- Exact ETK API endpoints or table identifiers for pension expenditure, pension recipients, average pension, pension assets, and investment return datasets are not yet established. These are left for Phase B acquisition work.
- We do not fabricate API URLs; we mark them as unresolved.

## Model Decisions Requiring Specification before Phase C
1. **Pensioner definition**: We will use ETK pension recipient counts by age/benefit where available (more accurate) rather than population above retirement age.
2. **Wage bill calculation**: We will use average earnings from table 14uw multiplied by employed persons from table 13aw (age groups). Limitation: age groups, not single-year age; we will document this and assume uniform distribution within age groups or use group rate for each single year.
3. **GDP treatment**: We will treat GDP as exogenous from table 15a9 (observed) and use it directly for pension expenditure/GDP ratio. For future years, we will need to make an assumption (scenario) or use official projections.
4. **Migration distribution**: We will distribute net migration by age/sex using the observed age/sex structure from table 11a7 (5-year groups). We will compute proportions and apply total net migration assumption. We do NOT assume all migrants are a single age or that migration is uniformly distributed across ages. If the historical net-migration profile is noisy, we will document the smoothing/normalization method explicitly.
5. **Mortality assumption for future years**: We will use ETK 2026 long-term projection assumptions as the baseline reference for future mortality.
6. **Fertility assumption for future years**: We may hold fertility rates constant at the last observed year or use a scenario based on reference projections (to be specified).
7. **Employment rate assumption for future years**: We will need to make an assumption (scenario) for future employment rates by age group.
8. **Average earnings growth assumption**: We will need to make an assumption (scenario) for future average earnings growth.
9. **GDP growth assumption for future years**: We will need to make an assumption (scenario) for future GDP growth.
10. **Investment return assumption for future years**: Baseline uses ETK 2026 long-term projection assumptions (3.18% 2026-2035, 3.75% from 2036), but these are reference assumptions; we will make them user-adjustable scenarios.

These decisions will be specified in the model specification (docs/MODEL.md) in Phase C.

---

## Employment rate by origin (added 2026-09-21)

- **Provider**: Statistics Finland (Kototietokanta / Kotoutumisen indikaattorit)
- **Dataset/Table**: Table 117e
- **Description**: "Työllisyysaste (Rek) muuttujina Alue, Syntyperä ja taustamaa, Maassaoloaika, Ikä, Sukupuoli, Vuosi ja Tiedot", 1995-2024
- **Used**: Whole country, both sexes combined, by origin, time in country and age group
- **Unit**: percent
- **Frequency**: annual
- **Historical period**: 1995-2024
- **Series type**: observed
- **Model use**: Quantifies the employment gap between foreign-background and
  Finnish-background populations, and how employment rises with time spent in
  Finland. Used to parameterise the migrant employment factor.
- **Source URL**: https://kototietokanta.stat.fi/PXWeb/api/v1/fi/Kotoutumisenindikaattorit/tyoll/117e.px
- **Licence**: CC BY 4.0
- **Notes**: The table distinguishes "Suomalaistaustaiset ja Suomessa syntyneet
  ulkomaalaistaustaiset" from "Ulkomaille syntyneet ulkomaalaistaustaiset
  yhteensä". The latter is the relevant group for migration modelling. Time in
  country is only defined for the foreign-born group.

## Income level by origin (added 2026-09-21)

- **Provider**: Statistics Finland
- **Dataset/Table**: Table 14ya
- **Description**: "Asuntoväestön tulotaso syntyperän, iän ja tulokymmenyksen mukaan", 1995-2024
- **Used**: Whole country, by origin and age group
- **Unit**: euros (disposable income per consumption unit, mean)
- **Frequency**: annual
- **Historical period**: 1995-2024
- **Series type**: observed
- **Model use**: Approximates the wage gap between foreign-background and
  Finnish-background populations.
- **Source URL**: https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tjt/14ya.px
- **Licence**: CC BY 4.0
- **Notes**: This is **disposable income**, not wages. It is used only as a
  documented approximation of the wage gap; the two are not the same concept.

---
*This document is based on verified Phase A research using current primary sources from Statistics Finland and the Finnish Centre for Pensions (ETK). No alternative datasets were invented.*