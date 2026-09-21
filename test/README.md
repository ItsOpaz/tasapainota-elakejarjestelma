# Test Harness Documentation

## Overview

The calibration test suite validates the pension-system simulation engine against 2025 Finnish baseline statistics.

**Location**: `test/calibration_test.js`
**Language**: JavaScript (Node.js)
**Base Model**: 0.2.0

The tests exercise the **real simulation engine** (`src/simulation.js`) against
the **real processed data** (`data/processed/*.json`). There are no stubs or
hardcoded results.

---

## Running Tests

```bash
node test/calibration_test.js
```

The suite exits with code 0 if all tests pass and 1 if any fail.

Expected output: 5 test suites, 50+ individual assertions.

---

## Test Suites

### [TEST 1] Baseline Scenario
**Purpose**: Verify that the simulation with default parameters matches all 2025 calibration targets.

**Scope**:
- Population, employed, average wage, wage bill
- Pensioners, average pension, expenditure, contributions, assets
- GDP
- Derived metrics: replacement rate, pensioner-worker ratio, pension expenditure/GDP

**Success criteria**: All metrics within their tolerance of target.

**Note**: Targets are on the model's own definitions (see `docs/MODEL.md`).
The simplified model intentionally differs from official ETK totals.

---

### [TEST 2] Numerical Stability
**Purpose**: Ensure the simulation produces valid numbers without NaN, Infinity, or crashes.

**Test cases** (8): default, retirement age 75, employment 50%, contribution 30%,
zero investment return, GDP growth -2%, fertility 0.5×, migration +50k.

**Validation**: For each case, all output series must be finite, and population
by age must never be negative across the full 70-year horizon.

---

### [TEST 3] Boundary Values
**Purpose**: Verify that extreme parameter values at the min/max of each range
do not crash the simulation, and that out-of-range values are rejected.

---

### [TEST 4] Parameter Sensitivity
**Purpose**: Verify that changing a parameter produces a measurable and
explainable change in the expected direction.

**Test cases**: retirement age, contribution rate, employment rate,
investment return, fertility, migration, wage growth, pension indexation.

---

### [TEST 5] Data Validation
**Purpose**: Verify the loader reads real data correctly and detects missing
data.

**Validation**: all required series load; population matches the register
total; mortality rates are probabilities in [0,1]; fertility rates are
per-woman rates; net migration sums to the observed total; missing series are
detected; provisional years ("2025*") parse; age groups expand correctly.

---

## Test Output

```
[TEST 1] Baseline Scenario (2025 with default parameters)
──────────────────────────────────────────────────────────────
  ✓ Total population
  ✓ Total employed
  ...
[TEST 5] Data Validation
──────────────────────────────────────────────────────────────
  ✓ All required series load
  ...
╔════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                        ║
║  Passed: 54                                                ║
║  Failed: 0                                                 ║
╚════════════════════════════════════════════════════════════╝
```

---

## Calibration Targets Reference

All targets are on the model's own definitions (see `docs/MODEL.md`) and match
the values in `test/calibration_test.js`:

| Metric | Target | Tolerance | Unit |
|--------|--------|-----------|------|
| Total population | 5,652,881 | ±2% | persons |
| Total employed (15–62) | 2,392,600 | ±2% | persons |
| Average wage | 50,232 | ±3% | EUR/year |
| Wage bill | 120,185 | ±2% | million EUR |
| Pensioners (63+) | 1,490,011 | ±2% | persons |
| Average pension | 22,932 | ±2% | EUR/year |
| Pension expenditure | 34,169 | ±3% | million EUR |
| Contributions | 29,325 | ±3% | million EUR |
| Pension assets | 290,108 | ±2% | million EUR |
| GDP | 281,783 | ±3% | million EUR |
| Replacement rate | 0.456 | ±1% | ratio |
| Pensioner-worker ratio | 0.623 | ±1% | ratio |
| Pension/GDP ratio | 0.121 | ±1% | ratio |

---

## Default Parameters Reference

From `src/simulation.js` (see `docs/PARAMETERS.md`):

```js
{
  retirementAge: 63,              // years [60-75]
  contributionRate: 0.244,        // decimal [0.15-0.30]
  employmentRate: 0.713,          // decimal [0.50-0.90]
  wageGrowth: 0.02,               // decimal [-0.02 to +0.05]
  gdpGrowth: 0.02,                // decimal [-0.02 to +0.05]
  investmentReturn: 0.03,         // decimal [0.00-0.10]
  fertilityRate: 1.31,            // children/woman [0.5-2.5]
  migrationLevel: 31233,          // persons [-10k to +50k]
  pensionIndexation: 0.02         // annual rate [-0.02 to +0.05]
}
```

---

## Helper Functions

The test file uses internal validation helpers:

### `validateWithTolerance(actual, target, tolerance)`
Returns: `{ passes, actualError, errorPercent, tolerance }`

### `assertMetricWithinTolerance(name, actual, target, tolerance)`
Throws: AssertionError with formatted message if out of tolerance.

### `assertValidNumber(value, varName)`
Throws: AssertionError if value is NaN or Infinity.

### Test helpers (internal to `calibration_test.js`)

- `check(name, fn)` — runs a test case and records pass/fail
- `withinTolerance(actual, target, tolerance)` — asserts a value is within tolerance
- `assertFinite(value, name)` / `assertAllFinite(arr, name)` — finite-number checks

---

## Modules under test

### src/data.js
```js
loadProcessedData()             // Node.js: reads data/processed/*.json
loadProcessedDataBrowser()      // Browser: fetches data/processed/*.json
getPopulationByAge(data, year)  // Array indexed by age [0..100+]
getMortalityRates(data, year)   // Probability of death by age (from count data)
getFertilityRates(data, year)   // Births per woman per year by age
getNetMigrationByAge(data, year)
getEmploymentData(data, year)   // { total, byAge }
getAverageWage / getAveragePension / getGDP / ...
```

### src/model.js
```js
validateParameters(params)      // { valid, errors }
agePopulation(pop, mortality, births)
calculateBirths / calculateDeaths / applyMigration
calculateWorkingAge / calculateEmployed / calculateWageBill
calculatePensioners / calculatePensionExpenditure
updatePensionAssets / adjustGDP
```

### src/simulation.js
```js
simulateScenario(params, { data, horizon })
// Returns: { years, population, employed, wageBill, contributions,
//            pensionExpenditure, pensionAssets, avgPension, pensioners,
//            replacementRate, pensionerWorkerRatio, gdp, pensionToGDP }
```

---

## Status

All 5 suites run against the real engine and real data, and pass.

---

END TEST DOCUMENTATION
