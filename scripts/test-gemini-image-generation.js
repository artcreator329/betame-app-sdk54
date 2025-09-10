#!/usr/bin/env node

/**
 * Test script for Gemini AI Image Generation
 * 
 * This script tests the Gemini image generation service to ensure
 * it's working correctly before deployment.
 * 
 * Usage: node scripts/test-gemini-image-generation.js
 */

// Load environment variables
require('dotenv').config();
const fetch = require('node-fetch');

// Test configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

// Test service data
const testService = {
  title: "Professional Photography Services",
  description: "High-quality portrait and event photography with professional equipment and editing",
  category: "Photography",
  style: "professional",
  aspectRatio: "square"
};

async function testGeminiImageGeneration() {
  console.log('🎨 Testing Gemini AI Image Generation...\n');

  // Check API key
  if (!GEMINI_API_KEY) {
    console.error('❌ Error: EXPO_PUBLIC_GEMINI_API_KEY not found in environment variables');
    console.log('Please add your Gemini API key to your .env file:');
    console.log('EXPO_PUBLIC_GEMINI_API_KEY=<REDACTED>
    process.exit(1);
  }

  console.log('✅ API key found');
  console.log(`📝 Testing with service: "${testService.title}"`);
  console.log(`📄 Description: "${testService.description}"`);
  console.log(`🎨 Style: ${testService.style}`);
  console.log(`📐 Format: ${testService.aspectRatio}\n`);

  try {
    // Create test prompt
    const prompt = createTestPrompt(testService);
    console.log('📋 Generated prompt:');
    console.log(prompt.substring(0, 200) + '...\n');

    // Make API request
    console.log('🚀 Sending request to Gemini API...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt }
          ]
        }]
      }),
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:');
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ API request successful');

    // Check response structure
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      console.log(`📦 Response contains ${parts.length} parts`);

      let imageFound = false;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          imageFound = true;
          const imageSize = part.inlineData.data.length;
          console.log(`🖼️  Image data received: ${Math.round(imageSize / 1024)}KB`);
          break;
        }
      }

      if (imageFound) {
        console.log('✅ Image generation successful!');
        console.log('🎉 Gemini AI Image Generation is working correctly');
      } else {
        console.log('⚠️  No image data found in response');
        console.log('Response structure:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('⚠️  Unexpected response structure');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    process.exit(1);
  }
}

function createTestPrompt(service) {
  const { title, description, category, style, aspectRatio } = service;

  let prompt = `Create a high-quality, professional service card image for "${title}". `;
  
  if (description) {
    prompt += `Service description: "${description}". `;
  }

  if (category) {
    prompt += `Service category: ${category}. `;
  }

  // Add style instructions
  const styleInstructions = {
    professional: 'Use a clean, professional design with modern typography and subtle colors. Focus on trust and reliability.',
    creative: 'Use vibrant colors, creative layouts, and artistic elements. Make it eye-catching and innovative.',
    minimalist: 'Use minimal design with lots of white space, simple shapes, and clean typography. Focus on simplicity and elegance.',
    vibrant: 'Use bold, bright colors and dynamic compositions. Make it energetic and attention-grabbing.'
  };

  prompt += styleInstructions[style] + ' ';

  // Add aspect ratio instructions
  const aspectRatioInstructions = {
    square: 'Create a square image (1:1 aspect ratio) suitable for service cards and social media.',
    landscape: 'Create a landscape image (16:9 aspect ratio) suitable for banners and headers.',
    portrait: 'Create a portrait image (3:4 aspect ratio) suitable for mobile displays.'
  };

  prompt += aspectRatioInstructions[aspectRatio] + ' ';

  // Add final requirements
  prompt += `The image should be suitable for a service marketplace platform. Include relevant visual elements that represent the service type. Use high contrast and clear visual hierarchy. Avoid any text overlays as this will be added separately. The image should be 1024x1024 pixels for optimal quality.`;

  return prompt;
}

// Run the test
if (require.main === module) {
  testGeminiImageGeneration()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGeminiImageGeneration };
