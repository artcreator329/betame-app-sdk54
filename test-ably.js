// Simple test to verify Ably integration
const { ablyChatService } = require('./lib/ably-chat-service');

async function testAblyConnection() {
  console.log('Testing Ably connection...');
  
  try {
    // Initialize the service
    await ablyChatService.initialize();
    
    // Check connection status
    const status = ablyChatService.getConnectionStatus();
    console.log('Connection status:', status);
    
    if (status === 'connected') {
      console.log('✅ Ably connection successful!');
    } else {
      console.log('⚠️ Ably connection status:', status);
    }
    
  } catch (error) {
    console.error('❌ Ably connection failed:', error.message);
  }
}

// Run the test
testAblyConnection();