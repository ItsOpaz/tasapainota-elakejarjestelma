# Test Harness Documentation

## Overview

The calibration test suite validates the pension-system simulation engine against 2025 Finnish baseline statistics.

**Location**: `test/calibration_test.js`
**Language**: JavaScript (Node.js)
**Base Model**: 0.1.0

---

## Running Tests

### Run All Tests
```bash
node test/calibration_test.js
```

Expected output: 5 test suites with 100s of individual assertions.

### Run Individual Tests (Future)
```js
// In Phase E, after simulation engine implementation:
const tests = require('./test/calibration_test.js');
tests.testBaselineScenario();
tests.testNumericalStability();
tests.testBoundaryValues();
tests.testParameterSensitivity();
tests.testDataValidation();
```

---

## Test Suites

### [TEST 1] Baseline Scenario
**Purpose**: Verify that simulation with default parameters matches all 2025 calibration targets.

**Scope**:
- Population: Total and age distribution
- Employment: Count and employment rate
- Wages: Average wage and wage bill
- Pensions: Pensioners, average pension, expenditure
- Contributions & Assets: Revenue and accumulated assets
- GDP: Gross domestic product
- Derived: Replacement rate, ratios, and indicators

**Success criteria**: All metrics within ±2% of target (or specified tolerance).

