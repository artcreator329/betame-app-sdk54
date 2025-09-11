#!/usr/bin/env node

/**
 * Test script for AI image generation functionality
 * This script tests the complete AI image generation and upload flow
 */

const { GeminiImageService } = require('../lib/gemini-image-service');

// Load environment variables
require('dotenv').config();

async function testAIImageGeneration() {
  console.log('🎨 Testing AI Image Generation Functionality\n');

  try {
    // Test configuration
    const testOptions = {
      serviceTitle: 'Test EV Home Charger',
      serviceDescription: 'Professional installation of electric vehicle charging stations for residential properties',
      serviceCategory: 'Automotive',
      style: 'professional'
    };

    console.log('🔧 Test Configuration:');
    console.log('   Service Title:', testOptions.serviceTitle);
    console.log('   Description:', testOptions.serviceDescription);
    console.log('   Category:', testOptions.serviceCategory);
    console.log('   Style:', testOptions.style);
    console.log('');

    // Check API key
    if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      console.error('❌ Error: EXPO_PUBLIC_GEMINI_API_KEY not found in environment variables');
      console.log('Please add your Gemini API key to your .env file:');
      console.log('EXPO_PUBLIC_GEMINI_API_KEY=<REDACTED>
      return;
    }

    console.log('✅ Gemini API key found');
    console.log('');

    // Test image generation
    console.log('🎨 Starting AI image generation...');
    const startTime = Date.now();
    
    const result = await GeminiImageService.generateServiceImage(testOptions);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Generation completed in ${duration}ms`);
    console.log('');

    // Check result
    if (result.success) {
      console.log('🎉 AI Image Generation: SUCCESS');
      console.log('   Image URL:', result.imageUrl);
      console.log('   Image Data Size:', result.imageData ? `${result.imageData.length} characters` : 'Not available');
      
      // Test URL accessibility
      if (result.imageUrl) {
        console.log('');
        console.log('🔗 Testing generated image URL...');
        try {
          const urlTest = await fetch(result.imageUrl, { method: 'HEAD' });
          if (urlTest.ok) {
            console.log('✅ Generated image URL is accessible');
            console.log('   Content Type:', urlTest.headers.get('content-type'));
            console.log('   Content Length:', urlTest.headers.get('content-length'), 'bytes');
          } else {
            console.log('❌ Generated image URL is not accessible');
            console.log('   Status:', urlTest.status, urlTest.statusText);
          }
        } catch (error) {
          console.log('❌ Error testing image URL:', error.message);
        }
      }
      
    } else {
      console.log('❌ AI Image Generation: FAILED');
      console.log('   Error:', result.error);
      
      // Provide troubleshooting suggestions
      console.log('');
      console.log('🔧 Troubleshooting suggestions:');
      if (result.error?.includes('API key')) {
        console.log('   - Verify your Gemini API key is correct');
        console.log('   - Check if the API key has proper permissions');
      } else if (result.error?.includes('Network')) {
        console.log('   - Check your internet connection');
        console.log('   - Try again in a few minutes');
      } else if (result.error?.includes('Storage')) {
        console.log('   - Run: node scripts/test-storage-upload.js');
        console.log('   - Check Supabase storage configuration');
      } else {
        console.log('   - Check console logs for detailed error information');
        console.log('   - Verify all environment variables are set correctly');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testAIImageGeneration().catch(console.error);