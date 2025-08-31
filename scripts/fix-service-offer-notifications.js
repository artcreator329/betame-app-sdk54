/**
 * Script to fix service offer notification issues
 * Fixes undefined sellerId references in sendServiceMessage function
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'supabase-chat-service.ts');

try {
  console.log('🔧 Fixing service offer notification issues...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the sendServiceMessage function - replace sellerId with senderId
  // Only in the sendServiceMessage function, not in createServiceOffer
  
  // Find the sendServiceMessage function and fix sellerId references within it
  const sendServiceMessageStart = content.indexOf('async sendServiceMessage(');
  const createServiceOfferStart = content.indexOf('async createServiceOffer(');
  
  if (sendServiceMessageStart === -1) {
    console.error('❌ Could not find sendServiceMessage function');
    process.exit(1);
  }
  
  // Get the content of sendServiceMessage function only (before createServiceOffer)
  const sendServiceMessageContent = content.substring(sendServiceMessageStart, createServiceOfferStart);
  
  // Fix sellerId references in sendServiceMessage function only
  const fixedSendServiceMessageContent = sendServiceMessageContent
    .replace(/sellerId/g, 'senderId')
    .replace(/seller:/g, 'sender:')
    .replace(/Add seller ID for navigation/g, 'Add sender ID for navigation');
  
  // Replace the original sendServiceMessage content with fixed version
  const beforeSendServiceMessage = content.substring(0, sendServiceMessageStart);
  const afterSendServiceMessage = content.substring(createServiceOfferStart);
  
  const fixedContent = beforeSendServiceMessage + fixedSendServiceMessageContent + afterSendServiceMessage;
  
  // Write the fixed content back
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  
  console.log('✅ Fixed service offer notification issues');
  console.log('📝 Changes made:');
  console.log('  - Fixed undefined sellerId references in sendServiceMessage function');
  console.log('  - Changed sellerId to senderId in notification code');
  console.log('  - Updated log messages to use "sender" instead of "seller"');
  
} catch (error) {
  console.error('❌ Error fixing service offer notifications:', error);
  process.exit(1);
}