/**
 * Calibration Test Suite
 *
 * Validates the simulation engine against the 2025 baseline and checks
 * numerical stability, boundary values, parameter sensitivity and data
 * validation. Tests run the real engine against the real processed data.
 *
 * MODEL_VERSION: 0.2.0
 * BASE_YEAR: 2025
 *
 * Run with: node test/calibration_test.js
 */

const assert = require('assert');

const model = require('../src/model');
const dataLoader = require('../src/data');
const simulation = require('../src/simulation');

// ============================================================================
// CALIBRATION TARGETS (2025 baseline)
// ============================================================================
//
// Targets are expressed on the model's own definitions (see docs/MODEL.md):
//   - employed: persons aged 15 to retirementAge-1 (15-62 at default)
//   - pensioners: persons aged retirementAge and over (63+ at default)
//   - pension expenditure: pensioners x average pension (simplified)
//
// The simplified model deliberately differs from official ETK totals, which
// include disability and survivor pensions and non-wage income. Those
// differences are documented limitations, not calibration failures.

const calibrationTargets = {
  population: { value: 5652881, tolerance: 0.02 },
  employed: { value: 2392600, tolerance: 0.02 },
  averageWage: { value: 50232, tolerance: 0.03 },
  wageBill: { value: 120185e6, tolerance: 0.02 },
  pensioners: { value: 1490011, tolerance: 0.02 },
  averagePension: { value: 22932, tolerance: 0.02 },
  pensionExpenditure: { value: 34169e6, tolerance: 0.03 },
  pensionContributions: { value: 29325e6, tolerance: 0.03 },
  pensionAssets: { value: 290108.2e6, tolerance: 0.02 },
  gdp: { value: 281783e6, tolerance: 0.03 },
  replacementRate: { value: 22932 / 50232, tolerance: 0.01 },
  pensionerWorkerRatio: { value: 1490011 / 2392600, tolerance: 0.01 },
  pensionToGDP: { value: 34169e6 / 281783e6, tolerance: 0.01 }
};

// ============================================================================
// TEST HELPERS
// ============================================================================

let passCount = 0;
let failCount = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failCount++;
  }
}

function withinTolerance(actual, target, tolerance) {
  if (actual === null || actual === undefined || !isFinite(actual)) {
    throw new Error(`value is not finite: ${actual}`);
  }
  const error = Math.abs(actual - target) / target;
  if (error > tolerance) {
    throw new Error(
      `expected ${target.toLocaleString('fi-FI')} ±${(tolerance * 100).toFixed(1)}%, ` +
      `got ${actual.toLocaleString('fi-FI')} (error ${(error * 100).toFixed(2)}%)`
    );
  }
}

function assertFinite(value, name) {
  assert(typeof value === 'number' && isFinite(value), `${name} is not finite: ${value}`);
}

function assertAllFinite(arr, name) {
  arr.forEach((v, i) => {
    assert(typeof v === 'number' && isFinite(v), `${name}[${i}] is not finite: ${v}`);
  });
}

// ============================================================================
// TEST 1: BASELINE SCENARIO
// ============================================================================

function testBaselineScenario() {
  console.log('\n[TEST 1] Baseline Scenario (2025 with default parameters)');
  console.log('─'.repeat(70));

  const result = simulation.simulateScenario({}, { horizon: 70 });
  const i = 0; // 2025 is the first year

  check('Total population', () =>
    withinTolerance(result.population[i].reduce((a, b) => a + b, 0),
      calibrationTargets.population.value, calibrationTargets.population.tolerance));

  check('Total employed', () =>
    withinTolerance(result.employed[i],
      calibrationTargets.employed.value, calibrationTargets.employed.tolerance));

  check('Average wage', () =>
    withinTolerance(result.avgPension[i] / result.replacementRate[i],
      calibrationTargets.averageWage.value, calibrationTargets.averageWage.tolerance));

  check('Wage bill', () =>
    withinTolerance(result.wageBill[i],
      calibrationTargets.wageBill.value, calibrationTargets.wageBill.tolerance));

  check('Total pensioners', () =>
    withinTolerance(result.pensioners[i],
      calibrationTargets.pensioners.value, calibrationTargets.pensioners.tolerance));

  check('Average pension', () =>
    withinTolerance(result.avgPension[i],
      calibrationTargets.averagePension.value, calibrationTargets.averagePension.tolerance));

  check('Pension expenditure', () =>
    withinTolerance(result.pensionExpenditure[i],
      calibrationTargets.pensionExpenditure.value, calibrationTargets.pensionExpenditure.tolerance));

  check('Pension contributions', () =>
    withinTolerance(result.contributions[i],
      calibrationTargets.pensionContributions.value, calibrationTargets.pensionContributions.tolerance));

  check('Pension assets', () =>
    withinTolerance(result.pensionAssets[i],
      calibrationTargets.pensionAssets.value, calibrationTargets.pensionAssets.tolerance));

  check('GDP', () =>
    withinTolerance(result.gdp[i],
      calibrationTargets.gdp.value, calibrationTargets.gdp.tolerance));

  check('Replacement rate', () =>
    withinTolerance(result.replacementRate[i],
      calibrationTargets.replacementRate.value, calibrationTargets.replacementRate.tolerance));

  check('Pensioner-worker ratio', () =>
    withinTolerance(result.pensionerWorkerRatio[i],
      calibrationTargets.pensionerWorkerRatio.value, calibrationTargets.pensionerWorkerRatio.tolerance));

  check('Pension expenditure-to-GDP', () =>
    withinTolerance(result.pensionToGDP[i],
      calibrationTargets.pensionToGDP.value, calibrationTargets.pensionToGDP.tolerance));
}

