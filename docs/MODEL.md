# Simulation Model

**MODEL_VERSION**: 0.2.0
**Base Year**: 2025
**Simulation Horizon**: 2025–2095 (70 years)

## 1. Purpose

This document describes the mathematical and conceptual model used by the pension-system simulator.

The model is intentionally simplified.

Its purpose is to illustrate relationships between:

* demographics
* employment
* wages
* pension contributions
* pension expenditure
* pension assets
* economic growth

It is not intended to reproduce an official actuarial model.

---

# 2. Model structure

The model operates annually.

For each year:

```text
Demography
    ↓
Working-age population
    ↓
Employment
    ↓
Wage bill
    ↓
Contributions
    ↓
Pension expenditure
    ↓
Net pension cash flow
    ↓
Pension assets
```

---

# 3. Population

The preferred demographic representation is an age-based population vector.

```
population[t, age]
```

where:
- `t` = simulation year (2025, 2026, ..., 2095)
- `age` = 0 to 100+ years (single-year age groups)

## 3.1 Annual population update

For each simulation year `t = 2025 + 1, 2025 + 2, ..., 2095`:

```
population[t, 0] = births[t]

population[t, age] = 
    population[t-1, age-1] 
    × (1 - mortalityRate[t-1, age-1])
    + netMigration[t, age]           for age = 1 to 100

population[t, age>100] = 
    population[t-1, age-1] 
    × (1 - mortalityRate[t-1, age-1])
    (aggregated as 100+ group)
```

**Data source**: Statistics Finland population statistics (observed 1972–2025)

**2025 baseline**: Total population = 5,652,881 persons

---

# 4. Births

Births are calculated from age-specific fertility rates applied to the female population.

```
births[t] = Σ(females[t, age] × fertilityRate[t, age])
            for age = 15 to 49
```

Where:
- `females[t, age]` = female population at age in year t
- `fertilityRate[t, age]` = fertility rate for age group (births per woman per year)
- Default `fertilityRate[t, age]` = observed 2025 rates, scaled to match the
  total fertility rate given by the `fertilityRate` parameter

**Notes**:
- The model assumes sex ratio at birth ≈ 1.05 males per female.
- Fertility rates are sourced from Statistics Finland fertility data (ages 15–49).
- User parameter: `fertilityRate` (total fertility rate in children per woman,
  range 0.5–2.5, default 1.31 = observed 2025)
- The parameter is an absolute TFR, not a multiplier. The engine scales the
  observed age-specific profile so that its sum equals the parameter value.

**Data source**: Statistics Finland fertility rates (THL birth data)

---

# 5. Mortality

Mortality is represented as age-specific mortality rates applied to each age cohort.

```
deaths[t, age] = 
    population[t, age] 
    × mortalityRate[t, age]

survivors[t+1, age+1] =
    population[t, age]
    - deaths[t, age]
```

Where:
- `mortalityRate[t, age]` = probability of death at age in year t
- Rates are sourced from Statistics Finland mortality tables (observed 1972–2025)
- Default: mortality rates held constant at 2025 values (simplification for v0.1)

**Notes**:
- The model does NOT assume a fixed percentage dies each year; rates are age-specific.
- Improvements to mortality (decreasing rates over time) are not modeled in v0.1.
- A future version may include mortality improvements or scenario-based mortality changes.

**Data source**: Statistics Finland mortality tables by age and sex (combined for this model)

---

# 6. Net Migration

Net migration is an exogenous input (does not depend on other model variables).

```
netMigration[t, age] = 
    migrationProfile[age] 
    × migrationLevel[t]
```

Where:
- `migrationProfile[age]` = age distribution of net migration (normalized to sum to 1)
- `migrationLevel` = total net migration level (persons per year)
- User parameter: `migrationLevel` (range -10,000 to +50,000, default observed 2025 = 31,233)

**Notes**:
- The profile is normalized, then scaled by `migrationLevel`, so the parameter
  directly controls the total annual net migration while the profile controls
  the age pattern.
- Negative `migrationLevel` represents net emigration.
- **Labour-market treatment**: migrants are treated identically to the rest of
  the population. They face the same `employmentRate` and earn the same
  `avgWage` as everyone else from their first year. The model therefore assumes
  immediate full labour-market integration. This is a documented simplification
  (see `docs/ASSUMPTIONS.md` §4 and §28.1) and does not yet satisfy
  `docs/SPEC.md` §7.6, which requires the employment effect to be mediated
  rather than treating every migrant as immediately employed.

**Data source**: Statistics Finland international migration data (2015–2025)

---

# 7. Working-age population

The working-age population is derived from the age distribution.

