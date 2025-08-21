/**
 * Test script for yearly pricing unit
 * Run with: node scripts/test-yearly-pricing.js
 */

// Test the pricing unit functions
function testPriceUnitLabel() {
  console.log('=== Testing Price Unit Labels ===\n');
  
  const getPriceUnitLabel = (unit) => {
    const unitLabels = {
      'per_hour': 'per hour',
      'per_day': 'per day',
      'per_week': 'per week',
      'per_month': 'per month',
      'per_year': 'per year',
      'per_item': 'per item',
      'per_project': 'per project',
      'per_session': 'per session',
      'one_time': '',
    };
    return unitLabels[unit] || '';
  };

  const testUnits = [
    'per_hour',
    'per_day', 
    'per_week',
    'per_month',
    'per_year', // New unit
    'per_item',
    'per_project',
    'per_session',
    'one_time'
  ];

  testUnits.forEach(unit => {
    const label = getPriceUnitLabel(unit);
    console.log(`${unit} -> "${label}"`);
  });
}

function testPriceUnitContext() {
  console.log('\n=== Testing Price Unit Context ===\n');
  
  const getPriceUnitContext = (priceUnit) => {
    const unitContexts = {
      'per_hour': 'hourly rate',
      'per_day': 'daily rate',
      'per_week': 'weekly rate',
      'per_month': 'monthly rate',
      'per_year': 'yearly rate',
      'per_item': 'per item/unit pricing',
      'per_project': 'per project pricing',
      'per_session': 'per session pricing',
      'one_time': 'one-time service pricing',
    };
    return unitContexts[priceUnit] || 'service pricing';
  };

  const testUnits = [
    'per_hour',
    'per_month',
    'per_year', // New unit
    'per_project'
  ];

  testUnits.forEach(unit => {
    const context = getPriceUnitContext(unit);
    console.log(`${unit} -> "${context}"`);
  });
}

function testFallbackPricing() {
  console.log('\n=== Testing Fallback Pricing Multipliers ===\n');
  
  const multipliers = {
    'per_hour': 1,
    'per_day': 8,
    'per_week': 35,
    'per_month': 140,
    'per_year': 1680, // 140 * 12 months
    'per_session': 1.5,
    'per_project': 10,
    'per_item': 0.5,
    'one_time': 5,
  };

  const basePrices = { low: 50, medium: 100, high: 200 };

  console.log('Base hourly prices:', basePrices);
  console.log('');

  Object.entries(multipliers).forEach(([unit, multiplier]) => {
    const adjustedPrices = {
      low: Math.round(basePrices.low * multiplier),
      medium: Math.round(basePrices.medium * multiplier),
      high: Math.round(basePrices.high * multiplier)
    };
    
    console.log(`${unit} (x${multiplier}):`);
    console.log(`  Low: RM ${adjustedPrices.low}`);
    console.log(`  Medium: RM ${adjustedPrices.medium}`);
    console.log(`  High: RM ${adjustedPrices.high}`);
    console.log('');
  });
}

function testYearlyPricingExamples() {
  console.log('=== Yearly Pricing Examples ===\n');
  
  const services = [
    {
      name: 'Software Maintenance',
      hourly: { low: 100, medium: 200, high: 400 }
    },
    {
      name: 'Accounting Services',
      hourly: { low: 80, medium: 150, high: 300 }
    },
    {
      name: 'Consulting Services',
      hourly: { low: 120, medium: 250, high: 500 }
    }
  ];

  services.forEach(service => {
    const yearly = {
      low: Math.round(service.hourly.low * 1680),
      medium: Math.round(service.hourly.medium * 1680),
      high: Math.round(service.hourly.high * 1680)
    };
    
    console.log(`${service.name}:`);
    console.log(`  Hourly: RM ${service.hourly.low} - RM ${service.hourly.high}`);
    console.log(`  Yearly: RM ${yearly.low.toLocaleString()} - RM ${yearly.high.toLocaleString()}`);
    console.log('');
  });
}

// Run all tests
console.log('🧪 Testing Yearly Pricing Unit Implementation\n');

testPriceUnitLabel();
testPriceUnitContext();
testFallbackPricing();
testYearlyPricingExamples();

console.log('✅ All tests completed!');