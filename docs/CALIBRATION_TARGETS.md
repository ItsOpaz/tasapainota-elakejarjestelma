# Calibration Targets (2025 Baseline)

This document specifies the 2025 baseline values (calibration targets) that the simulation engine must match when initialized with default parameters.

**Tolerance threshold**: Each metric must match the observed value within ±2% when the simulation is run with all default parameters and unlimited computational precision.

**Important**: Targets are expressed on the model's own definitions (see `docs/MODEL.md`):
- **employed**: persons aged 15 to retirementAge−1 (15–62 at default)
- **pensioners**: persons aged retirementAge and over (63+ at default)
- **pension expenditure**: pensioners × average pension (simplified)

The simplified model deliberately differs from official ETK totals, which include disability and survivor pensions and non-wage income. Those differences are documented limitations, not calibration failures.

**Note**: `test/calibration_test.js` is the authoritative executable version of these targets. If this document and the test disagree, the test reflects the current model.

---

## Population Metrics

### Total Population

**Target value (2025)**: 5,652,881 persons

**Source**: Statistics Finland population register

**Tolerance**: ±2% → [5,539,825 ... 5,765,938]

**Calculation in model**: `population[2025, all ages] summed`

**Validation method**:
```js
const observed2025 = 5652881;
const simulated2025 = simulateYear(2025).population.reduce((sum, count) => sum + count);
const error = Math.abs(simulated2025 - observed2025) / observed2025;
assert(error <= 0.02, `Population error: ${(error * 100).toFixed(1)}%`);
```

---

### Population Age Distribution (Sampled Ages)

The simulator must reproduce the age distribution. Sample validation at key ages:

| Age | 2025 Observed | ±2% Range | Source |
|-----|-------|-----------|---------|
| 0 | 45,786 | [44,870–46,702] | Statistics Finland |
| 15 | 65,888 | [64,570–67,206] | Statistics Finland |
| 30 | 73,179 | [71,715–74,643] | Statistics Finland |
| 45 | 72,210 | [70,766–73,654] | Statistics Finland |
| 60 | 71,589 | [70,157–73,021] | Statistics Finland |
| 63 (retirement age) | 71,715 | [70,281–73,149] | Statistics Finland |
| 75 | 64,249 | [62,964–65,534] | Statistics Finland |
| 85 | 24,447 | [23,958–24,936] | Statistics Finland |
| 100 | 1,315 | [1,289–1,341] | Statistics Finland |

**Validation method**:
```js
const ageGroups = [0, 15, 30, 45, 60, 63, 75, 85, 100];
const populationByAge = result.population[0];
for (const age of ageGroups) {
  const observed = calibrationTargets.populationByAge[age];
  const simulated = populationByAge[age];
  const error = Math.abs(simulated - observed) / observed;
  assert(error <= 0.02, `Population age ${age} error: ${(error*100).toFixed(1)}%`);
}
```

---

## Employment & Wage Metrics

### Total Employed

**Target value (2025)**: 2,392,600 persons

**Source**: Statistics Finland employment statistics (derived on model age range 15–62)

**Calculation**: employed[2025, 15–62] 

**Tolerance**: ±2% → [2,344,748 ... 2,440,452]

**Baseline employed formula check**:
```js
const expected = 2392600;
const workingAgePopulation = simulateYear(2025).workingAgePopulation; // 3,355,140
const employed = workingAgePopulation * 0.713; // employmentRate default
assert(Math.abs(employed - expected) / expected <= 0.02);
```

---

### Average Wage

**Target value (2025)**: 50,232 EUR per year (provisional)

**Unit**: Real 2025 EUR (constant prices)

**Source**: Statistics Finland earnings statistics + ETK wage data

**Tolerance**: ±3% → [48,725 ... 51,739] (slightly relaxed due to data provisional status)

**Note**: "Provisional" indicates Statistics Finland has not finalized 2025 earnings; this may be revised as official data becomes available.

**Validation**:
```js
const expected = 50232;
const avgWage = simulateYear(2025).averageWage;
const error = Math.abs(avgWage - expected) / expected;
assert(error <= 0.03, `Wage error: ${(error*100).toFixed(1)}%`);
```

---

### Wage Bill

**Target value (2025)**: 120,185 million EUR

**Calculation**: employed × averageWage = 2,392,600 × 50,232 ≈ 120,185,000,000 EUR = 120.2 billion

**Unit**: Real 2025 EUR (millions)

**Tolerance**: ±2% → [117.8 ... 122.6 billion]

