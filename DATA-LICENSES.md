# Data licences

| Dataset | Provider | Licence | Source | Notes |
|---|---|---|---|---|
| Population by age and sex | Statistics Finland | CC BY 4.0 | Table 11re | Use whole country, sex, single-year age. |
| Age-specific fertility rates | Statistics Finland | CC BY 4.0 | Table 12ds | Use age-group fertility rather than inventing single-year fertility. |
| Deaths by age and sex | Statistics Finland | CC BY 4.0 | Table 12ag | Also document Statistics Finland population projection mortality/life-expectancy material as the reference for future mortality. |
| Immigration and emigration by age | Statistics Finland | CC BY 4.0 | Table 11a7 | Use age/sex migration structure rather than uniform migration. |
| Employed persons by sex and age | Statistics Finland | CC BY 4.0 | Table 13aw | Provides age groups, not single-year age employment rates. Document this limitation explicitly. |
| Average monthly earnings | Statistics Finland | CC BY 4.0 | Table 14uw | Keep average earnings separate from total insured wage sum. |
| Gross domestic product | Statistics Finland | CC BY 4.0 | Table 15a9 | Document current-price and volume/real series separately. 2025 is preliminary where marked by Statistics Finland. |
| Total expenditure on pensions | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK statistical database | For the core earnings-related pension model, keep earnings-related expenditure separate from total Finnish pension expenditure. |
| Pension recipient counts | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK pension recipient statistical database | Use recipient counts by age/benefit where available. Do NOT define all people above retirement age as pensioners if better ETK data are available. |
| Average pension of earnings-related pension recipients | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK statistical database | Use age/benefit information where useful for calibration. Do NOT use a generic 40-years × accrual-rate × average-wage formula as the primary base-year pension model. |
| Pension assets | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK time-series database | Use the actual pension assets and premium income series for calibration. Keep PAYG/funded-system simplifications explicitly documented. |
| Premium income (contributions) | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK time-series database |  |
| Historical investment return on pension assets | Finnish Centre for Pensions (ETK) | CC BY 4.0 | ETK time-series database | For the baseline long-term assumption, document ETK 2026 long-term projection assumptions: 3.18% real return annually in 2026-2035 and 3.75% from 2036 onward. These are baseline/reference assumptions, not immutable model truth. |

## Attribution requirements

Statistics Finland: Must attribute "Source: Statistics Finland" when using the data.

Finnish Centre for Pensions (Eläketurvakeskus / ETK): Must attribute "Finnish Centre for Pensions (Eläketurvakeskus / ETK)" as the source.

## Data transformations

Any transformations applied to the source data (e.g., computing death rates from death counts and population, converting monthly earnings to annual, aggregating over areas, computing net migration) must be documented in the metadata (data/sources.json) and in the model specification (docs/MODEL.md).

The licences above apply to the raw data as provided by the sources. Derived data produced by the simulator does not inherit these licences but should still respect attribution requirements where applicable.