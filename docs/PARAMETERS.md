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

**Default value**: 0.722 (72.2% in 2025)

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

**Data source**: Statistics Finland employment statistics; 2025 observed rate ≈ 72.2% (age 15–74; adjusted for age 15–62 in model)

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

**Definition**: Multiplier applied to observed 2025 age-specific fertility rates.

**Unit**: Dimensionless multiplier (1.0 = observed, 0.8 = 20% lower, 1.2 = 20% higher)

**Default value**: 1.0 (no change from observed)

**Valid range**: 0.5–1.5 (50% of observed to 150% of observed)

**Internal representation**: Decimal

**Effects**:
- **Direct effect on births**: births[t] = Σ(femalePopulation × (fertilityRate × baseRate[age]))
- **Affects population growth**: Higher fertility → more births → larger future population
- **Affects working-age population**: Directly inflates future employed population (20+ years later)
- **Long-term effects on pensioner-to-worker ratio**: High fertility reduces aging pressure
- **Effects on wage bill and contributions**: More future workers → higher wage bill
- **No direct effect on**: Employment rates, wages, contribution rates, investment returns, retirement age

**Interaction effects**:
- Fertility changes affect population only after 15+ year lag (cohort needs to reach working age)
- Very low fertility (0.5) accelerates aging; combined with high retirement age may create acute worker shortage
- High fertility (1.5) slows aging but increases education and public spending demands (not modeled)

**Scenario examples**:
- Finnish fertility rate (2025) ≈ 1.38 children per woman; rate of 0.5 multiplier → ~0.69 (very low, risk of severe aging)
- Rate of 1.5 multiplier → ~2.07 (high fertility, slows aging)

**Data source**: Statistics Finland fertility statistics; Finnish rate 2025 ≈ 1.38 children per woman; base rates by age from THL (birth data)

---

### 8. Migration Level (`migrationLevel`)

**Definition**: Annual net migration (absolute number of persons added to population annually).

**Unit**: Persons per year; can be positive (immigration) or negative (emigration)

**Default value**: 0 (no net migration change from observed)

**Valid range**: -10,000 to +50,000 persons per year

**Internal representation**: Integer

**Effects**:
- **Direct effect on population size**: netMigration[t] is added to age distribution each year
- **Affects total population**: More migration → larger population
- **Affects working-age population**: Migration profile (by age) determines distribution
- **Affects wage bill**: More working-age migrants → higher employment and wages
- **Affects pension burden**: Depends on age profile (younger migrants ease burden, older migrants increase it)
- **No direct effect on**: Employment rates, wages, contribution rates, fertility, investment returns

**Interaction effects**:
- Migration is applied proportionally across all age groups (simplified; actual migration skews young adult)
- Large negative migration (emigration) can partially offset high natural population aging
- Migration provides flexibility to adjust population without fertility or mortality changes

**Scenario examples**:
- Finnish observed migration (2025) ≈ +10,000 persons/year; default 0 means no additional/reduced migration
- +30,000/year scenario → rapid population growth, eases aging pressure
- -10,000/year scenario → population decline, increases pensioner pressure

**Data source**: Statistics Finland international migration statistics; 2015–2025 data shows variable flows (+8k to +20k annually depending on year)

---

### 9. Pension Indexation (`pensionIndexation`)

**Definition**: Rule for how average pension grows annually.

**Unit**: Categorical (version 0.1: simplistic; future versions may allow weighted combinations)

**Default value**: "wage" (pension growth = wage growth)

**Valid options** (v0.1): 
- `"wage"`: Pension growth = wageGrowth (default)
- `"price"`: Pension growth = priceInflation (if available)
- `"fixed"`: Pension growth = fixed rate (e.g., 2%)

**Note**: v0.1 uses simplified uniform indexation rule. Future versions may allow: `"combined": {wageWeight: 0.8, priceWeight: 0.2}`

**Effects**:
- **Direct effect on average pension**: averagePension[t] = averagePension[t-1] × (1 + indexationGrowth)
- **Affects pension expenditure**: As pensions grow, expenditure increases proportionally
- **Affects replacement rate**:
  - If indexation = wage growth: replacement rate stays constant
  - If indexation > wage growth: replacement rate rises (pensioners' living standard improves)
  - If indexation < wage growth: replacement rate falls (pensioners fall behind workers)
- **Affects sustainability**: High indexation rates strain pension assets
- **No direct effect on**: Employment, wages, contribution rates, investment returns, population

**Finnish policy context**:
- Official Finnish pension index (2024–2025) ≈ 1.83% (weighted combination of wage and price indices)
- Law specifies: 80% wage index + 20% price index (approximate; actual weights may vary)

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
| Employment Rate | 72.2% | 50% | 90% | % | Employed, wage bill, ratio |
| Wage Growth | 2.0% | -2% | 5% | %/year | Wages, wage bill, contributions, replacement |
| GDP Growth | 2.0% | -2% | 5% | %/year | GDP, pension/GDP ratio |
| Investment Return | 3.0% | 0% | 10% | %/year | Assets, investment income |
| Fertility Rate | 1.0 | 0.5 | 1.5 | multiplier | Future population, workers (delayed) |
| Migration Level | 0 | -10k | +50k | persons/yr | Population size, age distribution |
| Pension Indexation | wage | wage/price/fixed | — | rule | Average pension, expenditure, replacement |

---

## Implementation Notes

### Parameter Validation (src/app.js)

Before running simulation, validate all parameters:

```js
const errors = validateParameters({
  retirementAge: 63,
  contributionRate: 24.4,
  employmentRate: 72.2,
  wageGrowth: 2.0,
  gdpGrowth: 2.0,
  investmentReturn: 3.0,
  fertilityRate: 1.0,
  migrationLevel: 0,
  pensionIndexation: "wage"
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
