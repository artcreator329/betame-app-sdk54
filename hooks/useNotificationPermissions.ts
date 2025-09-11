import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationPermissionService } from '@/lib/notification-permission-service';
import { checkNotificationPermissions } from '@/lib/local-notifications';

interface NotificationPermissionState {
  hasPermission: boolean;
  isChecking: boolean;
  lastChecked: number | null;
  lastDismissed: number | null;
}

export function useNotificationPermissions() {
  const [state, setState] = useState<NotificationPermissionState>({
    hasPermission: false,
    isChecking: false,
    lastChecked: null,
    lastDismissed: null,
  });

  // Check permission status
  const checkPermissionStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isChecking: true }));
      
      const status = await NotificationPermissionService.getCurrentPermissionStatus();
      
      setState({
        hasPermission: status.hasPermission,
        isChecking: false,
        lastChecked: status.lastChecked,
        lastDismissed: status.lastDismissed,
      });
    } catch (error) {
      console.error('Error checking notification permission status:', error);
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, []);

  // Check and prompt if needed
  const checkAndPrompt = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isChecking: true }));
      
      const granted = await NotificationPermissionService.checkAndPromptIfNeeded();
      
      // Refresh status after prompting
      await checkPermissionStatus();
      
      return granted;
    } catch (error) {
      console.error('Error checking and prompting for permissions:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      return false;
    }
  }, [checkPermissionStatus]);

  // Force check (ignores timing restrictions)
  const forceCheck = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isChecking: true }));
      
      const granted = await NotificationPermissionService.forceCheckPermissions();
      
      // Refresh status after checking
      await checkPermissionStatus();
      
      return granted;
    } catch (error) {
      console.error('Error force checking permissions:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      return false;
    }
  }, [checkPermissionStatus]);

  // Reset permission state
  const resetPermissionState = useCallback(async () => {
    try {
      await NotificationPermissionService.resetPermissionState();
      await checkPermissionStatus();
    } catch (error) {
      console.error('Error resetting permission state:', error);
    }
  }, [checkPermissionStatus]);

  // Check permissions when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Check permission status when app becomes active
        // This helps detect if user enabled notifications in settings
        checkPermissionStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial check
    checkPermissionStatus();

    return () => {
      subscription?.remove();
    };
  }, [checkPermissionStatus]);

  return {
    ...state,
    checkAndPrompt,
    forceCheck,
    resetPermissionState,
    refreshStatus: checkPermissionStatus,
  };
}

/**
 * Hook for automatically checking permissions on app start
 * Use this in your main app component or auth context
 */
export function useAutoNotificationPermissionCheck(enabled: boolean = true) {
  const [hasChecked, setHasChecked] = useState(false);
  
  useEffect(() => {
    if (!enabled || hasChecked) return;
    
    const checkPermissions = async () => {
      try {
        // Small delay to let the app settle
        setTimeout(async () => {
          await NotificationPermissionService.checkAndPromptIfNeeded();
          setHasChecked(true);
        }, 2000); // 2 second delay
      } catch (error) {
        console.error('Error in auto permission check:', error);
        setHasChecked(true);
      }
    };
    
    checkPermissions();
  }, [enabled, hasChecked]);
  
  return { hasChecked };
}