**Validation**:
```js
const expected = 120185; // millions
const simulated = result.wageBill[2025];
assert(Math.abs(simulated - expected) / expected <= 0.02);
```

---

## Pension System Metrics

### Pensioner Count

**Target value (2025)**: 1,490,011 persons

**Definition**: Population age ≥ 63 (retirement age default)

**Source**: Statistics Finland age distribution (derived)

**Calculation**: `population[2025, ages 63–100+] summed`

**Tolerance**: ±2% → [1,460,211 ... 1,519,811]

**Note**: This is a simplified approximation; actual pension recipients include early retirees (55+) and exclude some who continue working. The model uses age 63+ as proxy.

**Validation**:
```js
const observed = 1490011;
const simulated = result.pensioners[2025];
const error = Math.abs(simulated - observed) / observed;
assert(error <= 0.02);
```

---

### Average Pension (Monthly)

**Target value (2025)**: 1,911 EUR per month

**Unit**: Nominal EUR (monthly payment)

**Annualized**: 1,911 × 12 = 22,932 EUR per year

**Source**: ETK average pension statistics (official, not provisional)

**Tolerance**: ±2% → [1,873 ... 1,949] monthly, or [22,476 ... 23,388] annually

**Validation**:
```js
const expectedMonthly = 1911;
const expectedAnnual = expectedMonthly * 12; // 22,932
const simulated = result.averagePension[2025]; // stored as annual in model
const error = Math.abs(simulated - expectedAnnual) / expectedAnnual;
assert(error <= 0.02);
```

---

### Pension Expenditure

**Target value (2025)**: 34,169 million EUR per year

**Unit**: Nominal EUR (millions)

**Calculation**: pensioners × averagePension = 1,490,011 × 22,932 ≈ 34,169,000,000 EUR = 34.2 billion

**Note**: ETK statistics show 37,225 million (2025) for total pension expenditure; the difference is because the simplified model covers only old-age pensions (pensioners × average pension) and excludes disability and survivor pensions. The model uses the simplified calculation.

**Tolerance**: ±3% → [33,144 ... 35,194 million]

**Validation**:
```js
const expected = 34169; // millions
const simulated = result.pensionExpenditure[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.03);
```

---

### Pension Contribution Revenue

**Target value (2025)**: 29,325 million EUR

**Unit**: EUR (millions)

**Calculation**: wageBill × contributionRate = 120,185M × 0.244 ≈ 29,325 million

**Note**: The official ETK premium income (33,571M) is higher because it includes other income sources (interest, transfers, state contributions). The model uses the simplified wage-bill calculation.

**Tolerance**: ±3% → [28,445 ... 30,205 million]

**Validation**:
```js
const expected = 29325; // millions
const simulated = result.contributions[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.03);
```

---

### Pension Assets

**Target value (2025)**: 290,108 million EUR

**Unit**: EUR (millions)

**Source**: ETK pension asset balance sheet (official, published June 2026)

**Tolerance**: ±2% → [284,306 ... 295,910 million]

**Note**: Pension assets represent accumulated reserves managed by ETK and employment-based pension funds.

**Validation** (note: 2025 is the starting year, so initial value must be set, not calculated):
```js
const observed = 290108; // millions
const initial = initialState.pensionAssets;
assert(initial === observed);
```

---

### Pension Asset Evolution Check

When simulating year 2026 (first projection year after 2025 base):

**Expected 2026 assets (approximate check, ±5% tolerance)**:

```
assets[2026] = assets[2025] 
             + contributions[2026] 
             + investmentIncome[2026]
             - pensionExpenditure[2026]

investmentIncome[2026] = assets[2025] × investmentReturn[2026]
                       = 290,108M × 0.03
                       ≈ 8,703 million EUR
```

With rough estimates (wage bill growth ~2%, employment flat):
- Contributions[2026] ≈ 29,325 × 1.02 ≈ 29,912 million
- Pension expenditure[2026] ≈ 34,169 × 1.02 ≈ 34,852 million
- Assets[2026] ≈ 290,108 + 29,912 + 8,703 - 34,852 ≈ 293,871 million

This is a consistency check, not a strict calibration target.

---

## Economic Metrics

### GDP

**Target value (2025)**: 281,783 million EUR (provisional)

**Unit**: EUR (millions), nominal or real depending on scenario

**Source**: Statistics Finland national accounts (preliminary estimate)

**Tolerance**: ±3% → [273,130 ... 290,436 million]

