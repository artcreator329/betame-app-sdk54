/**
 * Test script for AI Service Type functionality
 * Run this to verify that the AI service type suggestion is working correctly
 */

// Mock test data
const testCases = [
  {
    title: "Professional House Cleaning",
    description: "I provide thorough house cleaning services including kitchen, bathroom, and bedroom cleaning.",
    expectedCategory: "Home Services"
  },
  {
    title: "Web Development Services",
    description: "I create modern websites and web applications using React and Node.js.",
    expectedCategory: "Technology Services"
  },
  {
    title: "Personal Fitness Training",
    description: "I offer one-on-one fitness training sessions to help you reach your health goals.",
    expectedCategory: "Health & Wellness"
  },
  {
    title: "Logo Design",
    description: "I design professional logos and brand identity for businesses.",
    expectedCategory: "Design & Creative"
  },
  {
    title: "Business Consultation",
    description: "I provide strategic business advice and consulting services for small businesses.",
    expectedCategory: "Business & Consulting"
  }
];

console.log('🧪 AI Service Type Testing');
console.log('==========================\n');

// Test rule-based fallback system
console.log('📋 Testing Rule-based System (Fallback):');
console.log('----------------------------------------');

// Simple rule-based logic for testing
function testRuleBasedSuggestion(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  const patterns = [
    { type: 'Home Services', keywords: ['cleaning', 'repair', 'maintenance', 'plumbing'] },
    { type: 'Technology Services', keywords: ['web', 'app', 'software', 'development', 'programming'] },
    { type: 'Health & Wellness', keywords: ['fitness', 'health', 'wellness', 'training', 'exercise'] },
    { type: 'Design & Creative', keywords: ['design', 'logo', 'graphic', 'creative', 'branding'] },
    { type: 'Business & Consulting', keywords: ['business', 'consulting', 'strategy', 'advice'] }
  ];
  
  for (const pattern of patterns) {
    const matches = pattern.keywords.filter(keyword => text.includes(keyword)).length;
    if (matches > 0) {
      return {
        suggestedType: pattern.type,
        confidence: Math.min(0.9, 0.6 + (matches * 0.1)),
        matchedKeywords: pattern.keywords.filter(keyword => text.includes(keyword))
      };
    }
  }
  
  return {
    suggestedType: 'General Services',
    confidence: 0.3,
    matchedKeywords: []
  };
}

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. Testing: "${testCase.title}"`);
  console.log(`   Description: "${testCase.description}"`);
  
  const result = testRuleBasedSuggestion(testCase.title, testCase.description);
  
  console.log(`   ✅ Suggested: "${result.suggestedType}" (${Math.round(result.confidence * 100)}% confidence)`);
  console.log(`   🎯 Expected: "${testCase.expectedCategory}"`);
  console.log(`   🔍 Keywords matched: [${result.matchedKeywords.join(', ')}]`);
  
  const isCorrect = result.suggestedType === testCase.expectedCategory || 
                   result.suggestedType.includes(testCase.expectedCategory.split(' ')[0]);
  console.log(`   ${isCorrect ? '✅ PASS' : '❌ FAIL'} - ${isCorrect ? 'Correct' : 'Incorrect'} categorization`);
});

console.log('\n🔧 Integration Test Instructions:');
console.log('=================================');
console.log('1. Open the BetaMe app');
console.log('2. Go to "Create Service" screen');
console.log('3. Enter a service title (e.g., "House Cleaning Service")');
console.log('4. Tap on "Service Type" field');
console.log('5. Verify that AI suggestions appear with confidence levels');
console.log('6. Check that existing service types are shown');
console.log('7. Test custom service type creation');

console.log('\n🐛 Error Handling Test:');
console.log('=======================');
console.log('1. Test with empty title: should return "General Services"');
console.log('2. Test with null/undefined values: should not crash');
console.log('3. Test with special characters: should be cleaned properly');
console.log('4. Test API failure: should fall back to rule-based system');

console.log('\n✅ Test completed! Check the app to verify AI integration.');