// ============================================================================
// TEST 2: NUMERICAL STABILITY
// ============================================================================

function testNumericalStability() {
  console.log('\n[TEST 2] Numerical Stability');
  console.log('─'.repeat(70));

  const cases = [
    { name: 'Default parameters', params: {} },
    { name: 'High retirement age (75)', params: { retirementAge: 75 } },
    { name: 'Low employment (50%)', params: { employmentRate: 0.50 } },
    { name: 'High contribution rate (30%)', params: { contributionRate: 0.30 } },
    { name: 'Zero investment return', params: { investmentReturn: 0.0 } },
    { name: 'Negative GDP growth (-2%)', params: { gdpGrowth: -0.02 } },
    { name: 'Very low fertility (0.5 children/woman)', params: { fertilityRate: 0.5 } },
    { name: 'High net migration (+50k)', params: { migrationLevel: 50000 } }
  ];

  cases.forEach(tc => {
    check(tc.name, () => {
      const r = simulation.simulateScenario(tc.params, { horizon: 70 });
      assertAllFinite(r.employed, 'employed');
      assertAllFinite(r.wageBill, 'wageBill');
      assertAllFinite(r.contributions, 'contributions');
      assertAllFinite(r.pensionExpenditure, 'pensionExpenditure');
      assertAllFinite(r.pensionAssets, 'pensionAssets');
      assertAllFinite(r.replacementRate, 'replacementRate');
      assertAllFinite(r.pensionerWorkerRatio, 'pensionerWorkerRatio');
      assertAllFinite(r.pensionToGDP, 'pensionToGDP');
      // Population must never go negative
      r.population.forEach((yearPop, y) => {
        yearPop.forEach((count, age) => {
          assert(count >= 0, `negative population at year ${r.years[y]} age ${age}: ${count}`);
        });
      });
    });
  });
}

// ============================================================================
// TEST 3: BOUNDARY VALUES
// ============================================================================

function testBoundaryValues() {
  console.log('\n[TEST 3] Boundary Values');
  console.log('─'.repeat(70));

  const cases = [
    { name: 'Min retirement age (60)', params: { retirementAge: 60 } },
    { name: 'Max retirement age (75)', params: { retirementAge: 75 } },
    { name: 'Min employment rate (50%)', params: { employmentRate: 0.50 } },
    { name: 'Max employment rate (90%)', params: { employmentRate: 0.90 } },
    { name: 'Min contribution rate (15%)', params: { contributionRate: 0.15 } },
    { name: 'Max contribution rate (30%)', params: { contributionRate: 0.30 } },
    { name: 'Max wage growth (+5%)', params: { wageGrowth: 0.05 } },
    { name: 'Max GDP growth (+5%)', params: { gdpGrowth: 0.05 } },
    { name: 'Max investment return (10%)', params: { investmentReturn: 0.10 } },
    { name: 'Min fertility (0.5 children/woman)', params: { fertilityRate: 0.5 } },
    { name: 'Max fertility (2.5 children/woman)', params: { fertilityRate: 2.5 } },
    { name: 'Max emigration (-10k)', params: { migrationLevel: -10000 } },
    { name: 'Max immigration (+50k)', params: { migrationLevel: 50000 } }
  ];

  cases.forEach(tc => {
    check(tc.name, () => {
      const r = simulation.simulateScenario(tc.params, { horizon: 70 });
      assert(r.years.length === 71, `expected 71 years, got ${r.years.length}`);
      assertFinite(r.employed[70], 'employed (2095)');
      assertFinite(r.pensionAssets[70], 'pensionAssets (2095)');
      // Employed may be zero in extreme edge cases (e.g. retirementAge=60 with
      // initial population having few 15-59 year olds); just ensure no crash.
      assert(typeof r.employed[70] === 'number' && isFinite(r.employed[70]),
        'employed must be finite');
    });
  });

  check('Out-of-range parameter is rejected', () => {
    assert.throws(
      () => simulation.simulateScenario({ retirementAge: 99 }, { horizon: 1 }),
      /Invalid simulation parameters/
    );
  });
}