```
workingAgePopulation[t] = 
    Σ population[t, age]
    for age = 15 to retirementAge - 1
```

Where:
- `retirementAge` = user-adjustable parameter (default 63, range 60–75)
- The minimum age (15) represents the minimum legal working age
- Population aged `retirementAge` and above is NOT included in working-age population

**2025 baseline**: Population age 15–62 (retirementAge=63) = 3,355,140 persons

---

# 8. Employment

The number of employed persons is calculated from the working-age population and employment rate.

```
employed[t] = 
    workingAgePopulation[t] 
    × employmentRate[t]
```

Where:
- `employmentRate[t]` = ratio of employed to working-age population (0.0–1.0)
- User parameter: `employmentRate` (default observed 2025 value = 0.713, range 0.50–0.90)

**Notes**:
- The model uses an aggregate employment rate; does not distinguish by occupation or skill.
- Age-specific employment data is available from Statistics Finland but used for validation only.
- Unemployment is implicit in the employment rate.
- The 0.713 rate is derived as employed persons aged 15–62 divided by the
  population aged 15–62, consistent with §7.

**2025 baseline**: Total employed (15–62) = 2,392,600 persons (employmentRate = 0.713)

**Data source**: Statistics Finland employment statistics (ages 15–74)

---

# 9. Average earnings

Average earnings evolve according to a wage-growth rate.

```
averageWage[t] = 
    averageWage[t-1] 
    × (1 + wageGrowth[t])
```

Where:
- `wageGrowth[t]` = wage growth rate in year t (e.g., 0.02 = 2% growth)
- User parameter: `wageGrowth` (default 0.0 to 0.02, range -0.02 to +0.05)
- Unit: real euros per employee per year (constant 2025 prices)

**Notes**:
- Wage growth is applied uniformly to all employed persons (simplification).
- Productivity growth is represented indirectly through wage growth.
- Deflation of nominal wages to real wages uses implicit deflator (see § 20).

**2025 baseline**: Average wage = 50,232 euros per year (provisional)

**Data source**: Statistics Finland earnings statistics; ETK wage data

---

# 10. Wage bill

The aggregate wage bill is the sum of all wages paid.

```
wageBill[t] = 
    employed[t] 
    × averageWage[t]
```

This is one of the main drivers of pension contribution revenue.

**2025 baseline**: Wage bill = 120,185 million EUR (120.2 billion)

---

# 11. Pension contributions

Contribution revenue is the pension contribution rate applied to the wage bill.

```
contributions[t] = 
    wageBill[t] 
    × contributionRate[t]
```

Where:
- `contributionRate[t]` = statutory pension contribution rate (0.0–0.30)
- User parameter: `contributionRate` (default 0.244 = 24.4%, range 0.15–0.30)
- Unit: euros

**Notes**:
- The contribution rate represents both employer and employee contributions.
- The default 24.4% reflects the 2025 Finnish statutory rate.
- User input is as a percentage (e.g., 24.4) which is converted to fraction (0.244) internally.

**2025 baseline**: Contribution revenue = 29,325 million EUR (simplified model)

**Data source**: ETK contribution statistics; Finnish pension system law

---

# 12. Pensioners

The simplest definition (used in v0.1) is:

```
pensioners[t] = 
    Σ population[t, age]
    for age ≥ retirementAge
```

This is intentionally simplified.

**Notes**:
- This model treats all persons above retirement age as pension recipients.
- Actual pension receipt patterns are more complex (e.g., some continue working, others receive other benefits).
- The discrepancy is noted in documentation and accepted as a model limitation.
- A detailed pension-stock model may be introduced in future versions.

**2025 baseline**: Pensioners (age ≥ 63) = 1,490,011 persons

---

# 13. Pension expenditure

Pension expenditure is calculated as the product of pensioner count and average pension.

```
pensionExpenditure[t] = 
    pensioners[t] 
    × averagePension[t]
```

Where:
- `pensioners[t]` = number of pension recipients (estimated as population ≥ retirementAge)
- `averagePension[t]` = mean pension per recipient per year
- Unit: euros per year

The average pension evolves according to pension indexation rules (see § 14).

**2025 baseline**: Pension expenditure = 34,169 million EUR per year (simplified model)

**Data source**: ETK pension statistics; official pension expenditure data

---

# 14. Pension indexation and growth

Pensions are indexed annually by a single indexation rate.

```
averagePension[t] = 
    averagePension[t-1] 
    × (1 + pensionIndexation[t])
```

Where:
- `pensionIndexation[t]` = annual rate at which the average pension grows
- User parameter: `pensionIndexation` (default 0.02 = 2%, range -0.02 to +0.05)

