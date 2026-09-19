# Tasapainota Suomen eläkejärjestelmä — Specification

## 1. Overview

**Tasapainota Suomen eläkejärjestelmä** is a lightweight, browser-based simulation game that allows users to explore the long-term effects of different demographic, economic and pension-system assumptions in Finland.

The application uses publicly available Finnish statistical data as its starting point and presents a simplified simulation model in an interactive visual interface.

The application is intended for:

* education
* public discussion
* exploration of trade-offs
* experimentation with alternative scenarios

It is not intended to reproduce official actuarial calculations.

---

# 2. Goals

The application should:

1. Make the basic mechanics of the Finnish pension system understandable.
2. Show how demographic and economic developments affect pension financing.
3. Allow users to change selected parameters interactively.
4. Show the consequences of those changes over a long time horizon.
5. Clearly distinguish observed data, official projections and the application's own simulation.
6. Make all important assumptions and data sources discoverable.
7. Work entirely in the browser without requiring a backend server.
8. Be embeddable on other websites.
9. Be usable on desktop and mobile devices.
10. Make it possible to reproduce a scenario through a URL.

---

# 3. Non-goals

The first version will not attempt to reproduce the Finnish pension system in full detail.

The application will not initially model in full detail:

* every pension benefit type
* individual pension records
* taxation
* individual pension calculations
* all pension funds separately
* detailed disability pension dynamics
* detailed public-sector pension financing
* every legal exception in Finnish pension legislation
* actuarial mortality models
* individual-level behaviour

The model is deliberately simplified.

---

# 4. Core concept

The application represents the pension system as a set of interacting components:

```text
Population
    ↓
Working-age population
    ↓
Employment
    ↓
Wage bill
    ↓
Pension contributions
    ↓
Pension financing
    ↓
Pension expenditure
    ↓
Pension assets
```

Demographic assumptions influence the number of workers and pensioners.

Economic assumptions influence wages, GDP, employment and investment returns.

Policy parameters influence pension expenditure and contribution revenue.

---

# 5. Time horizon

The default simulation starts from the latest available base year and projects forward approximately 70 years.

The exact base year is determined by the available source data.

The user should be able to select or inspect:

* base year
* simulation end year

The default horizon should be sufficiently long to show demographic and pension-system effects.

Recommended default:

```text
Start: latest available year
End: start year + 70
```

---

# 6. Baseline scenario

The application must contain a baseline scenario.

The baseline should represent the best available documented continuation of current conditions and/or an appropriate official projection.

The baseline is not described as a prediction of what will happen.

It is a reference scenario against which user-created scenarios can be compared.

The UI should clearly identify:

> Baseline / reference scenario

and distinguish it visually from:

> User scenario

---

# 7. User-adjustable parameters

The first version should expose a limited number of parameters.

Too many controls make the simulation difficult to understand.

## 7.1 Pension age

Parameter:

```text
retirementAge
```

Suggested initial range:

```text
65–70 years
```

The exact default and range must be documented against the pension-system context used by the model.

---

## 7.2 Pension contribution rate

Parameter:

```text
contributionRate
```

Unit:

```text
percentage of wage bill
```

Suggested initial range:

```text
20–30 %
```

---

## 7.3 Pension accrual

Parameter:

```text
accrualRate
```

Unit:

```text
percentage of pensionable earnings per year
```

The implementation should avoid implying that this parameter represents the complete legal pension accrual system.

---

## 7.4 Pension indexation

Parameter:

```text
pensionIndexation
```

This controls the relationship between pension growth and wage/price development.

The model may initially represent indexation using a simplified weighting:

```text
pensionGrowth =
    wageGrowth * wageWeight
    + priceGrowth * priceWeight
```

with:

```text
wageWeight + priceWeight = 1
```

---

## 7.5 Employment rate

Parameter:

```text
employmentRate
```

Unit:

```text
percentage
```

This affects the number of employed people and therefore the wage bill.

---

## 7.6 Net migration

Parameter:

```text
netMigration
```

Unit:

```text
persons / year
```

Migration should primarily affect the population model.

Its effects on employment should be mediated through the employment model rather than treating every migrant as immediately employed.

---

## 7.7 Fertility

Parameter:

```text
fertility
```

This controls births in the simplified demographic model.

The initial implementation may use a total fertility rate or another clearly documented simplified representation.

---

## 7.8 Investment return

Parameter:

```text
investmentReturn
```

Unit:

```text
percentage / year
```

This controls the nominal or real return applied to pension assets.

The model must explicitly document whether the parameter is nominal or real.

---

# 8. Main outputs

The application should display at least the following indicators.

## 8.1 Pension expenditure / GDP

```text
pensionExpenditureToGDP
```

Unit:

```text
%
```

---

## 8.2 Pension contribution rate

```text
contributionRate
```

Unit:

```text
%
```

---

## 8.3 Pension assets

```text
pensionAssets
```

Unit:

```text
EUR
```

The UI should normally display this in billions or trillions of euros.

---

## 8.4 Pension level

```text
replacementRate
```

Unit:

```text
%
```

This should be defined explicitly in `MODEL.md`.

---

## 8.5 Dependency ratio

```text
pensionerWorkerRatio
```

This represents the relationship between pensioners and workers.

The exact definition must be documented.

---

# 9. Charts

The application should contain an interactive main chart.

Users should be able to select the displayed metric.

Initial options:

* Pension expenditure / GDP
* Contribution rate
* Pension assets
* Replacement rate
* Pensioner / worker ratio

The chart should show at least:

```text
Baseline
User scenario
```

when a user has modified the parameters.

The x-axis represents years.

The chart should support hover/tooltips showing the underlying value.

---

# 10. Current state

The UI should contain a clearly identifiable current-state section.

Example:

```text
CURRENT STATE

Pension expenditure / GDP
14.4 %

Contribution rate
24.4 %

Pension assets
€XXX bn

Pensioners
X.X million
```

The exact values must come from the documented data sources rather than hard-coded explanatory text.

---

# 11. Scenario comparison

The user should be able to compare:

```text
Baseline
vs.
User scenario
```

The comparison should display both numerical values and graphic
