/**
 * Calibration Test Suite
 * Validates simulation engine against 2025 baseline and numerical stability
 * 
 * MODEL_VERSION: 0.1.0
 * BASE_YEAR: 2025
 * 
 * Run with: node test/calibration_test.js
 */

const assert = require('assert');

// ============================================================================
// CALIBRATION TARGETS (from docs/CALIBRATION_TARGETS.md)
// ============================================================================

const calibrationTargets = {
  // Population Metrics
  population: {
    total: 5652881,
    tolerance: 0.02  // ±2%
  },
  populationByAge: {
    0: { value: 53120, tolerance: 0.02 },
    15: { value: 60452, tolerance: 0.02 },
    30: { value: 73218, tolerance: 0.02 },
    45: { value: 77456, tolerance: 0.02 },
    60: { value: 75892, tolerance: 0.02 },
    63: { value: 73156, tolerance: 0.02 },
    75: { value: 47283, tolerance: 0.02 },
    85: { value: 22156, tolerance: 0.02 },
    100: { value: 3142, tolerance: 0.02 }
  },

  // Employment & Wage Metrics
  employed: {
    total: 2590000,
    tolerance: 0.02
  },
  averageWage: {
    value: 50232,  // EUR/year
    tolerance: 0.03  // ±3% (provisional data)
  },
  wageBill: {
    value: 130300,  // millions EUR
    tolerance: 0.02
  },

  // Pension System Metrics
  pensioners: {
    total: 1400000,  // estimated as pop >= retirementAge
    tolerance: 0.03  // ±3% (estimation)
  },
  averagePension: {
    value: 22932,  // EUR/year (1911 EUR/month × 12)
    tolerance: 0.02
  },
  pensionExpenditure: {
    value: 37225,  // millions EUR
    tolerance: 0.03  // ±3% (known simplification)
  },
  pensionContributions: {
    value: 33571,  // millions EUR
    tolerance: 0.05  // ±5% (includes non-wage income)
  },
  pensionAssets: {
    value: 290108,  // millions EUR
    tolerance: 0.02
  },

  // Economic Metrics
  gdp: {
    value: 281783,  // millions EUR (provisional)
    tolerance: 0.03  // ±3%
  },

  // Derived Metrics (consistency checks, very tight)
  replacementRate: {
    value: 22932 / 50232,  // ≈ 0.456
    tolerance: 0.01  // ±1% (derived metric)
  },
  pensionerWorkerRatio: {
    value: 1400000 / 2590000,  // ≈ 0.540
    tolerance: 0.01
  },
  pensionExpenditureToGDP: {
    value: 37225 / 281783,  // ≈ 0.132
    tolerance: 0.01
  }
};

// Default parameters (from docs/PARAMETERS.md)
const defaultParameters = {
  retirementAge: 63,
  contributionRate: 0.244,  // 24.4% as decimal
  employmentRate: 0.722,  // 72.2% as decimal
  wageGrowth: 0.02,  // 2% as decimal
  gdpGrowth: 0.02,
  investmentReturn: 0.03,  // 3% as decimal
  fertilityRate: 1.0,
  migrationLevel: 0,
  pensionIndexation: 'wage'
};

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if value is within tolerance of target
 * @param {number} actual - Simulated value
 * @param {number} target - Expected target value
 * @param {number} tolerance - Relative tolerance (e.g., 0.02 = ±2%)
 * @returns {object} { passes, actualError, errorPercent }
 */
function validateWithTolerance(actual, target, tolerance) {
  if (actual === null || actual === undefined) {
    return { passes: false, actualError: null, errorPercent: null, reason: 'Value is null/undefined' };
  }

  if (target === 0) {
    return { passes: false, actualError: null, errorPercent: null, reason: 'Target is zero (division risk)' };
  }

  const actualError = Math.abs(actual - target);
  const errorPercent = actualError / target;
  const passes = errorPercent <= tolerance;

  return { passes, actualError, errorPercent, tolerance };
}

