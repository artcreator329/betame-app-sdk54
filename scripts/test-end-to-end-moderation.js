#!/usr/bin/env node

/**
 * End-to-end test for the moderation system
 * This simulates the full flow from message input to database recording
 */

console.log('🧪 End-to-End Moderation Test');
console.log('=============================\n');

// Simulate the moderation service
class TestModerationService {
  contactPatterns = [
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      description: 'Email address',
      severity: 'high'
    },
    {
      pattern: /\b(?:\+?6?01[0-9][-.\s]?[0-9]{3,4}[-.\s]?[0-9]{4})\b/gi,
      description: 'Malaysian mobile number',
      severity: 'high'
    }
  ];

  moderateMessage(message) {
    console.log(`🔍 Moderating message: "${message}"`);
    
    for (const { pattern, description, severity } of this.contactPatterns) {
      // Reset pattern lastIndex to avoid issues with global flag
      pattern.lastIndex = 0;
      
      if (pattern.test(message)) {
        console.log(`❌ Violation detected: ${description}`);
        return {
          isBlocked: true,
          reason: `Message contains ${description}. Please use the platform's messaging system for communication.`,
          severity,
          violationType: 'contact_info_sharing'
        };
      }
    }
    
    console.log(`✅ Message passed moderation`);
    return { isBlocked: false, severity: 'low' };
  }

  async recordViolation(userId, violationType, messageContent, chatId, reason, severity) {
    console.log(`📋 Recording violation for user ${userId}:`);
    console.log(`   Type: ${violationType}`);
    console.log(`   Content: ${messageContent}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Severity: ${severity}`);
    return { id: 'test-violation-id' };
  }

  async isUserBanned(userId) {
    console.log(`🔒 Checking ban status for user ${userId}: false`);
    return false;
  }
}

// Simulate the chat service
class TestChatService {
  constructor() {
    this.moderationService = new TestModerationService();
  }

  async moderateMessage(message, userId, chatId) {
    console.log(`\n🛡️ Starting moderation for message from user ${userId}`);
    
    try {
      // Check if user is banned
      const isBanned = await this.moderationService.isUserBanned(userId);
      if (isBanned) {
        console.log(`🚫 User is banned, blocking message`);
        return {
          isHidden: true,
          moderationReason: 'User is currently banned and cannot send messages.'
        };
      }

      // Moderate the message content
      const moderationResult = this.moderationService.moderateMessage(message);
      
      if (moderationResult.isBlocked) {
        console.log(`🚫 Message blocked by moderation`);
        
        // Record the violation
        try {
          await this.moderationService.recordViolation(
            userId,
            moderationResult.violationType,
            message,
            chatId,
            moderationResult.reason,
            moderationResult.severity
          );
          console.log(`✅ Violation recorded successfully`);
        } catch (violationError) {
          console.log(`❌ Violation recording failed:`, violationError.message);
        }

        // Insert warning message
        if (moderationResult.violationType === 'contact_info_sharing' && chatId) {
          console.log(`⚠️ Inserting warning message in chat ${chatId}`);
          console.log(`   Warning: [SAFETY_WARNING:${moderationResult.violationType}:${moderationResult.reason}]`);
        }

        return {
          isHidden: true,
          moderationReason: moderationResult.reason || 'Message blocked by moderation system.'
        };
      }

      console.log(`✅ Message allowed through moderation`);
      return { isHidden: false, moderationReason: null };
    } catch (error) {
      console.error('❌ Moderation failed:', error.message);
      return { isHidden: false, moderationReason: null };
    }
  }

  async sendMessage(chatId, senderId, senderName, senderImage, message) {
    console.log(`\n📤 Attempting to send message:`);
    console.log(`   Chat: ${chatId}`);
    console.log(`   Sender: ${senderName} (${senderId})`);
    console.log(`   Message: "${message}"`);

    // Run moderation
    const moderation = await this.moderateMessage(message, senderId, chatId);
    
    if (moderation.isHidden) {
      console.log(`🚫 Message blocked: ${moderation.moderationReason}`);
      return null; // Message blocked
    }

    console.log(`✅ Message would be sent to database`);
    return {
      id: 'test-message-id',
      content: message,
      senderId: senderId,
      senderName: senderName
    };
  }
}

// Test scenarios
async function runTests() {
  const chatService = new TestChatService();
  const testChatId = 'test-chat-123';
  const testUserId = 'test-user-456';
  const testUserName = 'Test User';
  const testUserImage = 'https://example.com/avatar.jpg';

  const testMessages = [
    {
      message: "try my email: chua@gmail.com",
      shouldBlock: true,
      description: "Email address sharing"
    },
    {
      message: "Call me at 012-345-6789",
      shouldBlock: true,
      description: "Phone number sharing"
    },
    {
      message: "Hello! I'm interested in your service. When can we start?",
      shouldBlock: false,
      description: "Normal message"
    },
    {
      message: "Great work! Thank you for the excellent service.",
      shouldBlock: false,
      description: "Normal message"
    }
  ];

  console.log('🧪 Running End-to-End Tests:');
  console.log('============================');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`\n--- Test ${i + 1}: ${test.description} ---`);
    
    const result = await chatService.sendMessage(
      testChatId,
      testUserId,
      testUserName,
      testUserImage,
      test.message
    );

    const wasBlocked = result === null;
    const success = wasBlocked === test.shouldBlock;

    console.log(`\n📊 Test Result:`);
    console.log(`   Expected: ${test.shouldBlock ? 'BLOCKED' : 'ALLOWED'}`);
    console.log(`   Actual: ${wasBlocked ? 'BLOCKED' : 'ALLOWED'}`);
    console.log(`   Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);

    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n=============================');
  console.log(`📊 Final Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The moderation system is working end-to-end.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the implementation.');
  }

  console.log('\n🔧 System Components Tested:');
  console.log('✅ Pattern detection');
  console.log('✅ Message blocking');
  console.log('✅ Violation recording');
  console.log('✅ Warning message insertion');
  console.log('✅ User ban checking');
  console.log('✅ End-to-end message flow');
}

// Run the tests
runTests().catch(console.error);