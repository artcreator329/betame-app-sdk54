# Smart Navigation Implementation

## Overview

The smart navigation system has been implemented to solve the issue where the back button was going to the last page in history instead of the parent/upper page in the navigation hierarchy. This ensures users always navigate to logical parent pages rather than potentially getting stuck in navigation loops.

## Key Components

### 1. useSmartNavigation Hook (`hooks/useSmartNavigation.ts`)

This hook provides intelligent navigation logic:

- **`smartBack()`**: Navigates to the appropriate parent page based on the current route
- **`navigateToParent(routeName?)`**: Navigates to a specific parent route or the first available parent

### 2. Navigation Hierarchy

The system defines a clear hierarchy of parent-child relationships:

```typescript
const navigationHierarchy = {
  // Service pages go back to home/services
  'service': ['index', 'services', 'search', 'trending', 'nearby'],
  
  // Job pages go back to orders/job details
  'job-progress': ['job', 'orders'],
  'job-completion': ['job', 'orders'],
  
  // Chat goes back to messages
  'chat': ['messages', 'index'],
  
  // Settings pages go back to profile
  'wallet': ['profile'],
  'settings': ['profile'],
  
  // Admin pages go back to profile
  'admin-dashboard': ['profile'],
  'ads-management': ['admin'],
}
```

### 3. SmartBackButton Component (`components/SmartBackButton.tsx`)

A reusable component that automatically uses smart navigation:

```tsx
import { SmartBackButton } from '@/components/SmartBackButton';

// Usage
<SmartBackButton color="#007AFF" size={24} />
```

## Implementation Details

### How It Works

1. **Route Detection**: The hook uses `useSegments()` to detect the current route
2. **Parent Lookup**: It looks up the current route in the navigation hierarchy
3. **Smart Decision**: 
   - If parent routes are defined, it navigates to the first available parent
   - If no parent routes are defined, it falls back to regular `router.back()`
   - If no back history exists, it navigates to home (`/(tabs)/index`)

### Logic Flow

```typescript
const smartBack = useCallback(() => {
  const currentRoute = segments[segments.length - 1] || 'index';
  const parentRoutes = navigationHierarchy[currentRoute] || [];
  
  if (parentRoutes.length > 0) {
    // Navigate to first parent route
    router.push(`/(tabs)/${parentRoutes[0]}` as any);
  } else if (router.canGoBack()) {
    // Fallback to regular back navigation
    router.back();
  } else {
    // Navigate to home if no back history
    router.push('/(tabs)/index' as any);
  }
}, [router, segments]);
```

## Updated Screens

The following screens have been updated to use smart navigation:

1. **Service Details** (`app/service/[id].tsx`)
   - Back button now goes to home/services instead of history

2. **Chat Screen** (`app/chat/[participantId].tsx`)
   - Back button goes to messages or home

3. **Job Progress** (`app/job-progress/[jobId].tsx`)
   - Back button goes to job details or orders

4. **Wallet** (`app/wallet.tsx`)
   - Back button goes to profile

5. **User Profile** (`app/profile/[userId].tsx`)
   - Back button goes to appropriate parent page

6. **Messages** (`app/messages.tsx`)
   - Back button goes to home or profile

7. **Admin Dashboard** (`app/admin-dashboard.tsx`)
   - Back button goes to profile

8. **Admin Layout** (`app/admin/_layout.tsx`)
   - Back buttons go to profile

## Benefits

1. **Predictable Navigation**: Users always know where the back button will take them
2. **No Navigation Loops**: Prevents getting stuck in the same page
3. **Logical Flow**: Navigation follows the app's logical structure
4. **Consistent UX**: All back buttons behave consistently across the app

## Usage Examples

### Using the Hook Directly

```tsx
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

function MyScreen() {
  const { smartBack, navigateToParent } = useSmartNavigation();
  
  return (
    <TouchableOpacity onPress={smartBack}>
      <Text>Go Back</Text>
    </TouchableOpacity>
  );
}
```

### Using the SmartBackButton Component

```tsx
import { SmartBackButton } from '@/components/SmartBackButton';

function MyScreen() {
  return (
    <View style={styles.header}>
      <SmartBackButton color="#007AFF" />
      <Text>Screen Title</Text>
    </View>
  );
}
```

## Future Enhancements

1. **Dynamic Hierarchy**: Could be extended to support dynamic navigation hierarchies based on user context
2. **Analytics**: Could track navigation patterns to optimize the hierarchy
3. **Custom Routes**: Could allow screens to define their own parent routes dynamically

## Testing

To test the smart navigation:

1. Navigate to a service detail page
2. Press the back button - should go to home/services
3. Navigate to a chat from messages
4. Press the back button - should go back to messages
5. Navigate to wallet from profile
6. Press the back button - should go back to profile

The navigation should feel more intuitive and predictable compared to the previous history-based navigation.