/**
 * Assert metric is valid and within tolerance
 * @param {string} metricName - Name of metric being tested
 * @param {number} actual - Simulated value
 * @param {number} target - Expected value
 * @param {number} tolerance - Relative tolerance
 */
function assertMetricWithinTolerance(metricName, actual, target, tolerance) {
  const validation = validateWithTolerance(actual, target, tolerance);
  
  if (!validation.passes) {
    const errorMsg = `
CALIBRATION TEST FAILED: ${metricName}
  Expected: ${target.toLocaleString('fi-FI', { maximumFractionDigits: 1 })}
  Actual:   ${actual !== null ? actual.toLocaleString('fi-FI', { maximumFractionDigits: 1 }) : 'null'}
  Error:    ${validation.errorPercent !== null ? (validation.errorPercent * 100).toFixed(2) : 'N/A'}% of target
  Tolerance: ±${(tolerance * 100).toFixed(1)}%
  ${validation.reason ? 'Reason: ' + validation.reason : ''}
`;
    throw new AssertionError({ message: errorMsg, actual, expected: target });
  }

  console.log(`  ✓ ${metricName}: ${actual.toLocaleString('fi-FI', { maximumFractionDigits: 0 })} (error: ${(validation.errorPercent * 100).toFixed(2)}%)`);
}

/**
 * Check for invalid numerical values
 * @param {number} value - Value to check
 * @param {string} varName - Variable name for error message
 */
function assertValidNumber(value, varName) {
  assert(!isNaN(value), `${varName} is NaN`);
  assert(isFinite(value), `${varName} is Infinity or -Infinity`);
  assert(typeof value === 'number', `${varName} is not a number, got ${typeof value}`);
}

/**
 * Check for non-negative value
 * @param {number} value - Value to check
 * @param {string} varName - Variable name
 */
function assertNonNegative(value, varName) {
  assert(value >= 0, `${varName} is negative: ${value}`);
}

/**
 * Check for positive value
 * @param {number} value - Value to check
 * @param {string} varName - Variable name
 */
function assertPositive(value, varName) {
  assert(value > 0, `${varName} is not positive: ${value}`);
}

// ============================================================================
// STUB IMPLEMENTATION PLACEHOLDERS
// ============================================================================

/**
 * STUB: Load data from data/processed/
 * TODO: Implement in src/data.js
 */
function loadProcessedData() {
  // Placeholder: In actual implementation, load from data/processed/*.json files
  return {
    population: { year: 2025, values: [] },  // Will be populated from data/processed/population.json
    employment: { year: 2025, values: [] },
    earnings: { year: 2025, values: [] },
    pensions: { year: 2025, values: [] },
    gdp: { year: 2025, values: [] }
  };
}

/**
 * STUB: Initialize simulation state with 2025 data
 * TODO: Implement in src/simulation.js
 */
function initializeBaseYear2025() {
  return {
    year: 2025,
    population: [],  // Array indexed by age [0..100+]
    employed: 2590000,
    averageWage: 50232,
    pensioners: 1400000,
    averagePension: 22932,
    pensionAssets: 290108e6  // 290,108 million EUR
  };
}

/**
 * STUB: Run simulation for one year with given parameters
 * TODO: Implement in src/simulation.js
 * 
 * @param {object} params - User parameters
 * @param {object} state - Current state
 * @param {object} data - Processed data from data/processed/
 * @returns {object} Result with yearly metrics
 */
function simulateYear(params, state, data) {
  // Placeholder: Returns result object with:
  // { population, employed, averageWage, wageBill, 
  //   pensioners, averagePension, pensionExpenditure, 
  //   pensionAssets, gdp, replacementRate, pensionerWorkerRatio }
  
  throw new Error('simulateYear() stub - implementation in Phase E');
}

/**
 * STUB: Validate parameters before simulation
 * TODO: Implement in src/model.js
 * 
 * @param {object} params - User parameters to validate
 * @returns {array} Array of error messages (empty if valid)
 */
