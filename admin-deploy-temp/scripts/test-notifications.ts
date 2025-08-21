import { notificationService } from '../lib/notification-service';

// Test script to create sample notifications
export async function createSampleNotifications(userId: string) {
  console.log('🧪 Creating sample notifications for user:', userId);

  try {
    // 1. Marketing notification
    await notificationService.addMarketingNotification({
      userId,
      title: '🌟 Discover New Services',
      message: 'Check out trending services in your area and find amazing deals!',
    });
    console.log('✅ Marketing notification created');

    // 2. Check-in reminder
    await notificationService.addCheckInReminderNotification({
      userId,
    });
    console.log('✅ Check-in reminder created');

    // 3. Chat notification (for comparison)
    await notificationService.addChatNotification({
      participantId: userId,
      participantName: 'John Doe',
      participantImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      message: 'Hey! I saw your service listing and I\'m interested. Can we discuss the details?',
      chatId: 'sample-chat-id',
      senderId: 'sample-sender-id',
    });
    console.log('✅ Chat notification created');

    // 4. Service offer notification
    await notificationService.addOfferNotification({
      participantId: userId,
      participantName: 'Sarah Wilson',
      participantImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      chatId: 'sample-offer-chat-id',
      offerId: 'sample-offer-id',
      serviceTitle: 'Website Design & Development',
      price: 1500,
      currency: 'RM',
      senderId: 'sample-offer-sender-id',
      isIncoming: true,
    });
    console.log('✅ Offer notification created');

    console.log('🎉 All sample notifications created successfully!');
  } catch (error) {
    console.error('❌ Error creating sample notifications:', error);
  }
}