**Notes**:
- The Finnish pension index is in reality a weighted formula (wage and price
  components). For v0.1 this is simplified to a single annual rate, documented
  as a limitation (§28.1).
- Because wages grow at `wageGrowth` and pensions at `pensionIndexation`, the
  replacement rate changes over time whenever the two rates differ.
- The default 0.02 reflects the approximate level of the Finnish pension index.

**Default formula (v0.1)**: 
```
averagePension[t] = averagePension[t-1] × (1 + pensionIndexation[t])
```

---

# 15. Pension assets

Pension assets evolve based on contributions, expenditure, and investment returns.

```
assets[t] = 
    assets[t-1] 
    + contributions[t] 
    + investmentIncome[t]
    - pensionExpenditure[t]

investmentIncome[t] = 
    assets[t-1] 
    × investmentReturn[t]
```

Where:
- `investmentReturn[t]` = real investment return rate (e.g., 0.03 = 3% annual return)
- User parameter: `investmentReturn` (default 0.03, range 0.0–0.10)
- Unit: euros

**Notes**:
- Investment returns are a major source of pension system income.
- The model uses a simplified cash-flow representation.
- Actual Finnish pension assets are managed by multiple pension providers (ETK, employment pension funds).
- The model aggregates these into a single pension asset pool.

**2025 baseline**: Pension assets ≈ 290,108 million EUR

**Data source**: ETK pension asset statistics

---

# 16. GDP

GDP is exogenously specified for the model (not derived from employment).

```
GDP[t] = 
    GDP[t-1] 
    × (1 + gdpGrowth[t])
```

Where:
- `gdpGrowth[t]` = nominal GDP growth rate per year
- User parameter: `gdpGrowth` (default 0.02, range -0.02 to +0.05)
- Unit: euros (aggregated, nominal or real depending on scenario)

**Notes**:
- GDP could alternatively be calculated as `employed[t] × producti­vity[t]`, but this version uses exogenous specification for simplicity.
- GDP growth is decoupled from employment and wage growth in the user interface.
- This allows independent scenario testing (e.g., stagnant employment, strong GDP growth).

**2025 baseline**: GDP ≈ 281,783 million EUR (provisional)

**Data source**: Statistics Finland national accounts; IMF projections

---

# 17. Derived metrics

The model calculates several key indicators from the core variables

### 17.1 Pension expenditure to GDP ratio

```
pensionExpenditureToGDP[t] = 
    pensionExpenditure[t] / GDP[t]
```

This metric indicates the fiscal burden of pensions relative to economic output.

**Interpretation**: A ratio of 0.12–0.15 is typical for developed economies; values above 0.20 suggest significant fiscal pressure.

### 17.2 Pensioner-to-worker ratio

```
pensionerWorkerRatio[t] = 
    pensioners[t] / employed[t]
```

This metric illustrates demographic pressure on the employed population supporting pensions.

**Notes**:
- A ratio of 0.5 means one pensioner per two workers.
- A ratio of 0.7 means seven pensioners per ten workers.
- Rising ratios indicate ageing population and pressure on contribution rates.
- This is a simplified demographic indicator; not identical to official financing ratios.

### 17.3 Replacement rate

```
replacementRate[t] = 
    averagePension[t] / averageWage[t]
```

This metric indicates the relationship between average pension and average wage.

**Interpretation**: 
- A replacement rate of 0.55 means the average pension is 55% of the average wage.
- Replacement rates above 0.70 suggest higher pension benefits; below 0.40 suggest leaner benefits.

**Caution**: This is a simplified measure; official replacement rates use more complex cohort-specific calculations.

---

# 18. Units and real vs. nominal values

### 18.1 Units

| Variable | Unit | Notes |
|----------|------|-------|
| population, employed, pensioners | persons | Age counts; integers |
| wages, average pension, GDP, assets | millions EUR | Real 2025 EUR (constant prices) |
| wage bill, contributions, expenditure | millions EUR | Nominal 2025 EUR |
| rates (fertility, mortality, employment) | decimal fraction | 0.0–1.0 (e.g., 0.72 = 72%) |
| growth rates | decimal | 0.02 = 2% annual growth |
| pension indexation, investment return | decimal | -0.02 to +0.10 range |

### 18.2 Real vs. nominal

**Preferred approach (v0.1)**:
- All calculations performed in **real 2025 EUR** (constant prices).
- This allows meaningful comparisons across the 70-year horizon without inflation distortion.
- Wage growth and GDP growth rates are specified as real rates (inflation-adjusted).