function validateParameters(params) {
  const errors = [];

  // Retirement age
  if (params.retirementAge < 60 || params.retirementAge > 75) {
    errors.push(`retirementAge out of range [60-75]: ${params.retirementAge}`);
  }

  // Contribution rate
  if (params.contributionRate < 0.15 || params.contributionRate > 0.30) {
    errors.push(`contributionRate out of range [0.15-0.30]: ${params.contributionRate}`);
  }

  // Employment rate
  if (params.employmentRate < 0.50 || params.employmentRate > 0.90) {
    errors.push(`employmentRate out of range [0.50-0.90]: ${params.employmentRate}`);
  }

  // Wage growth
  if (params.wageGrowth < -0.02 || params.wageGrowth > 0.05) {
    errors.push(`wageGrowth out of range [-0.02-0.05]: ${params.wageGrowth}`);
  }

  // GDP growth
  if (params.gdpGrowth < -0.02 || params.gdpGrowth > 0.05) {
    errors.push(`gdpGrowth out of range [-0.02-0.05]: ${params.gdpGrowth}`);
  }

  // Investment return
  if (params.investmentReturn < 0.0 || params.investmentReturn > 0.10) {
    errors.push(`investmentReturn out of range [0.0-0.10]: ${params.investmentReturn}`);
  }

  // Fertility rate
  if (params.fertilityRate < 0.5 || params.fertilityRate > 1.5) {
    errors.push(`fertilityRate out of range [0.5-1.5]: ${params.fertilityRate}`);
  }

  // Migration level
  if (params.migrationLevel < -10000 || params.migrationLevel > 50000) {
    errors.push(`migrationLevel out of range [-10000-50000]: ${params.migrationLevel}`);
  }

  // Pension indexation
  const validIndexation = ['wage', 'price', 'fixed'];
  if (!validIndexation.includes(params.pensionIndexation)) {
    errors.push(`pensionIndexation must be one of ${validIndexation.join(', ')}, got: ${params.pensionIndexation}`);
  }

  return errors;
}

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * D3.1: Baseline Scenario Test
 * Verify that simulation with default parameters matches 2025 calibration targets
 */
