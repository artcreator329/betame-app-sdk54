import { Platform } from 'react-native';

let notificationsModule: any | null = null;

async function ensureModule() {
  if (notificationsModule) return notificationsModule;
  
  try {
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch (error) {
    console.log('Failed to load notifications module:', error);
    return null;
  }
}

export class IOSBadgeService {
  private static instance: IOSBadgeService;
  private currentBadgeCount: number = 0;

  static getInstance(): IOSBadgeService {
    if (!IOSBadgeService.instance) {
      IOSBadgeService.instance = new IOSBadgeService();
    }
    return IOSBadgeService.instance;
  }

  private constructor() {}

  async updateBadgeCount(count: number): Promise<void> {
    // Only update iOS badge on iOS platform
    if (Platform.OS !== 'ios') {
      return;
    }

    // Don't update if count hasn't changed
    if (count === this.currentBadgeCount) {
      return;
    }

    try {
      const mod = await ensureModule();
      if (!mod) {
        console.log('❌ IOSBadgeService: Notifications module not available');
        return;
      }

      console.log(`🍎 IOSBadgeService: Updating iOS badge count from ${this.currentBadgeCount} to ${count}`);
      
      await mod.setBadgeCountAsync(count);
      this.currentBadgeCount = count;
      
      console.log(`✅ IOSBadgeService: iOS badge count updated to ${count}`);
    } catch (error) {
      console.error('❌ IOSBadgeService: Error updating iOS badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.updateBadgeCount(0);
  }

  async getBadgeCount(): Promise<number> {
    if (Platform.OS !== 'ios') {
      return 0;
    }

    try {
      const mod = await ensureModule();
      if (!mod) {
        return 0;
      }

      const count = await mod.getBadgeCountAsync();
      console.log(`🍎 IOSBadgeService: Current iOS badge count is ${count}`);
      return count;
    } catch (error) {
      console.error('❌ IOSBadgeService: Error getting iOS badge count:', error);
      return 0;
    }
  }

  getCurrentBadgeCount(): number {
    return this.currentBadgeCount;
  }
}

export const iosBadgeService = IOSBadgeService.getInstance();