import { useRouter, useSegments } from 'expo-router';
import { useCallback } from 'react';

interface NavigationHierarchy {
  [key: string]: string[];
}

// Define the navigation hierarchy - parent pages for each route
const navigationHierarchy: NavigationHierarchy = {
  // Main tabs are the root level
  'index': [],
  'services': [],
  'orders': [],
  'notifications': [],
  'profile': [],
  
  // Auth pages
  'login': [],
  'register': [],
  'callback': [],
  
  // Service-related pages
  'service': ['index', 'services', 'search', 'trending', 'nearby'],
  'edit-service': ['profile', 'services'],
  'detailed-service-listing': ['index', 'services', 'search', 'trending', 'nearby'],
  
  // Job-related pages
  'job': ['index', 'orders', 'profile'],
  'job-acceptance': ['job', 'orders'],
  'job-progress': ['job', 'orders'],
  'job-completion': ['job', 'orders'],
  'job-review': ['job', 'orders'],
  
  // Profile-related pages
  'user-profile': ['index', 'services', 'search', 'trending', 'nearby'],
  
  // Chat pages
  'chat': ['messages', 'index'],
  
  // User action pages
  'messages': ['index', 'profile'],
  'wallet': ['profile'],
  'favorites': ['index', 'services'],
  'orders': ['index', 'profile'],
  
  // Settings and configuration pages
  'settings': ['profile'],
  'edit-profile': ['profile', 'settings'],
  'notification-settings': ['settings', 'profile'],
  'ekyc-verification': ['profile'],
  'bank-upload': ['profile'],
  
  // Location and search pages
  'search': ['index'],
  'trending': ['index'],
  'nearby': ['index'],
  'check-in': ['index'],
  
  // Creation pages
  'create-service-listing': ['services', 'profile'],
  'create-job-listing': ['index', 'profile'],
  'become-service-provider': ['profile'],
  
  // Payment pages
  'malaysian-payment-gateway': ['wallet', 'profile'],
  'payment': ['wallet', 'profile'],
  
  // Admin pages
  'admin': ['profile'],
  'admin-dashboard': ['profile'],
  'ads-management': ['admin'],
  'analytics': ['admin'],
  'user-management': ['admin'],
  'service-management': ['admin'],
  'job-management': ['admin'],
  'payment-management': ['admin'],
  'notification-management': ['admin'],
  'settings': ['admin'],
  'moderation': ['admin'],
  'reports': ['admin'],
  'system-settings': ['admin'],
  'backup-restore': ['admin'],
  'logs': ['admin'],
  'api-keys': ['admin'],
  'webhooks': ['admin'],
  'integrations': ['admin'],
  
  // Additional pages that might be accessed
  'about-us': ['index'],
  'contact-us': ['index'],
  'faq': ['index'],
  'legal': ['index'],
  'privacy-policy': ['index'],
  'terms-of-service': ['index'],
  'safety-security': ['index'],
  'payment-help': ['index'],
  'support': ['index'],
  'user-guide': ['index'],
};

export function useSmartNavigation() {
  const router = useRouter();
  const segments = useSegments();

  const smartBack = useCallback(() => {
    const currentRoute = segments[segments.length - 1] || 'index';
    const parentRoutes = navigationHierarchy[currentRoute] || [];
    
    // If we have parent routes defined, try to navigate to the first available one
    if (parentRoutes.length > 0) {
      // Check if we can go back in history first
      if (router.canGoBack()) {
        // Get the current path to check if we're already on a parent route
        const currentPath = segments.join('/');
        
        // If we're already on a parent route or the back would take us to the same page,
        // navigate to the first parent route instead
        const shouldUseParentRoute = parentRoutes.some(parent => 
          currentPath.includes(parent) || segments.includes(parent)
        );
        
        if (shouldUseParentRoute) {
          router.push(`/(tabs)/${parentRoutes[0]}` as any);
          return;
        }
      }
      
      // Navigate to the first parent route
      router.push(`/(tabs)/${parentRoutes[0]}` as any);
      return;
    }
    
    // Fallback to regular back navigation
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no back history, go to home
      router.push('/(tabs)/index' as any);
    }
  }, [router, segments]);

  const navigateToParent = useCallback((routeName?: string) => {
    const currentRoute = segments[segments.length - 1] || 'index';
    const parentRoutes = navigationHierarchy[currentRoute] || [];
    
    if (routeName && parentRoutes.includes(routeName)) {
      router.push(`/(tabs)/${routeName}` as any);
    } else if (parentRoutes.length > 0) {
      router.push(`/(tabs)/${parentRoutes[0]}` as any);
    } else {
      router.push('/(tabs)/index' as any);
    }
  }, [router, segments]);

  return {
    smartBack,
    navigateToParent,
  };
}
