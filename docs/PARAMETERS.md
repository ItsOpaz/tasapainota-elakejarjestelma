# User-Adjustable Parameters

This document defines the 9 user parameters in the pension-system simulation. Each parameter controls a specific aspect of the model and can be adjusted in the UI.

---

## Parameter Specifications

### 1. Retirement Age (`retirementAge`)

**Definition**: The age at which individuals transition from the working-age population to pensioners.

**Unit**: Years

**Default value**: 63

**Valid range**: 60–75

**Internal representation**: Integer

**Effects**:
- **Increases working-age population**: Higher retirement age → larger denominator for wage bill calculation
- **Decreases pensioner count**: Higher retirement age → fewer people counted as pension recipients (§12, model.js)
- **Decreases pension expenditure**: Fewer pensioners → lower expenditure, but wages may increase (workers stay longer)
- **Increases employment and wage bill**: More people remain employed longer
- **Increases tax base**: More working years per person → more contributions accumulated
- **Decreases pensioner-to-worker ratio**: Direct effect (fewer pensioners, more workers)
- **No direct effect on**: Wages, contribution rate, investment returns, GDP, fertility, migration

**Interaction effects**:
- If retirement age ≥ 75 and life expectancy is 82+, pension collection period may become very short (acceptable for scenario analysis)
- Very low retirement age (60) may deplete pension funds quickly if contribution rate unchanged

**Data source**: Finnish pension law defines 63 as baseline retirement age (2025); adjustable per scenario

---

### 2. Contribution Rate (`contributionRate`)

**Definition**: The percentage of the wage bill that is transferred to the pension system annually.

**Unit**: Percent (displayed); internal fraction (0.0–1.0)

**Default value**: 24.4% (0.244 internally)

**Valid range**: 15%–30% (0.15–0.30 internally)

**Note**: User input as "24.4" is converted to 0.244 internally

**Effects**:
- **Direct effect on contributions**: Higher rate → more revenue collected (contributions = wageBill × contributionRate)
- **Increases pension assets**: More annual inflow → larger asset pool
- **Improves system sustainability**: Higher contributions reduce long-term asset depletion
- **Reduces take-home wages** (implicit; not modeled in v0.1): In reality, employer or employee bears cost
- **No direct effect on**: Population, employment, wages, pension expenditure, GDP, fertility, migration, retirement age

**Interaction effects**:
- If contribution rate too low relative to pension expenditure, assets deplete rapidly (visible by year 2050+)
- High contribution rate (≥30%) may stress pension system but necessary in aging scenarios

**Data source**: Finnish statutory pension contribution rate (2025) ≈ 24.4% (employer + employee contributions combined; employer pays ~17.75%, employee ~7.65%)

---

### 3. Employment Rate (`employmentRate`)

**Definition**: The ratio of employed persons to working-age population (ages 15 to retirementAge-1).

**Unit**: Fraction (0.0–1.0); displayed as percentage

**Default value**: 0.713 (71.3% in 2025)

**Valid range**: 0.50–0.90 (50%–90%)

**Internal representation**: Decimal fraction

**Effects**:
- **Direct effect on employed count**: employed[t] = workingAgePopulation × employmentRate
- **Affects wage bill**: wageBill = employed × averageWage
- **Affects contributions**: Fewer employed → lower contributions
- **Affects pensioner-to-worker ratio**: Direct denominator (more employed → lower ratio)
- **No direct effect on**: Population, wages, pension expenditure, investment returns, GDP, fertility
- **Affects replacement rate indirectly**: Through wage bill and contribution capacity

**Interaction effects**:
- Low employment (0.50–0.55) combined with high retirement age may create mismatches in pension asset flows
- High unemployment in specific age groups not captured (aggregate rate assumption)
- Employment changes are exogenous (unemployment not modeled as behavioral response to policy)

**Data source**: Statistics Finland employment statistics; 2025 observed rate = 71.3% (employed persons aged 15–62 divided by population aged 15–62)

**Note**: Employment participation before age 15 and after retirement age is not included in the calculation.

---

### 4. Wage Growth (`wageGrowth`)

**Definition**: Annual rate of change in average real (constant-price) wages.

**Unit**: Annual decimal rate (e.g., 0.02 = 2% per year)

**Default value**: 0.02 (2% annual growth)

**Valid range**: -0.02 to +0.05 (-2% to +5% per year)

**Internal representation**: Decimal

**Effects**:
- **Persistent effect across all years**: averageWage[t] = averageWage[t-1] × (1 + wageGrowth)
- **Affects wage bill directly**: wageBill = employed × averageWage
- **Affects contribution revenue**: Higher wages → more contributions
- **Affects replacement rate**: If pension indexation = wage growth, replacement rate stays constant; if different, diverges
- **Affects GDP relationship**: Wage growth is independent of GDP growth in this model (decoupled)
- **No direct effect on**: Employment rates, population, fertility, migration, contribution rates

**Interaction effects**:
- High wage growth with low employment may still generate sufficient contributions
- Negative wage growth (-0.02) represents wage decline/deflation; possible but rare scenario
- Wage growth interacts with pension indexation rule (§14, MODEL.md)