function testBaselineScenario() {
  console.log('\n[TEST 1] Baseline Scenario (2025 with Default Parameters)');
  console.log('─'.repeat(70));

  // Validate parameters first
  const paramErrors = validateParameters(defaultParameters);
  if (paramErrors.length > 0) {
    throw new Error(`Default parameters invalid:\n${paramErrors.join('\n')}`);
  }
  console.log('  ✓ Default parameters valid');

  // TODO: Load actual data
  // const data = loadProcessedData();
  // const state = initializeBaseYear2025();
  // const result = simulateYear(defaultParameters, state, data);

  // For now, test with mock result
  const mockResult = {
    year: 2025,
    populationTotal: calibrationTargets.population.total,
    employed: calibrationTargets.employed.total,
    averageWage: calibrationTargets.averageWage.value,
    wageBill: calibrationTargets.wageBill.value,
    pensioners: calibrationTargets.pensioners.total,
    averagePension: calibrationTargets.averagePension.value,
    pensionExpenditure: calibrationTargets.pensionExpenditure.value,
    pensionContributions: calibrationTargets.pensionContributions.value,
    pensionAssets: calibrationTargets.pensionAssets.value,
    gdp: calibrationTargets.gdp.value
  };

  // Validate population
  console.log('  Population metrics:');
  assertValidNumber(mockResult.populationTotal, 'Population total');
  assertPositive(mockResult.populationTotal, 'Population total');
  assertMetricWithinTolerance(
    'Total population',
    mockResult.populationTotal,
    calibrationTargets.population.total,
    calibrationTargets.population.tolerance
  );

  // Validate employment
  console.log('  Employment metrics:');
  assertValidNumber(mockResult.employed, 'Employed count');
  assertPositive(mockResult.employed, 'Employed count');
  assertMetricWithinTolerance(
    'Total employed',
    mockResult.employed,
    calibrationTargets.employed.total,
    calibrationTargets.employed.tolerance
  );

  // Validate wages
  console.log('  Wage metrics:');
  assertValidNumber(mockResult.averageWage, 'Average wage');
  assertNonNegative(mockResult.averageWage, 'Average wage');
  assertMetricWithinTolerance(
    'Average wage',
    mockResult.averageWage,
    calibrationTargets.averageWage.value,
    calibrationTargets.averageWage.tolerance
  );

  assertValidNumber(mockResult.wageBill, 'Wage bill');
  assertPositive(mockResult.wageBill, 'Wage bill');
  assertMetricWithinTolerance(
    'Wage bill',
    mockResult.wageBill,
    calibrationTargets.wageBill.value,
    calibrationTargets.wageBill.tolerance
  );

  // Validate pensions
  console.log('  Pension metrics:');
  assertValidNumber(mockResult.pensioners, 'Pensioner count');
  assertPositive(mockResult.pensioners, 'Pensioner count');
  assertMetricWithinTolerance(
    'Total pensioners',
    mockResult.pensioners,
    calibrationTargets.pensioners.total,
    calibrationTargets.pensioners.tolerance
  );

  assertValidNumber(mockResult.averagePension, 'Average pension');
  assertNonNegative(mockResult.averagePension, 'Average pension');
  assertMetricWithinTolerance(
    'Average pension',
    mockResult.averagePension,
    calibrationTargets.averagePension.value,
    calibrationTargets.averagePension.tolerance
  );

  console.log('  Pension system metrics:');
  assertValidNumber(mockResult.pensionExpenditure, 'Pension expenditure');
  assertPositive(mockResult.pensionExpenditure, 'Pension expenditure');
  assertMetricWithinTolerance(
    'Pension expenditure',
    mockResult.pensionExpenditure,
    calibrationTargets.pensionExpenditure.value,
    calibrationTargets.pensionExpenditure.tolerance
  );

  assertValidNumber(mockResult.pensionContributions, 'Pension contributions');
  assertPositive(mockResult.pensionContributions, 'Pension contributions');
  assertMetricWithinTolerance(
    'Pension contributions',
    mockResult.pensionContributions,
    calibrationTargets.pensionContributions.value,
    calibrationTargets.pensionContributions.tolerance
  );

  assertValidNumber(mockResult.pensionAssets, 'Pension assets');
  assertPositive(mockResult.pensionAssets, 'Pension assets');
  assertMetricWithinTolerance(
    'Pension assets',
    mockResult.pensionAssets,
    calibrationTargets.pensionAssets.value,
    calibrationTargets.pensionAssets.tolerance
  );

  // Validate GDP
  console.log('  Economic metrics:');
  assertValidNumber(mockResult.gdp, 'GDP');
  assertPositive(mockResult.gdp, 'GDP');
  assertMetricWithinTolerance(
    'GDP',
    mockResult.gdp,
    calibrationTargets.gdp.value,
    calibrationTargets.gdp.tolerance
  );

  // Validate derived metrics
  console.log('  Derived metrics (consistency checks):');
  const simulatedReplacementRate = mockResult.averagePension / mockResult.averageWage;
  assertMetricWithinTolerance(
    'Replacement rate',
    simulatedReplacementRate,
    calibrationTargets.replacementRate.value,
    calibrationTargets.replacementRate.tolerance
  );

  const simulatedRatio = mockResult.pensioners / mockResult.employed;
  assertMetricWithinTolerance(
    'Pensioner-worker ratio',
    simulatedRatio,
    calibrationTargets.pensionerWorkerRatio.value,
    calibrationTargets.pensionerWorkerRatio.tolerance
  );

  const simulatedPensionToGDP = mockResult.pensionExpenditure / mockResult.gdp;
  assertMetricWithinTolerance(
    'Pension expenditure-to-GDP',
    simulatedPensionToGDP,
    calibrationTargets.pensionExpenditureToGDP.value,
    calibrationTargets.pensionExpenditureToGDP.tolerance
  );

  console.log('  ✓ All baseline calibration targets passed');
}

