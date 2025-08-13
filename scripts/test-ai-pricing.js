/**
 * Test script for AI pricing suggestions
 * Run with: node scripts/test-ai-pricing.js
 */

// Mock the AI service for testing
class MockAIService {
  static async generatePricingSuggestions(serviceTitle, serviceDescription, priceUnit, industry) {
    console.log('Testing AI Pricing Suggestions...');
    console.log('Service Title:', serviceTitle);
    console.log('Service Description:', serviceDescription);
    console.log('Price Unit:', priceUnit);
    console.log('Industry:', industry);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response based on service type
    let suggestions;
    
    if (serviceTitle.toLowerCase().includes('consultation')) {
      suggestions = {
        low: 80,
        medium: 150,
        high: 250,
        reasoning: "Legal consultation rates in Malaysia typically range from RM 80-250 per hour based on experience and specialization."
      };
    } else if (serviceTitle.toLowerCase().includes('cleaning')) {
      suggestions = {
        low: 25,
        medium: 40,
        high: 60,
        reasoning: "House cleaning services in Malaysia generally charge RM 25-60 per hour depending on service scope and location."
      };
    } else if (serviceTitle.toLowerCase().includes('tutoring')) {
      suggestions = {
        low: 30,
        medium: 50,
        high: 80,
        reasoning: "Private tutoring rates in Malaysia vary from RM 30-80 per hour based on subject complexity and tutor qualifications."
      };
    } else {
      suggestions = {
        low: 50,
        medium: 100,
        high: 200,
        reasoning: "General service rates in Malaysia typically range from RM 50-200 per hour based on complexity and expertise required."
      };
    }
    
    return {
      success: true,
      suggestions
    };
  }
}

// Test cases
async function runTests() {
  console.log('=== AI Pricing Suggestions Test ===\n');
  
  const testCases = [
    {
      title: 'Legal Consultation',
      description: 'I provide comprehensive legal consultation services for business and personal matters. I have 5+ years of experience in corporate law.',
      priceUnit: 'per_hour',
      industry: 'Professional Services'
    },
    {
      title: 'House Cleaning Service',
      description: 'I offer thorough house cleaning services including kitchen, bathroom, and living areas. I use eco-friendly products.',
      priceUnit: 'per_hour',
      industry: 'Cleaning Services'
    },
    {
      title: 'Math Tutoring',
      description: 'I provide personalized math tutoring for high school students. I specialize in algebra and calculus.',
      priceUnit: 'per_session',
      industry: 'Education & Training'
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`--- Test Case ${i + 1} ---`);
    
    try {
      const result = await MockAIService.generatePricingSuggestions(
        testCase.title,
        testCase.description,
        testCase.priceUnit,
        testCase.industry
      );
      
      if (result.success) {
        console.log('✅ Success!');
        console.log('Pricing Suggestions:');
        console.log(`  Budget-Friendly: RM ${result.suggestions.low}`);
        console.log(`  Market Average: RM ${result.suggestions.medium}`);
        console.log(`  Premium: RM ${result.suggestions.high}`);
        console.log(`  Reasoning: ${result.suggestions.reasoning}`);
      } else {
        console.log('❌ Failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('');
  }
  
  console.log('=== Test Complete ===');
}

// Run the tests
runTests().catch(console.error);