**IF nominal display is needed**:
- Apply a constant or scenario-specific inflation rate to convert real to nominal values.
- Document the implicit deflator used.

**Deflation approach**:
```
nominal[t] = real[t] × (1 + inflationRate)^(t - 2025)
```

---

# 19. Model scope and limitations

### v0.1 Simplifications

1. **Single aggregate employment rate**: No occupational or sectoral distinction.
2. **Uniform wage growth**: All workers receive same wage growth (no skill differentials).
3. **Fixed mortality rates**: Mortality does not improve or worsen over time.
4. **Simplified pension definition**: Pensioners = population ≥ retirement age (not accounting for early/late retirement patterns).
5. **No behavioral responses**: Employment and consumption do not respond to policy changes.
6. **Aggregate pension assets**: All pension providers (ETK, employment funds) represented as single pool.
7. **Exogenous GDP**: GDP is not derived from employment × productivity (could be added later).

### Known limitations to document

- No modeling of disability pensions or survivor benefits (beyond aggregate averages)
- No labor force participation before age 15 or after official retirement
- No account for self-employed persons (separately from employees)
- No three-pillar pension detail (only aggregate public and occupational)
- Investment return volatility not modeled (constant rate only)

### Future extensions

- Detailed pension accrual accounting (by cohort, earnings history)
- Behavioral sub-models (labor supply response to retirement age, contributions)
- Sectoral disaggregation (public, private, self-employed)
- Multi-scenario mortality improvements
- Endogenous GDP (output per worker)
- Inflation and nominal accounting

---

# 20. Baseline scenario and calibration

### 20.1 Base-year targets (2025)

The baseline scenario is calibrated to match observed 2025 values, expressed on
the model's own definitions (see §7, §8, §12). Values marked "derived" are
computed from source data rather than taken directly from an official total.

| Metric | 2025 Baseline | Source |
|--------|---------------|--------|
| Total population | 5,652,881 | Statistics Finland |
| Working-age (15–62) | 3,355,140 | Derived from age distribution |
| Employed (15–62) | 2,392,600 | Statistics Finland (derived on model age range) |
| Employment rate (15–62) | 0.713 | Derived (employed / working-age) |
| Average wage | 50,232 EUR/year | Statistics Finland earnings data |
| Wage bill | 120,185 million EUR | Derived (employed × avg wage) |
| Contribution revenue | 29,325 million EUR | Derived (wage bill × 24.4%) |
| Pensioners (age 63+) | 1,490,011 | Derived from age distribution |
| Average pension | 1,911 EUR/month (22,932 EUR/year) | ETK average pension |
| Pension expenditure | 34,169 million EUR | Derived (pensioners × avg pension) |
| Pension assets | 290,108 million EUR | ETK asset statistics |
| GDP | 281,783 million EUR | Statistics Finland national accounts |

**Note on official totals**: Official ETK figures for total pension expenditure
(37,225 million EUR) and premium income (33,571 million EUR) differ from the
simplified model values above. The official figures include disability and
survivor pensions and non-wage income, which the simplified model does not
represent. This difference is a documented limitation (§28.1), not a calibration
error.

### 20.2 Default parameters

| Parameter | Default | Range | Unit |
|-----------|---------|-------|------|
| Retirement Age | 63 | 60–75 | years |
| Contribution Rate | 24.4% | 15%–30% | percent |
| Employment Rate | 0.713 | 0.50–0.90 | fraction |
| Wage Growth | 0.02 | -0.02–0.05 | annual rate |
| GDP Growth | 0.02 | -0.02–0.05 | annual rate |
| Investment Return | 0.03 | 0.0–0.10 | annual rate |
| Fertility Rate | 1.31 | 0.5–2.5 | children/woman |
| Migration Level | 31,233 | -10,000–+50,000 | persons/year |
| Pension Indexation | 0.02 | -0.02–0.05 | annual rate |

### 20.3 Calibration tolerance

Each baseline metric is allowed ±2% variance from observed 2025 values when the simulation is initialized with default parameters. Larger discrepancies indicate model errors requiring investigation.

If assets become negative, the model should represent this explicitly rather than silently clamping the value to zero.

---

# 22. Scenario isolation

Each parameter is independent within the model.

Changing one parameter **must NOT** silently change another.

| Change | Must NOT affect |
|--------|-----------------|
| Retirement age | Investment returns, GDP growth, fertility |
| Wage growth | Contribution rates, employment rates |
| GDP growth | Pension expenditure formula |
| Contribution rate | Employment, wage levels |

---

# 23. Parameter validation and boundary conditions

The model must safely handle extreme parameter values.

