const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock DeepLinkService for testing
class MockDeepLinkService {
  static handleIncomingLink(url) {
    try {
      const parsedUrl = new URL(url);
      console.log('🔗 Parsing URL:', url);
      console.log('   - Protocol:', parsedUrl.protocol);
      console.log('   - Hostname:', parsedUrl.hostname);
      console.log('   - Pathname:', parsedUrl.pathname);
      console.log('   - Search params:', parsedUrl.searchParams.toString());

      // Handle deep link scheme (betame://)
      if (parsedUrl.protocol === 'betame:') {
        // For betame:// URLs, the hostname becomes the first path segment
        const hostname = parsedUrl.hostname;
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        console.log('   - Hostname:', hostname);
        console.log('   - Path segments:', pathSegments);

        // Handle referral links (betame://install?ref=CODE or betame://ref?ref=CODE)
        if (hostname === 'install' || hostname === 'ref') {
          const referralCode = parsedUrl.searchParams.get('ref');
          if (referralCode) {
            return {
              type: 'referral',
              params: {
                referralCode: referralCode.toUpperCase()
              }
            };
          }
        }

        // Legacy support for path-based deep links
        if (pathSegments[0] === 'install' || pathSegments[0] === 'ref') {
          const referralCode = parsedUrl.searchParams.get('ref');
          if (referralCode) {
            return {
              type: 'referral',
              params: {
                referralCode: referralCode.toUpperCase()
              }
            };
          }
        }
      }

      // Handle universal links (https://betame.com.my)
      if (parsedUrl.hostname === 'betame.com.my') {
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
        console.log('   - Path segments:', pathSegments);

        if (pathSegments[0] === 'install') {
          const referralCode = parsedUrl.searchParams.get('ref');
          if (referralCode) {
            return {
              type: 'referral',
              params: {
                referralCode: referralCode.toUpperCase()
              }
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }
}

async function testReferralDeepLinking() {
  console.log('🧪 Testing Referral Deep Linking\n');

  try {
    // Get a test referral code
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('referral_code, user_id')
      .limit(1)
      .single();

    if (!referralCode) {
      console.log('❌ No referral codes found in database');
      return;
    }

    console.log(`📋 Test referral code: ${referralCode.referral_code}`);
    console.log(`👤 Referrer user ID: ${referralCode.user_id}\n`);

    // Test different URL formats
    const testUrls = [
      // Deep link format
      `betame://install?ref=${referralCode.referral_code}`,
      `betame://ref?ref=${referralCode.referral_code}`,
      
      // Universal link format
      `https://betame.com.my/install?ref=${referralCode.referral_code}`,
      
      // Alternative formats
      `https://betame.com.my/install?ref=${referralCode.referral_code.toLowerCase()}`,
      `https://betame.com.my/install?ref=${referralCode.referral_code}&utm_source=share`,
    ];

    console.log('🔗 Testing URL formats:\n');

    testUrls.forEach((url, index) => {
      console.log(`${index + 1}. Testing: ${url}`);
      
      const result = MockDeepLinkService.handleIncomingLink(url);
      
      if (result && result.type === 'referral') {
        console.log(`   ✅ SUCCESS - Detected referral code: ${result.params.referralCode}`);
        
        if (result.params.referralCode === referralCode.referral_code.toUpperCase()) {
          console.log(`   ✅ MATCH - Referral code matches expected value`);
        } else {
          console.log(`   ❌ MISMATCH - Expected: ${referralCode.referral_code.toUpperCase()}, Got: ${result.params.referralCode}`);
        }
      } else {
        console.log(`   ❌ FAILED - No referral code detected`);
      }
      
      console.log('');
    });

    // Test invalid URLs
    console.log('🚫 Testing invalid URLs:\n');
    
    const invalidUrls = [
      'https://betame.com.my/install',  // No ref parameter
      'https://betame.com.my/install?ref=',  // Empty ref parameter
      'https://example.com/install?ref=ABC123',  // Wrong domain
      'betame://profile/123',  // Different path
    ];

    invalidUrls.forEach((url, index) => {
      console.log(`${index + 1}. Testing invalid: ${url}`);
      
      const result = MockDeepLinkService.handleIncomingLink(url);
      
      if (result && result.type === 'referral') {
        console.log(`   ❌ UNEXPECTED - Should not detect referral code`);
      } else {
        console.log(`   ✅ CORRECT - No referral code detected (as expected)`);
      }
      
      console.log('');
    });

    console.log('🎯 Deep linking test completed!\n');
    
    console.log('📱 Usage Examples:');
    console.log(`   App Link: betame://install?ref=${referralCode.referral_code}`);
    console.log(`   Web Link: https://betame.com.my/install?ref=${referralCode.referral_code}`);
    console.log(`   Share Text: "Join me on BetaMe! Use my referral code ${referralCode.referral_code} or click: https://betame.com.my/install?ref=${referralCode.referral_code}"`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testReferralDeepLinking();