**Dependencies**: 
- `simulateYear()` from src/simulation.js
- `loadProcessedData()` from src/data.js
- 2025 baseline data from data/processed/*.json files

---

### [TEST 2] Numerical Stability
**Purpose**: Ensure simulation produces valid numbers without NaN, Infinity, or crashes.

**Test cases** (8):
1. Default parameters (baseline)
2. High retirement age (75)
3. Low employment (50%)
4. High contribution rate (30%)
5. Zero investment return (0%)
6. Negative GDP growth (-2%)
7. Very low fertility (0.5× multiplier)
8. High net migration (+50,000 persons/year)

**Validation**: Each year's output must have:
- No `NaN` values
- No `Infinity` values
- Non-negative population by age
- Positive GDP
- Valid pension assets (can be negative if liabilities exceed)

**Success criteria**: All parameter combinations produce valid outputs for 70-year horizon.

---

### [TEST 3] Boundary Values
**Purpose**: Verify simulation handles minimum and maximum parameter values safely.

**Test cases** (13):
- Retirement age: 60 (min), 75 (max)
- Employment rate: 50% (min), 90% (max)
- Contribution rate: 15% (min), 30% (max)
- Wage growth: -2% (min), +5% (max)
- GDP growth: -2% (min), +5% (max)
- Investment return: 0% (min), 10% (max)
- Fertility rate: 0.5× (min), 1.5× (max)
- Migration: -10,000 (min), +50,000 (max)

**Validation**: No crash; simulation completes; results are numerical valid.

**Success criteria**: All boundary parameter combinations run to completion without error.

---

### [TEST 4] Parameter Sensitivity
**Purpose**: Verify each parameter produces expected directional effects on outputs.

**Test cases** (5 parameter sensitivity scenarios):

#### 1. Retirement Age +2 years (63 → 65)
Expected: Pensioners ↓, Employed ↑, Wage bill ↑, Expenditure ↓, Ratio ↓

#### 2. Contribution Rate +2.0% (24.4% → 26.4%)
Expected: Contributions ↑, Assets ↑, Solvency improves

#### 3. Employment Rate +2.8% (72.2% → 75.0%)
Expected: Employed ↑, Wage bill ↑, Contributions ↑, Ratio ↓

#### 4. Wage Growth +1% (2% → 3%)
Expected: Wage bill ↑, Contributions ↑, Replacement rate ↑

#### 5. Investment Return +1% (3% → 4%)
Expected: Investment income ↑, Assets ↑, Solvency improves

**Success criteria**: Each parameter change produces expected directional effects (↑ or ↓) in dependent variables.

---

### [TEST 5] Data Validation (Error Handling)
**Purpose**: Verify graceful handling of missing, malformed, or invalid data.

**Test cases** (8 error scenarios):

1. **missing population.json** → Clear error: "Cannot find data/processed/population.json"
2. **Malformed JSON** → Parsing error with line number
3. **Missing age data** → Warning: "Age 0-5 data missing; incomplete age distribution"
4. **NULL values** → Error: "Field 'gdp' is null at year 2025"
5. **Negative population** → Error: "Population is negative at age 45, year 2025: -1234"
6. **GDP = 0** → Error: "Cannot divide by zero; GDP is 0"
7. **Year beyond horizon** → Graceful: Use last known value or default projection
8. **Invalid URL parameters** → Error: "Parameter 'retirementAge=80' exceeds max: 75"

**Success criteria**: Appropriate error messages for each scenario; no silent failures.

**Implementation**: Phase E - add error handling in data.js and model.js.

---

## Calibration Targets Reference

All targets extracted from docs/CALIBRATION_TARGETS.md (2025 base year):

| Metric | Target | Tolerance | Unit |
|--------|--------|-----------|------|
| Total population | 5,652,881 | ±2% | persons |
| Total employed | 2,590,000 | ±2% | persons |
| Average wage | 50,232 | ±3% | EUR/year |
| Wage bill | 130,300 | ±2% | million EUR |
| Pensioners | 1,400,000 | ±3% | persons (est.) |
| Average pension | 22,932 | ±2% | EUR/year |
| Pension expenditure | 37,225 | ±3% | million EUR |
| Contributions | 33,571 | ±5% | million EUR |
| Pension assets | 290,108 | ±2% | million EUR |
| GDP | 281,783 | ±3% | million EUR |
| Replacement rate | 0.456 | ±1% | ratio |
| Pensioner-worker ratio | 0.540 | ±1% | ratio |
| Pension/GDP ratio | 0.132 | ±1% | ratio |

---

## Default Parameters Reference

From docs/PARAMETERS.md:

```js
{
  retirementAge: 63,              // years [60-75]
  contributionRate: 0.244,        // decimal [0.15-0.30]
  employmentRate: 0.722,          // decimal [0.50-0.90]
  wageGrowth: 0.02,               // decimal [-0.02 to +0.05]
  gdpGrowth: 0.02,                // decimal [-0.02 to +0.05]
  investmentReturn: 0.03,         // decimal [0.00-0.10]
  fertilityRate: 1.0,             // multiplier [0.5-1.5]
  migrationLevel: 0,              // persons [-10k to +50k]
  pensionIndexation: 'wage'       // 'wage' | 'price' | 'fixed'
}
```

---

## Helper Functions

The test file exports validation helpers for use in Phase E:

### `validateWithTolerance(actual, target, tolerance)`
Returns: `{ passes, actualError, errorPercent, tolerance }`

### `assertMetricWithinTolerance(name, actual, target, tolerance)`
Throws: AssertionError with formatted message if out of tolerance.

### `assertValidNumber(value, varName)`
Throws: AssertionError if value is NaN or Infinity.

### `assertNonNegative(value, varName)`
Throws: AssertionError if value < 0.

### `assertPositive(value, varName)`
Throws: AssertionError if value <= 0.

### `validateParameters(params)`
Returns: Array of error strings (empty if valid).

---

## Integration with Phase E

The test harness expects these modules to be implemented:

### src/data.js
```js
function loadProcessedData() { ... }
// Returns: { population, employment, earnings, pensions, gdp, ... }

function getPopulationByAge(year) { ... }
// Returns: Array indexed by age [0..100+]
```

### src/model.js
```js
function validateParameters(params) { ... }
// Returns: Array of error messages

function simulateYear(params, state, data) { ... }
// Returns: { population, employed, avgWage, wageBill, ... }
```

### src/simulation.js
```js
function simulateScenario(params, initialState, data, horizon) { ... }
// Returns: Result with yearly arrays of all metrics
```

---

## Success Criteria for Phase D

✅ Test harness created and runs
✅ All 5 test suites documented with 13+ test cases
✅ Calibration targets embedded in code
✅ Default parameters embedded in code
✅ Validation functions exported for Phase E use
✅ Clear error messages and formatting
✅ Production-ready test runner (no external test frameworks)

---

## Next: Phase E - Simulation Engine

Once these modules are implemented in Phase E:
1. Run `node test/calibration_test.js`
2. Calibration tests will validate simulation engine
3. Iterate on model implementation until all tests pass
4. Proceed to Phase F when baseline passes ±2% tolerance

---

## Known Limitations

- **Stubs only**: Phase D creates test structure; actual model implementation needed in Phase E
- **Mock data**: Baseline test uses mock result matching targets; real simulation engine needed
- **No external frameworks**: Uses only Node.js built-in `assert` module (simple, robust)
- **Synchronous tests**: No async/await (simulations should be deterministic and fast)

---

END TEST DOCUMENTATION
