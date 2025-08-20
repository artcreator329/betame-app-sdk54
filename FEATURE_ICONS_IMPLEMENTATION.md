# Feature Icons Implementation

This document describes the implementation of feature icons that display on service cards when users have purchased and applied features to their services.

## Overview

When a user purchases a feature (like Boost, Showcase, Feature 2x, or Boost Feature Max), the respective icon will display on their service cards throughout the app until the feature expires.

## Components

### 1. FeatureService (`lib/feature-service.ts`)

A service class that handles:
- Fetching active features for services
- Getting feature icon configurations
- Applying features to services
- Cleaning up expired features

**Key Methods:**
- `getActiveFeaturesForService(serviceId)` - Get active features for a single service
- `getActiveFeaturesForServices(serviceIds)` - Get active features for multiple services
- `getFeatureIcon(featureType)` - Get icon configuration for a feature type
- `applyFeatureToService()` - Apply a feature to a service
- `removeExpiredFeatures()` - Clean up expired features

### 2. FeatureIcons Component (`components/FeatureIcons.tsx`)

A reusable component that displays feature icons:
- Takes an array of `ServiceFeatureApplication` objects
- Renders the appropriate icon for each feature type
- Supports customizable size and styling
- Returns null if no features are provided

### 3. Updated ServiceCard Component (`components/ServiceCard.tsx`)

The ServiceCard component has been updated to:
- Display feature icons in the rating container
- Use active features from the service prop
- Position icons on the right side of the rating area

## Feature Types and Icons

| Feature Type | Icon File | Color | Description |
|--------------|-----------|-------|-------------|
| `boost_instant` | `boost-icon.png` | #FF6B35 | Boost (instant visibility) |
| `showcase_max` | `showcase-icon.png` | #4A90E2 | Showcase (Max visibility) |
| `feature_2x` | `feature-icon.png` | #7ED321 | Feature (2x visibility) |
| `boost_feature_max` | `boostFeature-icon.png` | #9B59B6 | Boost Feature (Max visibility) |

## Database Schema

### service_feature_applications Table

```sql
CREATE TABLE service_feature_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_id UUID NOT NULL REFERENCES services(id),
  feature_type TEXT NOT NULL CHECK (feature_type IN ('feature_2x', 'boost_instant', 'showcase_max', 'boost_feature_max')),
  feature_name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Integration Points

### 1. Service Fetching

The following service methods have been updated to include active features:
- `ServiceService.getAllServices()`
- `ServiceService.getNearbyServices()`
- `ServiceService.getTrendingServices()`

### 2. Service Type

The `Service` interface has been updated to include:
```typescript
active_features?: ServiceFeatureApplication[];
```

### 3. ServiceCard Display

Feature icons are displayed in the rating container of each service card, positioned on the right side.

## Usage Examples

### Displaying Feature Icons

```typescript
import FeatureIcons from '@/components/FeatureIcons';

// In a component
<FeatureIcons 
  features={service.active_features} 
  size={16} 
  style={styles.featureIcons}
/>
```

### Fetching Active Features

```typescript
import { FeatureService } from '@/lib/feature-service';

// Get features for a single service
const features = await FeatureService.getActiveFeaturesForService(serviceId);

// Get features for multiple services
const featuresMap = await FeatureService.getActiveFeaturesForServices(serviceIds);
```

### Applying a Feature

```typescript
const result = await FeatureService.applyFeatureToService(
  userId,
  serviceId,
  'boost_instant',
  'Boost (instant visibility)',
  expiresAt
);
```

## Testing

A test component and page have been created to verify the feature icons are working correctly:

- `components/FeatureIconsTest.tsx` - Test component with sample data
- `app/test-feature-icons.tsx` - Test page to view the icons

## Styling

Feature icons are styled with:
- White background with slight transparency
- Rounded corners
- Subtle shadow for depth
- Configurable size
- Gap between multiple icons

## Future Enhancements

1. **Feature Tooltips** - Add tooltips showing feature details on hover/tap
2. **Feature Badges** - Add badges showing feature count or status
3. **Feature Expiry Warnings** - Show warnings when features are about to expire
4. **Feature Management** - Add UI for users to manage their active features
5. **Feature Analytics** - Track feature usage and effectiveness

## Notes

- Feature icons only display for active (non-expired) features
- Icons are positioned to not interfere with existing UI elements
- The implementation is optimized to fetch features in bulk for better performance
- Expired features are automatically filtered out in the database queries