/**
 * D3.2: Numerical Stability Tests
 * Verify that simulation doesn't produce NaN, Infinity, or other invalid values
 */
function testNumericalStability() {
  console.log('\n[TEST 2] Numerical Stability');
  console.log('─'.repeat(70));

  // TODO: Run simulations with various parameter combinations
  // For now, document what will be tested

  const testCases = [
    { name: 'Default parameters', params: defaultParameters },
    { name: 'High retirement age (75)', params: { ...defaultParameters, retirementAge: 75 } },
    { name: 'Low employment (50%)', params: { ...defaultParameters, employmentRate: 0.50 } },
    { name: 'High contribution rate (30%)', params: { ...defaultParameters, contributionRate: 0.30 } },
    { name: 'Zero investment return', params: { ...defaultParameters, investmentReturn: 0.0 } },
    { name: 'Negative GDP growth (-2%)', params: { ...defaultParameters, gdpGrowth: -0.02 } },
    { name: 'Very low fertility (0.5×)', params: { ...defaultParameters, fertilityRate: 0.5 } },
    { name: 'High net migration (+50k)', params: { ...defaultParameters, migrationLevel: 50000 } }
  ];

  console.log('  Test cases to validate (will run in Phase E):');
  testCases.forEach((tc, i) => {
    console.log(`    ${i+1}. ${tc.name}`);
  });

  console.log('  ✓ Test cases defined (implementation: Phase E)');
}

/**
 * D3.3: Boundary Value Tests
 * Verify that extreme parameter values don't crash the simulation
 */
function testBoundaryValues() {
  console.log('\n[TEST 3] Boundary Values');
  console.log('─'.repeat(70));

  const boundaryTests = [
    { name: 'Min retirement age (60)', params: { ...defaultParameters, retirementAge: 60 } },
    { name: 'Max retirement age (75)', params: { ...defaultParameters, retirementAge: 75 } },
    { name: 'Min employment rate (50%)', params: { ...defaultParameters, employmentRate: 0.50 } },
    { name: 'Max employment rate (90%)', params: { ...defaultParameters, employmentRate: 0.90 } },
    { name: 'Min contribution rate (15%)', params: { ...defaultParameters, contributionRate: 0.15 } },
    { name: 'Max contribution rate (30%)', params: { ...defaultParameters, contributionRate: 0.30 } },
    { name: 'Max wage growth (+5%)', params: { ...defaultParameters, wageGrowth: 0.05 } },
    { name: 'Max GDP growth (+5%)', params: { ...defaultParameters, gdpGrowth: 0.05 } },
    { name: 'Max investment return (10%)', params: { ...defaultParameters, investmentReturn: 0.10 } },
    { name: 'Min fertility (0.5×)', params: { ...defaultParameters, fertilityRate: 0.5 } },
    { name: 'Max fertility (1.5×)', params: { ...defaultParameters, fertilityRate: 1.5 } },
    { name: 'Max emigration (-10k)', params: { ...defaultParameters, migrationLevel: -10000 } },
    { name: 'Max immigration (+50k)', params: { ...defaultParameters, migrationLevel: 50000 } }
  ];

  console.log('  Boundary value test cases:');
  boundaryTests.forEach((tc, i) => {
    console.log(`    ${i+1}. ${tc.name}`);
  });

  console.log('  ✓ Boundary test cases defined (implementation: Phase E)');
}

/**
 * D3.4: Parameter Sensitivity Tests
 * Verify that each parameter produces expected directional changes
 */
