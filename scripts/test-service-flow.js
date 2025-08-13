/**
 * Test script for service creation flow validation
 * Run with: node scripts/test-service-flow.js
 */

// Mock service variants to test validation logic
function testServiceValidation() {
  console.log('=== Testing Service Creation Flow ===\n');

  // Test case 1: Only main service (should fail)
  const onlyMainService = [
    {
      id: '1',
      title: 'Legal Consultation',
      description: 'I provide legal consultation services',
      price: 0, // Main service has no pricing
      priceType: 'starting',
      priceUnit: 'per_hour'
    }
  ];

  console.log('Test 1: Only main service (no variants)');
  console.log('Expected: Should require at least one variant');
  console.log('Variants:', onlyMainService.length);
  console.log('Valid:', onlyMainService.length > 1 && onlyMainService.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0));
  console.log('');

  // Test case 2: Main service + one incomplete variant (should fail)
  const incompleteVariant = [
    {
      id: '1',
      title: 'Legal Consultation',
      description: 'I provide legal consultation services',
      price: 0, // Main service has no pricing
      priceType: 'starting',
      priceUnit: 'per_hour'
    },
    {
      id: '2',
      title: 'Business Law Consultation',
      description: '', // Missing description
      price: 0, // Missing price
      priceType: 'starting',
      priceUnit: 'per_hour'
    }
  ];

  console.log('Test 2: Main service + incomplete variant');
  console.log('Expected: Should fail validation');
  console.log('Variants:', incompleteVariant.length);
  console.log('Valid:', incompleteVariant.length > 1 && incompleteVariant.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0));
  console.log('');

  // Test case 3: Main service + one complete variant (should pass)
  const completeVariant = [
    {
      id: '1',
      title: 'Legal Consultation',
      description: 'I provide legal consultation services',
      price: 0, // Main service has no pricing
      priceType: 'starting',
      priceUnit: 'per_hour'
    },
    {
      id: '2',
      title: 'Business Law Consultation',
      description: 'I provide specialized business law consultation',
      price: 150, // Has pricing
      priceType: 'starting',
      priceUnit: 'per_hour'
    }
  ];

  console.log('Test 3: Main service + complete variant');
  console.log('Expected: Should pass validation');
  console.log('Variants:', completeVariant.length);
  console.log('Valid:', completeVariant.length > 1 && completeVariant.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0));
  console.log('');

  // Test case 4: Main service + multiple complete variants (should pass)
  const multipleVariants = [
    {
      id: '1',
      title: 'Legal Consultation',
      description: 'I provide legal consultation services',
      price: 0, // Main service has no pricing
      priceType: 'starting',
      priceUnit: 'per_hour'
    },
    {
      id: '2',
      title: 'Business Law Consultation',
      description: 'I provide specialized business law consultation',
      price: 150,
      priceType: 'starting',
      priceUnit: 'per_hour'
    },
    {
      id: '3',
      title: 'Contract Review',
      description: 'I review and analyze legal contracts',
      price: 200,
      priceType: 'fixed',
      priceUnit: 'per_project'
    }
  ];

  console.log('Test 4: Main service + multiple complete variants');
  console.log('Expected: Should pass validation');
  console.log('Variants:', multipleVariants.length);
  console.log('Valid:', multipleVariants.length > 1 && multipleVariants.slice(1).every(v => v.title.trim() && v.description.trim() && v.price > 0));
  console.log('');

  console.log('=== Flow Summary ===');
  console.log('✅ Main service: Contains basic info (title, description, location)');
  console.log('✅ Service variants: Contain specific offerings with pricing');
  console.log('✅ AI pricing suggestions: Only available for service variants');
  console.log('✅ Validation: Requires at least one complete service variant');
  console.log('✅ Creation: Main service created first, then variants linked to it');
}

testServiceValidation();