**Note**: 2025 GDP figure is provisional (released early 2026); may be revised.

**Validation**:
```js
const expected = 281783; // millions
const simulated = result.GDP[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.03);
```

---

## Derived Metrics (Targets)

These metrics are calculated from the core variables; they have no independent calibration target but should make sense given above values.

### Replacement Rate (2025 baseline)

**Formula**: averagePension / averageWage

**Calculated value**: 22,932 / 50,232 ≈ 0.456 (45.6%)

**Interpretation**: The average pension is about 45.6% of the average wage.

**Expected range**: 0.40–0.60 (40–60% is typical for developed economies)

**Validation**:
```js
const pension = 22932;
const wage = 50232;
const expected = pension / wage; // ≈ 0.456
const simulated = result.replacementRate[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.01); // Very tight check; derived metric
```

---

### Pensioner-to-Worker Ratio (2025 baseline)

**Formula**: pensioners / employed

**Calculated value**: 1,490,011 / 2,392,600 ≈ 0.623 (62 pensioners per 100 workers)

**Interpretation**: Approximately 62 pensioners supported by every 100 workers.

**Expected range**: 0.40–0.65 (varies by country aging patterns)

**Validation**:
```js
const pensioners = 1490011;
const employed = 2392600;
const expected = pensioners / employed; // ≈ 0.623
const simulated = result.pensionerWorkerRatio[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.01);
```

---

### Pension Expenditure to GDP

**Formula**: pensionExpenditure / GDP

**Calculated value**: 34,169 / 281,783 ≈ 0.121 (12.1%)

**Interpretation**: Pension spending is about 12.1% of GDP.

**Context**: 
- OECD average: ~7–9%
- Finland (high pensions): ~11–13%
- Japan (aging): ~11–12%

**Expected range**: 0.10–0.15 for Finland scenario

**Validation**:
```js
const expenditure = 34169; // millions
const gdp = 281783; // millions
const expected = expenditure / gdp; // ≈ 0.121
const simulated = result.pensionToGDP[2025];
const error = Math.abs(simulated - expected) / expected;
assert(error <= 0.01);
```

---

## Calibration Procedure

### Step 1: Initialize Simulation with Defaults

```js
const parameters = {
  retirementAge: 63,
  contributionRate: 0.244,
  employmentRate: 0.713,
  wageGrowth: 0.02,
  gdpGrowth: 0.02,
  investmentReturn: 0.03,
  fertilityRate: 1.31,
  migrationLevel: 31233,
  pensionIndexation: 0.02
};

const data = loadProcessedData();
const result = simulateScenario(parameters, { data, horizon: 1 });
```

### Step 2: Check All Metrics

Run `test/calibration_test.js` (Phase D.3):
- Population: total and by age
- Employment and wages
- Pension metrics
- Economic metrics
- Derived ratios

### Step 3: Assess Discrepancies

If any metric exceeds tolerance:
1. Check data loading (is 2025 data populated correctly?)
2. Check model formulas (review MODEL.md calculations)
3. Check unit conversions (EUR millions vs persons, etc.)
4. Document discrepancy and reason in MODEL.md § 19 (limitations)

### Step 4: Adjust If Needed

If discrepancy is due to:
- **Model error**: Fix formula in src/model.js
- **Known simplification**: Document in MODEL.md and relax tolerance
- **Data issue**: Check data/processed/ files for correctness

---

## Reference Data Files

The following processed data files provide the basis for calibration targets:

- `data/processed/population.json` → Total population, age distribution
- `data/processed/employment.json` → Total employed, age-specific employment
- `data/processed/earnings.json` → Average wage
- `data/processed/pension_expenditure.json` → Pension expenditure
- `data/processed/pension_assets.json` → Pension asset value
- `data/processed/average_pension.json` → Average pension
- `data/processed/gdp.json` → GDP value
- `data/processed/premium_income.json` → Contribution revenue

All values extracted from official sources (Statistics Finland, ETK, THL) with full provenance preserved.

---

## Version History

**v0.2.0 (2026-09-21)**:
- `fertilityRate` changed from a multiplier to an absolute total fertility
  rate (children per woman); default set to the observed 2025 TFR (1.31)
- Calibration targets reconciled with the model's own definitions

**v0.1.0 (2026-09-19)**:
- Initial calibration targets for 2025 base year
- Based on Statistics Finland and ETK official/preliminary 2025 data
- All tolerances set to ±2% except where noted
- Derived metrics validated as consistency checks

---

END OF CALIBRATION TARGETS DOCUMENT
