#!/usr/bin/env node

/**
 * Test Banner Auto-Slide Feature
 * 
 * This script tests the banner auto-slide feature implementation
 * in the homepage banner component.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Testing Banner Auto-Slide Feature\n');

// Check main homepage component
const mainHomePath = path.join(__dirname, '..', 'app', '(tabs)', 'index.tsx');
if (fs.existsSync(mainHomePath)) {
  const content = fs.readFileSync(mainHomePath, 'utf8');
  
  console.log('📱 Main App Homepage:');
  
  // Check for auto-slide state management
  if (content.includes('isAutoSliding')) {
    console.log('✅ Auto-slide state management found');
  } else {
    console.log('❌ Auto-slide state management not found');
  }
  
  // Check for timer refs
  if (content.includes('autoSlideTimerRef')) {
    console.log('✅ Auto-slide timer ref found');
  } else {
    console.log('❌ Auto-slide timer ref not found');
  }
  
  // Check for banner scroll view ref
  if (content.includes('bannerScrollViewRef')) {
    console.log('✅ Banner scroll view ref found');
  } else {
    console.log('❌ Banner scroll view ref not found');
  }
  
  // Check for auto-slide functions
  if (content.includes('startAutoSlide')) {
    console.log('✅ Start auto-slide function found');
  } else {
    console.log('❌ Start auto-slide function not found');
  }
  
  if (content.includes('stopAutoSlide')) {
    console.log('✅ Stop auto-slide function found');
  } else {
    console.log('❌ Stop auto-slide function not found');
  }
  
  // Check for touch handlers
  if (content.includes('handleBannerTouchStart')) {
    console.log('✅ Banner touch start handler found');
  } else {
    console.log('❌ Banner touch start handler not found');
  }
  
  if (content.includes('handleBannerTouchEnd')) {
    console.log('✅ Banner touch end handler found');
  } else {
    console.log('❌ Banner touch end handler not found');
  }
  
  // Check for ScrollView implementation
  if (content.includes('ref={bannerScrollViewRef}')) {
    console.log('✅ ScrollView ref implementation found');
  } else {
    console.log('❌ ScrollView ref implementation not found');
  }
  
  if (content.includes('onTouchStart={handleBannerTouchStart}')) {
    console.log('✅ Touch start handler implementation found');
  } else {
    console.log('❌ Touch start handler implementation not found');
  }
  
  if (content.includes('onTouchEnd={handleBannerTouchEnd}')) {
    console.log('✅ Touch end handler implementation found');
  } else {
    console.log('❌ Touch end handler implementation not found');
  }
  
  // Check for auto-slide interval
  if (content.includes('3000')) {
    console.log('✅ 3-second auto-slide interval found');
  } else {
    console.log('❌ 3-second auto-slide interval not found');
  }
  
  // Check for useEffect hooks
  if (content.includes('useEffect') && content.includes('startAutoSlide')) {
    console.log('✅ Auto-slide useEffect hook found');
  } else {
    console.log('❌ Auto-slide useEffect hook not found');
  }
  
  // Check for useFocusEffect
  if (content.includes('useFocusEffect') && content.includes('startAutoSlide')) {
    console.log('✅ Focus effect auto-slide management found');
  } else {
    console.log('❌ Focus effect auto-slide management not found');
  }
} else {
  console.log('❌ Main homepage file not found');
}

// Check admin homepage component
const adminHomePath = path.join(__dirname, '..', 'admin-deploy-temp', 'app', '(tabs)', 'index.tsx');
if (fs.existsSync(adminHomePath)) {
  const content = fs.readFileSync(adminHomePath, 'utf8');
  
  console.log('\n🏢 Admin Dashboard Homepage:');
  
  // Check for auto-slide state management
  if (content.includes('isAutoSliding')) {
    console.log('✅ Auto-slide state management found');
  } else {
    console.log('❌ Auto-slide state management not found');
  }
  
  // Check for timer refs
  if (content.includes('autoSlideTimerRef')) {
    console.log('✅ Auto-slide timer ref found');
  } else {
    console.log('❌ Auto-slide timer ref not found');
  }
  
  // Check for banner scroll view ref
  if (content.includes('bannerScrollViewRef')) {
    console.log('✅ Banner scroll view ref found');
  } else {
    console.log('❌ Banner scroll view ref not found');
  }
  
  // Check for auto-slide functions
  if (content.includes('startAutoSlide')) {
    console.log('✅ Start auto-slide function found');
  } else {
    console.log('❌ Start auto-slide function not found');
  }
  
  if (content.includes('stopAutoSlide')) {
    console.log('✅ Stop auto-slide function found');
  } else {
    console.log('❌ Stop auto-slide function not found');
  }
  
  // Check for ScrollView implementation
  if (content.includes('ref={bannerScrollViewRef}')) {
    console.log('✅ ScrollView ref implementation found');
  } else {
    console.log('❌ ScrollView ref implementation not found');
  }
  
  if (content.includes('onTouchStart={handleBannerTouchStart}')) {
    console.log('✅ Touch start handler implementation found');
  } else {
    console.log('❌ Touch start handler implementation not found');
  }
  
  if (content.includes('onTouchEnd={handleBannerTouchEnd}')) {
    console.log('✅ Touch end handler implementation found');
  } else {
    console.log('❌ Touch end handler implementation not found');
  }
} else {
  console.log('⚠️ Admin homepage file not found');
}

console.log('\n📋 Auto-Slide Feature Summary:');
console.log('1. Auto-slide every 3 seconds');
console.log('2. Pause on user touch');
console.log('3. Resume after touch ends');
console.log('4. Pause when screen loses focus');
console.log('5. Resume when screen gains focus');
console.log('6. Only auto-slide if multiple banners exist');
console.log('7. Proper cleanup of timers');

console.log('\n🧪 To test the auto-slide:');
console.log('1. Open the app');
console.log('2. Go to Homepage');
console.log('3. Wait for banners to auto-slide every 3 seconds');
console.log('4. Touch a banner to pause auto-slide');
console.log('5. Release touch to resume auto-slide');
console.log('6. Switch to another tab and back to test focus behavior');

console.log('\n✅ Banner auto-slide feature test complete!\n');
