/**
 * Test script for AI Chat Service
 * Run with: node scripts/test-ai-chat.js
 */

const { AIChatService } = require('../lib/ai-chat-service');

async function testAIChatService() {
  console.log('🧪 Testing AI Chat Service...\n');

  try {
    const aiChatService = new AIChatService();
    
    // Test 1: Send a simple message
    console.log('📝 Test 1: Sending a simple message...');
    const testUserId = 'test-user-id';
    const testMessage = 'Hello, can you help me understand how the app works?';
    
    const response = await aiChatService.sendMessage(testUserId, testMessage);
    
    if (response.success) {
      console.log('✅ Success! AI Response:', response.response?.substring(0, 100) + '...');
      console.log('📊 Message ID:', response.messageId);
    } else {
      console.log('❌ Error:', response.error);
    }
    
    // Test 2: Get chat history
    console.log('\n📚 Test 2: Getting chat history...');
    const history = await aiChatService.getChatHistory(testUserId);
    
    if (history.success) {
      console.log('✅ Success! Found', history.messages?.length || 0, 'messages');
      if (history.messages && history.messages.length > 0) {
        console.log('📄 Latest message:', history.messages[0].message.substring(0, 50) + '...');
      }
    } else {
      console.log('❌ Error:', history.error);
    }
    
    // Test 3: Clear chat history
    console.log('\n🗑️ Test 3: Clearing chat history...');
    const clearResult = await aiChatService.clearChatHistory(testUserId);
    
    if (clearResult.success) {
      console.log('✅ Success! Chat history cleared');
    } else {
      console.log('❌ Error:', clearResult.error);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test
testAIChatService();
