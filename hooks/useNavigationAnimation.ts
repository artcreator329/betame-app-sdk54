import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

interface NavigationOptions {
  animated?: boolean;
  transition?: 'slide' | 'fade' | 'modal';
}

export function useNavigationAnimation() {
  const router = useRouter();

  const navigateWithAnimation = useCallback((
    href: string, 
    options: NavigationOptions = {}
  ) => {
    const { animated = true, transition = 'slide' } = options;

    if (animated) {
      // Add a small delay for smooth animation
      setTimeout(() => {
        router.push(href as any);
      }, Platform.OS === 'ios' ? 50 : 0);
    } else {
      router.push(href as any);
    }
  }, [router]);

  const replaceWithAnimation = useCallback((
    href: string, 
    options: NavigationOptions = {}
  ) => {
    const { animated = true, transition = 'slide' } = options;

    if (animated) {
      // Add a small delay for smooth animation
      setTimeout(() => {
        router.replace(href as any);
      }, Platform.OS === 'ios' ? 50 : 0);
    } else {
      router.replace(href as any);
    }
  }, [router]);

  const backWithAnimation = useCallback((
    options: NavigationOptions = {}
  ) => {
    const { animated = true } = options;

    if (animated) {
      // Add a small delay for smooth animation
      setTimeout(() => {
        router.back();
      }, Platform.OS === 'ios' ? 50 : 0);
    } else {
      router.back();
    }
  }, [router]);

  return {
    navigateWithAnimation,
    replaceWithAnimation,
    backWithAnimation,
  };
}
