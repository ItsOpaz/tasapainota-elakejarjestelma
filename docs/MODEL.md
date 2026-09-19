# Simulation Model

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

```js
population[age]
```

where:

```text
age = 0 ... maximumAge
```

For each simulation year:

1. Existing cohorts age by one year.
2. New births are added.
3. Deaths are removed.
4. Net migration is added according to the migration assumption.

---

# 4. Births

A simplified fertility model is used.

Conceptually:

```text
births =
    womenOfChildbearingAge
    × fertilityRate
```

The exact implementation must define:

* age range
* sex ratio
* fertility interpretation
* timing of births

The first implementation may use a simplified approximation rather than a complete demographic fertility model.

---

# 5. Mortality

The first implementation may use an externally supplied mortality profile or a simplified age-specific survival model.

The model should avoid assuming that a fixed percentage of every age group dies each year.

If mortality data is unavailable for the initial version, the limitation must be explicitly documented.

---

# 6. Working-age population

The model derives the working-age population from the age distribution.

Conceptually:

```text
workingAgePopulation =
    population[workingAgeStart ... retirementAge-1]
```

The exact age definition is a model parameter.

---

# 7. Employment

The number of employed people is:

```text
employed =
    workingAgePopulation
    × employmentRate
```

The employment rate may vary by year.

For the first model, the user-adjustable employment parameter may represent an aggregate employment rate.

---

# 8. Average earnings

Average earnings evolve according to the wage-growth assumption.

```text
averageWage[t] =
    averageWage[t-1]
    × (1 + wageGrowth[t])
```

---

# 9. Wage bill

The wage bill is:

```text
wageBill[t] =
    employed[t]
    × averageWage[t]
```

This is one of the main drivers of pension contribution revenue.

---

# 10. Pension contributions

Contribution revenue is approximated as:

```text
contributions[t] =
    wageBill[t]
    × contributionRate[t]
```

The contribution rate is expressed as a fraction in the internal model.

For example:

```text
24.4 % → 0.244
```

---

# 11. Pension expenditure

Pension expenditure is initially represented as:

```text
pensionExpenditure[t] =
    pensioners[t]
    × averagePension[t]
```

A more detailed pension-stock model may be introduced later.

---

# 12. Pensioners

The simplest initial definition is:

```text
pensioners =
    population aged retirementAge and above
```

This is intentionally simplified.

Actual pension receipt patterns are more complex and should not be interpreted as identical to the population above a particular age.

---

# 13. Pension accrual

A simplified pension accrual mechanism may be represented as:

```text
annualAccrual =
    pensionableEarnings
    × accrualRate
```

A person's accumulated pension is approximately:

```text
pension =
    sum(annualAccrual)
```

The first model does not attempt to reproduce all legal pension accrual rules.

---

# 14. Pension indexation

The model represents pension indexation as a weighted combination of wage and price growth.

```text
pensionGrowth =
    wageGrowth × wageWeight
    + priceGrowth × priceWeight
```

with:

```text
wageWeight + priceWeight = 1
```

The weights are scenario parameters.

The exact default values must be documented against the pension-index rule being represented.

---

# 15. Pension assets

Pension assets evolve according to:

```text
assets[t] =
    assets[t-1]
    + investmentIncome[t]
    + contributions[t]
    - pensionExpenditure[t]
```

Investment income is approximated as:

```text
investmentIncome[t] =
    assets[t-1]
    × investmentReturn[t]
```

This is a simplified cash-flow representation.

The actual Finnish pension system contains more complex financing mechanisms.

---

# 16. GDP

The initial model may represent GDP using a simplified growth relationship.

For example:

```text
GDP[t] =
    GDP[t-1]
    × (1 + GDPGrowth[t])
```

Alternatively, GDP may be derived from employment and productivity:

```text
GDP =
    employed
    × productivity
```

The selected approach must be consistent throughout the model.

---

# 17. Pension expenditure / GDP

The main expenditure indicator is:

```text
pensionExpenditureToGDP =
    pensionExpenditure / GDP
```

The UI displays this as a percentage.

---

# 18. Pensioner / worker ratio

The model calculates:

```text
pensionerWorkerRatio =
    pensioners / employed
```

This indicator illustrates demographic pressure on the financing base.

It should not be interpreted as the exact legal financing ratio of the Finnish pension system.

---

# 19. Replacement rate

The model uses a simplified replacement-rate indicator:

```text
replacementRate =
    averagePension / averageWage
```

The exact definition used by the application must always be visible in the documentation.

This measure should not be confused with official replacement-rate calculations that may use different definitions.

---

# 20. Real versus nominal values

The model must explicitly distinguish between:

```text
nominal values
```

and:

```text
real values
```

The initial implementation should preferably use real euros for long-term comparisons.

If nominal values are shown, inflation assumptions must be applied consistently.

---

# 21. Baseline scenario

The baseline scenario consists of the default values defined in the application's configuration.

These values should be traceable to:

* observed data
* official projections
* documented modelling assumptions

The baseline must not contain undocumented assumptions.

---

# 22. User scenarios

A user scenario modifies one or more baseline parameters.

The simulation starts from the same initial state as the baseline and changes only the selected parameters.

This allows the two scenarios to be compared.

---

# 23. Scenario isolation

Changing one parameter should not silently change unrelated parameters.

For example:

Changing:

```text
retirementAge
```

should not automatically change:

```text
investmentReturn
```

unless an explicit model relationship is documented.

---

# 24. Boundary conditions

The model must handle extreme parameter values safely.

Examples:

* very low employment
* very high retirement age
* low investment returns
* negative net migration
* low fertility
* high pension expenditure

The simulation must not produce:

```text
NaN
Infinity
```

or invalid negative populations.

---

# 25. Numerical stability

The implementation should validate every simulation year.

At minimum:

```text
population >= 0
workers >= 0
pensioners >= 0
GDP > 0
averageWage >= 0
pensionAssets may not become undefined
```

If assets become negative, the model should represent this explicitly rather than silently clamping the value to zero.

---

# 26. Model limitations

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

These limitations should be visible to users.

---

# 27. Model evolution

Future versions may introduce:

* age-specific employment
* age-specific mortality
* sex-specific demographic assumptions
* more detailed pension accrual
* separate pension schemes
* more detailed pension fund mechanics
* stochastic investment returns
* uncertainty ranges
* multiple official projection scenarios

Such changes should be documented as model-version changes rather than silently changing the meaning of existing outputs.