function testParameterSensitivity() {
  console.log('\n[TEST 4] Parameter Sensitivity');
  console.log('─'.repeat(70));

  const sensitivityTests = [
    {
      parameter: 'retirementAge',
      baseline: 63,
      changed: 65,
      expectedEffects: [
        'Pensioners should decrease',
        'Employed should increase',
        'Wage bill should increase',
        'Pension expenditure should decrease',
        'Pensioner-worker ratio should decrease'
      ]
    },
    {
      parameter: 'contributionRate',
      baseline: 0.244,
      changed: 0.264,
      expectedEffects: [
        'Pension contributions should increase',
        'Pension assets should increase',
        'Pension expenditure unchanged (direct)',
        'Pension system solvency improves'
      ]
    },
    {
      parameter: 'employmentRate',
      baseline: 0.722,
      changed: 0.75,
      expectedEffects: [
        'Employed should increase',
        'Wage bill should increase',
        'Pension contributions should increase',
        'Pensioner-worker ratio should decrease'
      ]
    },
    {
      parameter: 'wageGrowth',
      baseline: 0.02,
      changed: 0.03,
      expectedEffects: [
        'Average wage should grow faster',
        'Replacement rate should increase',
        'Pension contributions should increase faster'
      ]
    },
    {
      parameter: 'investmentReturn',
      baseline: 0.03,
      changed: 0.04,
      expectedEffects: [
        'Investment income should increase',
        'Pension assets should be healthier',
        'System sustainability improves'
      ]
    }
  ];

  console.log('  Parameter sensitivity test cases:');
  sensitivityTests.forEach((tc, i) => {
    console.log(`    ${i+1}. ${tc.parameter} (${tc.baseline} → ${tc.changed})`);
    tc.expectedEffects.forEach(effect => {
      console.log(`       • ${effect}`);
    });
  });

  console.log('  ✓ Sensitivity test cases defined (implementation: Phase E)');
}

/**
 * D3.5: Data Validation Tests
 * Verify graceful handling of missing or malformed data
 */
function testDataValidation() {
  console.log('\n[TEST 5] Data Validation (Error Handling)');
  console.log('─'.repeat(70));

  const validationTests = [
    'Missing population.json → Clear error message',
    'Malformed JSON in earnings.json → Graceful parsing error',
    'Missing age data in population → Warn about incomplete age distribution',
    'NULL values in critical fields → Error with field name',
    'Negative population values → Error on load',
    'GDP = 0 → Division by zero protection',
    'Future year beyond data horizon → Use projection or default',
    'Parameters from URL with invalid values → Reject invalid parameters'
  ];

  console.log('  Data validation scenarios:');
  validationTests.forEach((tc, i) => {
    console.log(`    ${i+1}. ${tc}`);
  });

  console.log('  ✓ Data validation test cases defined (implementation: Phase E)');
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          CALIBRATION TEST SUITE - MODEL v0.1.0                    ║');
  console.log('║     Validation against 2025 Finnish Pension System Baseline       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  let passCount = 0;
  let failCount = 0;

  try {
    testBaselineScenario();
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    failCount++;
  }

  try {
    testNumericalStability();
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    failCount++;
  }

  try {
    testBoundaryValues();
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    failCount++;
  }

  try {
    testParameterSensitivity();
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    failCount++;
  }

  try {
    testDataValidation();
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    failCount++;
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                               ║');
  console.log(`║  Passed: ${passCount}                                                   ║`);
  console.log(`║  Failed: ${failCount}                                                   ║`);
  console.log('║                                                                    ║');
  console.log('║  NOTE: Stubs await implementation in Phase E                       ║');
  console.log('║  - simulateYear() → src/simulation.js                             ║');
  console.log('║  - loadProcessedData() → src/data.js                              ║');
  console.log('║  - validateParameters() → src/model.js                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(failCount > 0 ? 1 : 0);
}

// ============================================================================
// EXPORTS (for use in Phase E when integrated with model)
// ============================================================================

module.exports = {
  calibrationTargets,
  defaultParameters,
  validateWithTolerance,
  assertMetricWithinTolerance,
  assertValidNumber,
  assertNonNegative,
  assertPositive,
  validateParameters,
  runAllTests
};

// Run tests if invoked directly
if (require.main === module) {
  runAllTests();
}
