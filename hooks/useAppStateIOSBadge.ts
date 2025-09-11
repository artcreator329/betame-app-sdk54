import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { iosBadgeService } from '@/lib/ios-badge-service';

export function useAppStateIOSBadge(currentBadgeCount: number) {
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🍎 AppState changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // When app becomes active, sync the badge count
        console.log('🍎 App became active, syncing badge count:', currentBadgeCount);
        iosBadgeService.updateBadgeCount(currentBadgeCount);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [currentBadgeCount]);
}