**Data source**: Statistics Finland wage statistics; long-term average ≈ 1.5–2.0% real (inflation-adjusted); default 2%

---

### 5. GDP Growth (`gdpGrowth`)

**Definition**: Annual rate of change in gross domestic product (nominal or real, depending on scenario).

**Unit**: Annual decimal rate (e.g., 0.02 = 2% per year)

**Default value**: 0.02 (2% annual growth)

**Valid range**: -0.02 to +0.05 (-2% to +5% per year)

**Internal representation**: Decimal

**Effects**:
- **Direct effect on GDP**: GDP[t] = GDP[t-1] × (1 + gdpGrowth)
- **Affects pension expenditure-to-GDP ratio**: As GDP grows, burden (pensionExpenditure / GDP) can stabilize or decline
- **Used for scenario analysis**: 
  - High growth (0.04–0.05) → Economic optimism scenario
  - Low growth (0.00–0.01) → Stagnation scenario
  - Negative growth (< 0.00) → Recession scenario
- **No direct effect on**: Employment, wages, contributions, pension expenditure, population, fertility

**Interaction effects**:
- GDP growth is decoupled from wage growth (deliberate design for scenario flexibility)
- If wage growth >> GDP growth, wage share of GDP increases (unsustainable long-term)
- If wage growth << GDP growth, capital income increases relative to labor

**Rationale for independence**: In real economies, GDP and wages can decouple; by keeping them separate, users can explore productivity scenarios (high GDP, flat wages) and distribution scenarios (high wages, flat GDP).

**Data source**: Statistics Finland national accounts, IMF projections; 2025 forecast ≈ 1.5–2.5% real; default 2%

---

### 6. Investment Return (`investmentReturn`)

**Definition**: Annual real rate of return on pension assets (constant rate, not stochastic in v0.1).

**Unit**: Annual decimal rate (e.g., 0.03 = 3% per year)

**Default value**: 0.03 (3% annual return)

**Valid range**: 0.0–0.10 (0%–10% per year)

**Internal representation**: Decimal

**Effects**:
- **Direct effect on asset growth**: investmentIncome[t] = assets[t-1] × investmentReturn
- **Critical for long-term asset sustainability**: investmentIncome is major cash inflow
- **Calculation**: assets[t] = assets[t-1] + contributions[t] + investmentIncome[t] - pensionExpenditure[t]
- **Effects on asset depletion risk**:
  - High return (0.08–0.10) → Assets remain healthy even with moderate contributions
  - Low return (0.00–0.01) → Assets may deplete if contributions don't cover expenditure
  - Zero return (0.0) → Assets depend solely on annual cash flow (contributions − expenditure)
- **No direct effect on**: Employment, wages, contribution rates, GDP, population, fertility

**Rationale for constant rate**: Real-world investment returns vary yearly (stochastic); v0.1 uses constant rate for simplicity and clarity. Users can run scenarios: pessimistic (2%), realistic (3%), optimistic (4%).

**Data source**: ETK (Eläketurvakeskus) investment return statistics; 10-year average ≈ 2.5–3.5% real; default 3%

**Limitation**: No modeling of return volatility, asset allocation, or market cycles. Future versions may include stochastic returns.

---

### 7. Fertility Rate (`fertilityRate`)

**Definition**: Total fertility rate — the average number of children a woman would have over her lifetime at current age-specific rates.

**Unit**: Children per woman

**Default value**: 1.31 (observed 2025 total fertility rate)

**Valid range**: 0.5–2.5 (children per woman)

**Internal representation**: Decimal

**Note**: This is an absolute rate, not a multiplier. Internally the engine scales
the observed 2025 age-specific fertility profile so that its sum equals this
value. Replacement-level fertility is about 2.1 children per woman.

**Effects**:
- **Direct effect on births**: births[t] = Σ(femalePopulation × scaledRate[age])
- **Affects population growth**: Higher fertility → more births → larger future population
- **Affects working-age population**: Directly inflates future employed population (15–20 years later)
- **Long-term effects on pensioner-to-worker ratio**: High fertility reduces aging pressure
- **Effects on wage bill and contributions**: More future workers → higher wage bill
- **No direct effect on**: Employment rates, wages, contribution rates, investment returns, retirement age

**Interaction effects**:
- Fertility changes affect population only after 15+ year lag (cohort needs to reach working age)
- Very low fertility (0.5) accelerates aging; combined with high retirement age may create acute worker shortage
- High fertility (2.5) slows aging but increases education and public spending demands (not modeled)

**Scenario examples**:
- Finland 2025 (observed): 1.31 children per woman (default)
- 0.5 → very low; severe population decline in the long run
- 2.1 → approximately replacement level; long-run population stabilisation
- 2.5 → high fertility; population growth

**Data source**: Statistics Finland age-specific fertility rates (table 12ds); the default is the sum of the observed 2025 age-specific rates

---

### 8. Migration Level (`migrationLevel`)

**Definition**: Annual net migration (absolute number of persons added to population annually).