| Parameter | Min | Max | Validation |
|-----------|-----|-----|------------|
| Retirement age | 60 | 75 | If > max working-age pop, warn |
| Contribution rate | 0.15 | 0.30 | Must be positive fraction |
| Employment rate | 0.50 | 0.90 | Must be 0.0–1.0 |
| Wage growth | -0.02 | 0.05 | Allow negative (wage decline) |
| GDP growth | -0.02 | 0.05 | Allow negative (recession) |
| Investment return | 0.00 | 0.10 | Non-negative; 0.0 means no return |
| Fertility rate | 0.5 | 2.5 | Total fertility rate (children/woman) |
| Migration | -10,000 | +50,000 | Allow negative (emigration) |
| Pension indexation | -0.02 | 0.05 | Annual rate; may be negative |

---

# 24. Numerical stability requirements

Every simulation year `t`, the model must validate:

```
population[t, age] ≥ 0           for all age groups
employed[t] > 0                  must have at least some employment
pensioners[t] ≥ 0                
GDP[t] > 0                       must be positive
averageWage[t] ≥ 0               
pensionAssets[t] value exists    (can be negative if liabilities exceed assets)
```

**Invalid values to prevent**:
- `NaN` (undefined): Any calculation returning NaN must be trapped and reported
- `Infinity`: Division by zero or overflow must be detected
- Negative population: Result of invalid mortality or migration
- Negative wages or pensions: Invalidates subsequent calculations

**Detection and response**:
1. Detect invalid value in any year
2. Stop simulation
3. Return error message with:
   - Variable name
   - Year when error occurred
   - Parameter values that caused error
   - Suggested parameter adjustment

**Example error**:
```
ERROR: Simulation failed in year 2067
Invalid value: pensionAssets = NaN
Cause: Asset calculation with investmentReturn = -1.5 (100%+ loss)
Suggestion: Lower investmentReturn to realistic range (0.0–0.10)
```

---

# 25. Precision and rounding

### Internal precision
- All calculations performed at machine double precision (64-bit float)
- No intermediate rounding (only final display rounding)

### Display precision
- Millions EUR: 1 decimal place (e.g., 290,108.2 million EUR)
- Persons: integers (e.g., 2,590,000)
- Rates: 2 decimal places (e.g., 1.23% = 0.0123)
- Replacement rate: 2 decimal places (e.g., 54.32%)

---

# 26. Cross-reference to supporting documentation

- **ASSUMPTIONS.md**: Detailed assumptions for each data series and parameter defaults
- **DATA.md**: Data schema, provenance, and sources
- **DATA-LICENSES.md**: Copyright and reuse terms for external datasets
- **DATA_SOURCES.md**: Full citation and download URLs for each data source
- **SPEC.md**: User interface and application specification

---

# 27. Model version and implementation

**MODEL_VERSION**: 0.2.0
**Implementation target**: JavaScript (src/model.js, src/simulation.js)
**Language for code identifiers**: English
**Language for UI display**: Finnish

## 27.1 Version history

- **0.2.0** — `fertilityRate` changed from a dimensionless multiplier on the
  observed age profile to an absolute total fertility rate (children per woman).
  Default changed from 1.0 (multiplier) to 1.31 (observed 2025 TFR). The birth
  calculation is unchanged in substance; only the parameter's meaning and unit
  changed, so existing shared scenarios using the old value will differ.
- **0.1.0** — First implementation.

---

# 28. Model limitations and evolution

## 28.1 Limitations of v0.2.0

The following limitations are expected in the first version:

* simplified demographic behaviour
* simplified labour-market behaviour
* simplified pension accrual
* simplified pensioner definition
* simplified pension financing
* simplified investment returns
* no individual-level pension histories
* no detailed taxation model
* no complete legal representation of the Finnish pension system
* **migration is treated as fully integrated into the labour market on arrival**
  (same employment rate and same average wage as the native-born population)

These limitations should be visible to users.

## 28.2 Evolution

Future versions may introduce:

* age-specific employment
* age-specific mortality improvements over time
* sex-specific demographic assumptions
* more detailed pension accrual
* separate pension schemes
* more detailed pension fund mechanics
* stochastic investment returns
* uncertainty ranges
* multiple official projection scenarios

Such changes should be documented as model-version changes rather than silently changing the meaning of existing outputs.

Key functions to implement:
- `simulateScenario(parameters, initialState, data)` → Result object with yearly arrays
- `validateParameters(params)` → Returns error messages or [] if valid
- Pure functions for each calculation step (births, deaths, employment, etc.)
- No side effects or global state within model layer

---

END OF MODEL SPECIFICATION (v0.2.0)