// ============================================================================
// TEST 4: PARAMETER SENSITIVITY
// ============================================================================

function testParameterSensitivity() {
  console.log('\n[TEST 4] Parameter Sensitivity');
  console.log('─'.repeat(70));

  const base = simulation.simulateScenario({}, { horizon: 70 });
  const last = 70;

  check('Higher retirement age reduces pensioners', () => {
    const r = simulation.simulateScenario({ retirementAge: 65 }, { horizon: 70 });
    assert(r.pensioners[last] < base.pensioners[last],
      `pensioners should fall: ${r.pensioners[last]} vs ${base.pensioners[last]}`);
  });

  check('Higher retirement age increases employed', () => {
    const r = simulation.simulateScenario({ retirementAge: 65 }, { horizon: 70 });
    assert(r.employed[last] > base.employed[last],
      `employed should rise: ${r.employed[last]} vs ${base.employed[last]}`);
  });

  check('Higher contribution rate increases contributions', () => {
    const r = simulation.simulateScenario({ contributionRate: 0.264 }, { horizon: 70 });
    assert(r.contributions[last] > base.contributions[last],
      `contributions should rise: ${r.contributions[last]} vs ${base.contributions[last]}`);
  });

  check('Higher contribution rate improves assets', () => {
    const r = simulation.simulateScenario({ contributionRate: 0.264 }, { horizon: 70 });
    assert(r.pensionAssets[last] > base.pensionAssets[last],
      `assets should rise: ${r.pensionAssets[last]} vs ${base.pensionAssets[last]}`);
  });

  check('Higher employment rate increases employed', () => {
    const r = simulation.simulateScenario({ employmentRate: 0.75 }, { horizon: 70 });
    assert(r.employed[last] > base.employed[last],
      `employed should rise: ${r.employed[last]} vs ${base.employed[last]}`);
  });

  check('Higher employment rate lowers pensioner-worker ratio', () => {
    const r = simulation.simulateScenario({ employmentRate: 0.75 }, { horizon: 70 });
    assert(r.pensionerWorkerRatio[last] < base.pensionerWorkerRatio[last],
      `ratio should fall: ${r.pensionerWorkerRatio[last]} vs ${base.pensionerWorkerRatio[last]}`);
  });

  check('Higher investment return improves assets', () => {
    const r = simulation.simulateScenario({ investmentReturn: 0.04 }, { horizon: 70 });
    assert(r.pensionAssets[last] > base.pensionAssets[last],
      `assets should rise: ${r.pensionAssets[last]} vs ${base.pensionAssets[last]}`);
  });

  check('Higher fertility increases long-run population', () => {
    const r = simulation.simulateScenario({ fertilityRate: 2.0 }, { horizon: 70 });
    const basePop = base.population[last].reduce((a, b) => a + b, 0);
    const rPop = r.population[last].reduce((a, b) => a + b, 0);
    assert(rPop > basePop, `population should rise: ${rPop} vs ${basePop}`);
  });

  check('Higher migration increases population', () => {
    const r = simulation.simulateScenario({ migrationLevel: 50000 }, { horizon: 70 });
    const basePop = base.population[last].reduce((a, b) => a + b, 0);
    const rPop = r.population[last].reduce((a, b) => a + b, 0);
    assert(rPop > basePop, `population should rise: ${rPop} vs ${basePop}`);
  });

  check('Higher wage growth lowers replacement rate (fixed indexation)', () => {
    // Pensions are indexed at pensionIndexation (2%), so faster wage growth
    // makes wages outpace pensions and the replacement rate falls.
    const r = simulation.simulateScenario({ wageGrowth: 0.03 }, { horizon: 70 });
    assert(r.replacementRate[last] < base.replacementRate[last],
      `replacement rate should fall: ${r.replacementRate[last]} vs ${base.replacementRate[last]}`);
  });

  check('Higher pension indexation raises replacement rate', () => {
    const r = simulation.simulateScenario({ pensionIndexation: 0.03 }, { horizon: 70 });
    assert(r.replacementRate[last] > base.replacementRate[last],
      `replacement rate should rise: ${r.replacementRate[last]} vs ${base.replacementRate[last]}`);
  });
}