**Unit**: Persons per year; can be positive (immigration) or negative (emigration)

**Default value**: 31,233 (observed 2025 net migration)

**Valid range**: -10,000 to +50,000 persons per year

**Internal representation**: Integer

**Effects**:
- **Direct effect on population size**: net migration is added to the age distribution each year
- **Affects total population**: More migration → larger population
- **Affects working-age population**: Migration profile (by age) determines distribution
- **Affects wage bill**: More working-age migrants → higher employment and wages
- **Affects pension burden**: Depends on age profile (younger migrants ease burden, older migrants increase it)
- **No direct effect on**: Employment rates, wages, contribution rates, fertility, investment returns

**Interaction effects**:
- Migration follows the observed 2025 age profile (skewed toward young adults)
- Large negative migration (emigration) can partially offset natural population aging
- Migration provides flexibility to adjust population without fertility or mortality changes
- **Assumption not yet modelled**: migrants are currently assumed to be employed
  at the same rate and to earn the same average wage as the native-born
  population from their first year. This overstates the contribution base
  migration generates. See `docs/ASSUMPTIONS.md` §4.

**Scenario examples**:
- Finnish observed net migration (2025) = +31,233 persons/year (default)
- +50,000/year scenario → faster population growth, eases aging pressure
- -10,000/year scenario → population decline, increases pensioner pressure

**Data source**: Statistics Finland international migration statistics; 2025 net migration = +31,233 persons

---

### 9. Pension Indexation (`pensionIndexation`)

**Definition**: Annual rate at which the average pension grows.

**Unit**: Annual decimal rate (e.g., 0.02 = 2% per year)

**Default value**: 0.02 (2% annual indexation)

**Valid range**: -0.02 to +0.05 (-2% to +5% per year)

**Internal representation**: Decimal

**Note**: v0.1 uses a single annual indexation rate. Future versions may allow a
weighted combination of wage and price indices.

**Effects**:
- **Direct effect on average pension**: averagePension[t] = averagePension[t-1] × (1 + pensionIndexation)
- **Affects pension expenditure**: As pensions grow, expenditure increases proportionally
- **Affects replacement rate**:
  - If indexation = wage growth: replacement rate stays constant
  - If indexation > wage growth: replacement rate rises (pensioners' living standard improves)
  - If indexation < wage growth: replacement rate falls (pensioners fall behind workers)
- **Affects sustainability**: High indexation rates strain pension assets
- **No direct effect on**: Employment, wages, contribution rates, investment returns, population

**Finnish policy context**:
- The official Finnish pension index is a weighted combination of wage and price indices (approximately 80% wage + 20% price).
- v0.1 simplifies this to a single annual rate; this is a documented limitation.

**Interaction effects**:
- If indexation < wage growth and retirement age increases, pensioners may have lower living standards than under baseline
- If contribution rate falls and indexation rises, pension assets at risk

**Data source**: Finnish pension law (Eläkelaki); ETK pension indexation rules

---

## Summary Table

| Parameter | Default | Min | Max | Unit | Direct Effects |
|-----------|---------|-----|-----|------|----------------|
| Retirement Age | 63 | 60 | 75 | years | Employed, pensioners, expenditure, ratio |
| Contribution Rate | 24.4% | 15% | 30% | % | Contributions, assets, revenue |
| Employment Rate | 71.3% | 50% | 90% | % | Employed, wage bill, ratio |
| Wage Growth | 2.0% | -2% | 5% | %/year | Wages, wage bill, contributions, replacement |
| GDP Growth | 2.0% | -2% | 5% | %/year | GDP, pension/GDP ratio |
| Investment Return | 3.0% | 0% | 10% | %/year | Assets, investment income |
| Fertility Rate | 1.31 | 0.5 | 2.5 | children/woman | Future population, workers (delayed) |
| Migration Level | 31,233 | -10k | +50k | persons/yr | Population size, age distribution |
| Pension Indexation | 2.0% | -2% | 5% | %/year | Average pension, expenditure, replacement |

---

## Implementation Notes

### Parameter Validation (src/app.js)

Before running simulation, validate all parameters:

```js
const errors = validateParameters({
  retirementAge: 63,
  contributionRate: 0.244,
  employmentRate: 0.713,
  wageGrowth: 0.02,
  gdpGrowth: 0.02,
  investmentReturn: 0.03,
  fertilityRate: 1.31,
  migrationLevel: 31233,
  pensionIndexation: 0.02
});

if (errors.length > 0) {
  console.error("Invalid parameters:", errors);
  return; // Do not run simulation
}
```

### UI Representation

Each parameter should have:
- **Label** (Finnish)
- **Slider** (min–max) with visual feedback
- **Numeric input** (allow direct entry)
- **Unit label** (EUR, %, years, etc.)
- **Default button** (reset to baseline)
- **Help text** (1–2 sentences explaining effect)

### URL Encoding

Parameters are encoded in URL as query string:

```
?retirementAge=65&contributionRate=25&employmentRate=70&...
```

All parameters must be validated before initialization from URL.

---

END OF PARAMETERS DOCUMENTATION
