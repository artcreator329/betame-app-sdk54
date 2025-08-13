// Simple test script to verify marketing notifications trigger system notifications
// Run this from the admin panel or notification test panel

import { notificationService } from '../lib/notification-service';

export async function testMarketingNotification(userId: string): Promise<boolean> {
  console.log('🧪 Testing marketing notification with system notification...');
  console.log('User ID:', userId);

  try {
    // Send a marketing notification
    await notificationService.addMarketingNotification({
      userId,
      title: '🔥 Hot Deals Today',
      message: 'Don\'t miss out on limited-time offers from top-rated service providers!',
    });
    
    console.log('✅ Marketing notification sent!');
    console.log('📱 Check your device notification center for the system notification');
    console.log('📋 Check your in-app notifications tab to see the in-app notification');
    
    return true;
  } catch (error) {
    console.error('❌ Error sending marketing notification:', error);
    return false;
  }
}