// ============================================================================
// TEST 5: DATA VALIDATION
// ============================================================================

function testDataValidation() {
  console.log('\n[TEST 5] Data Validation');
  console.log('─'.repeat(70));

  const data = dataLoader.loadProcessedData();

  check('All required series load', () => {
    const errors = dataLoader.validateData(data);
    assert(errors.length === 0, `validation errors: ${errors.join('; ')}`);
  });

  check('Population 2025 matches register total', () => {
    const total = dataLoader.getTotalPopulation(data, 2025);
    assert(total === 5652881, `expected 5652881, got ${total}`);
  });

  check('Mortality rates are probabilities in [0,1]', () => {
    const rates = dataLoader.getMortalityRates(data, 2025);
    Object.entries(rates).forEach(([age, rate]) => {
      assert(rate >= 0 && rate <= 1, `age ${age}: rate ${rate} out of range`);
    });
  });

  check('Fertility rates are per-woman rates', () => {
    const rates = dataLoader.getFertilityRates(data, 2025);
    Object.entries(rates).forEach(([age, rate]) => {
      assert(rate >= 0 && rate < 1, `age ${age}: rate ${rate} out of range`);
    });
  });

  check('Net migration sums to observed total', () => {
    const mig = dataLoader.getNetMigrationByAge(data, 2025);
    const total = Object.values(mig).reduce((a, b) => a + b, 0);
    withinTolerance(total, 31233, 0.01);
  });

  check('Missing data is detected', () => {
    const broken = { ...data };
    delete broken.population;
    const errors = dataLoader.validateData(broken);
    assert(errors.some(e => e.includes('population')), 'missing population not detected');
  });

  check('Provisional years are parsed', () => {
    // GDP 2025 is marked "2025*" in the source
    assert(dataLoader.normalizeYear('2025*') === 2025, 'provisional year not parsed');
  });

  check('Age groups expand correctly', () => {
    assert.deepStrictEqual(dataLoader.expandAgeGroup('30 - 34'), [30, 31, 32, 33, 34]);
    assert(dataLoader.expandAgeGroup('75 -').length === 26, 'open-ended group wrong length');
  });

  check('Observed TFR matches the default parameter', () => {
    const rates = dataLoader.getFertilityRates(data, 2025);
    let tfr = 0;
    for (let age = 15; age <= 49; age++) tfr += rates[age] || 0;
    withinTolerance(tfr, simulation.DEFAULT_PARAMETERS.fertilityRate, 0.02);
  });

  check('Default scenario reproduces the observed TFR', () => {
    // With fertilityRate = observed TFR, the births in 2026 should match a
    // direct sum of age-specific rates over the base-year female population.
    const rates = dataLoader.getFertilityRates(data, 2025);
    const pop = dataLoader.getPopulationByAge(data, 2025);
    const r = simulation.simulateScenario({}, { horizon: 70 });
    // Compare 2026 births (population[1][0]) with the direct calculation.
    const femaleShare = model.FEMALE_SHARE;
    let expected = 0;
    for (let age = 15; age <= 49; age++) {
      expected += (pop[age] || 0) * femaleShare * (rates[age] || 0);
    }
    withinTolerance(r.population[1][0], expected, 0.05);
  });
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          CALIBRATION TEST SUITE - MODEL v0.2.0                    ║');
  console.log('║     Validation against 2025 Finnish Pension System Baseline       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  testBaselineScenario();
  testNumericalStability();
  testBoundaryValues();
  testParameterSensitivity();
  testDataValidation();

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                               ║');
  console.log(`║  Passed: ${String(passCount).padEnd(58)}║`);
  console.log(`║  Failed: ${String(failCount).padEnd(58)}║`);
  console.log('║                                                                    ║');
  console.log('║  NOTE: All tests exercise the real engine against real data.      ║');
  console.log('║  - simulateScenario() → src/simulation.js                         ║');
  console.log('║  - loadProcessedData() → src/data.js                              ║');
  console.log('║  - validateParameters() → src/model.js                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(failCount > 0 ? 1 : 0);
}

runAllTests();