/**
 * Simple script to send a sample notification
 * Run this with: node scripts/send-sample-notification.js
 */

// Since this is a Node.js script, we'll simulate the notification creation
// In the actual app, you would use the notification service directly

const sampleNotifications = {
  marketing: {
    type: 'marketing',
    title: '🌟 Discover New Services',
    message: 'Check out trending services in your area and find amazing deals!',
    timestamp: new Date().toISOString(),
    isRead: false,
    data: {
      category: 'marketing',
      canDisable: true
    }
  },
  
  checkIn: {
    type: 'check_in',
    title: '👋 Time to Check In!',
    message: 'Share your location and discover new opportunities around you!',
    timestamp: new Date().toISOString(),
    isRead: false,
    data: {
      action: 'check_in',
      category: 'reminder'
    }
  },
  
  chat: {
    type: 'chat',
    title: 'New message from John Doe',
    message: 'Hey! I saw your service listing and I\'m interested. Can we discuss the details?',
    timestamp: new Date().toISOString(),
    isRead: false,
    data: {
      chatId: 'sample-chat-123',
      participantId: 'user-456',
      participantName: 'John Doe',
      participantImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    }
  },
  
  offer: {
    type: 'offer',
    title: 'New offer from Sarah Wilson',
    message: 'Website Design & Development - RM 1500',
    timestamp: new Date().toISOString(),
    isRead: false,
    data: {
      chatId: 'offer-chat-789',
      participantId: 'user-789',
      participantName: 'Sarah Wilson',
      participantImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      offerId: 'offer-123',
      offerStatus: 'pending',
      serviceTitle: 'Website Design & Development',
      price: 1500,
      currency: 'RM'
    }
  }
};

function displayNotification(notification) {
  console.log('\n📱 ===== SAMPLE NOTIFICATION =====');
  console.log(`🔔 Type: ${notification.type.toUpperCase()}`);
  console.log(`📋 Title: ${notification.title}`);
  console.log(`💬 Message: ${notification.message}`);
  console.log(`⏰ Time: ${new Date(notification.timestamp).toLocaleTimeString()}`);
  console.log(`👁️ Read: ${notification.isRead ? 'Yes' : 'No'}`);
  
  if (notification.data) {
    console.log('📊 Data:');
    Object.entries(notification.data).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
  
  console.log('================================\n');
}

function displaySystemNotification(notification) {
  console.log('📲 ===== SYSTEM NOTIFICATION =====');
  console.log('BetaMe');
  console.log(notification.title);
  console.log(notification.message);
  console.log('==================================\n');
}

function displayInAppNotification(notification) {
  console.log('📱 ===== IN-APP NOTIFICATION =====');
  
  // Get icon based on type
  const icons = {
    marketing: '📢',
    check_in: '📍',
    chat: '💬',
    offer: '🎁',
    system: '🔔'
  };
  
  const icon = icons[notification.type] || '🔔';
  const timeAgo = 'just now';
  
  console.log(`${icon} ${notification.title}                                    ${timeAgo}`);
  console.log(`${notification.message}`);
  
  // Show special features for different types
  if (notification.type === 'marketing' && notification.data?.canDisable) {
    console.log('');
    console.log('[Turn off marketing notifications] ← Tap to disable');
  }
  
  if (notification.type === 'offer' && notification.data) {
    console.log('');
    console.log(`📋 ${notification.data.serviceTitle}`);
    console.log(`💰 ${notification.data.currency} ${notification.data.price}`);
  }
  
  if (notification.type === 'chat' && notification.data?.participantName) {
    console.log('');
    console.log(`👤 ${notification.data.participantName}`);
  }
  
  console.log('==================================\n');
}

// Main execution
console.log('🚀 Sending Sample Notifications...\n');

// Send all types of notifications
Object.entries(sampleNotifications).forEach(([type, notification]) => {
  console.log(`\n📤 Sending ${type} notification...`);
  
  // Display as system notification
  displaySystemNotification(notification);
  
  // Display as in-app notification
  displayInAppNotification(notification);
  
  // Display detailed info
  displayNotification(notification);
  
  console.log('✅ Notification sent!\n');
  console.log('─'.repeat(50));
});

console.log('\n🎉 All sample notifications sent!');
console.log('\n📋 Summary:');
console.log('• Marketing notification - promotes services and deals');
console.log('• Check-in reminder - encourages location sharing');
console.log('• Chat notification - shows new messages');
console.log('• Offer notification - displays service offers');
console.log('\n💡 In the actual app:');
console.log('• These would appear in the Notifications tab');
console.log('• System notifications would show on device');
console.log('• Users can tap to navigate to relevant pages');
console.log('• Marketing notifications can be disabled');
console.log('• All notifications respect user preferences');