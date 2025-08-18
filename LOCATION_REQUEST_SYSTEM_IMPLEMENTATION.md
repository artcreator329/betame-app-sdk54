# Location Request System Implementation

## Overview

This implementation adds a step where service providers are prompted to send their location to users after a job has been acknowledged and payment is completed. This ensures that location sharing only happens after the job is confirmed, improving security and coordination.

## Components Added

### 1. LocationRequestModal Component
- **File**: `components/LocationRequestModal.tsx`
- **Purpose**: Modal that prompts service providers to share their location after job confirmation
- **Features**:
  - Explains why location sharing is important
  - Provides options to share location, send message, or do it later
  - Clean, user-friendly interface with clear call-to-action buttons

### 2. Location Request Notification
- **File**: `lib/notification-service.ts`
- **Function**: `addLocationRequestNotification()`
- **Purpose**: Sends notifications to service providers reminding them to share location
- **Type**: System notification with `actionType: 'location_request'`

### 3. Enhanced Chat Flow
- **File**: `app/chat/[participantId].tsx`
- **Changes**:
  - Added state management for location request modal
  - Modified `handlePaymentSuccess()` to show location request modal for service providers
  - Added `checkPendingLocationRequests()` function to check for pending location requests
  - Added automatic reminder when service provider opens chat

## Implementation Details

### Payment Success Flow
1. User (buyer) completes payment for service offer
2. System updates offer status to 'in_progress'
3. System creates active job record
4. System sends offer acceptance notification to service provider
5. **NEW**: System sends location request notification to service provider
6. **NEW**: If current user is service provider, shows location request modal
7. Buyer is redirected to orders page (if not service provider)

### Location Request Modal Triggers
1. **Immediate**: After payment success (if user is service provider)
2. **Reminder**: When service provider opens chat with pending location requests
3. **Manual**: Service provider can trigger location sharing from offer message

### Location Request Check Logic
```typescript
// Check for accepted offers without location messages
const acceptedOffers = await supabase
  .from('service_offers')
  .select('id, service_title, buyer_id, seller_id, status')
  .eq('status', 'in_progress')
  .or(`and(seller_id.eq.${user.id},buyer_id.eq.${participantId}),and(seller_id.eq.${participantId},buyer_id.eq.${user.id})`);

const locationMessages = await supabase
  .from('chat_messages')
  .select('id, message_type, offer_id')
  .eq('chat_id', chatId)
  .eq('message_type', 'location')
  .in('offer_id', acceptedOffers.map(offer => offer.id));

// Show modal if no location messages found
if (locationMessages && locationMessages.length === 0) {
  setLocationRequestModalVisible(true);
}
```

## User Experience Flow

### For Service Providers
1. **Job Confirmation**: Receive notification that their offer was accepted
2. **Location Request**: See location request modal with clear explanation
3. **Options**:
   - **Share Location**: Opens location picker modal
   - **Send Message**: Pre-fills message input with location-related text
   - **Do Later**: Dismisses modal (can be reminded later)
4. **Reminders**: Modal appears again when opening chat if location not shared

### For Buyers
1. **Payment Completion**: Job is confirmed and active
2. **Notification**: Receive notification that service provider needs to share location
3. **Coordination**: Can message service provider to request location if needed

## Benefits

1. **Security**: Location sharing only happens after job confirmation
2. **Coordination**: Clear workflow for location sharing
3. **Reminders**: Automatic reminders prevent forgotten location sharing
4. **Flexibility**: Multiple options for service providers (location, message, or later)
5. **User Experience**: Clear explanations and smooth flow

## Technical Implementation

### State Management
```typescript
const [locationRequestModalVisible, setLocationRequestModalVisible] = useState(false);
const [locationRequestData, setLocationRequestData] = useState<{
  serviceTitle: string;
  buyerName: string;
  offerId: string;
} | null>(null);
```

### Handler Functions
```typescript
const handleLocationRequestSendLocation = () => {
  // Trigger location share modal
  setLocationShareModalVisible(true);
};

const handleLocationRequestSendMessage = () => {
  // Pre-fill message input
  setMessage('Hi! I\'m ready to share my location for our meeting. ');
};

const handleLocationRequestClose = () => {
  setLocationRequestModalVisible(false);
  setLocationRequestData(null);
};
```

### Notification Data Structure
```typescript
{
  type: 'system',
  title: 'Location Request Required',
  message: `${buyerName} is waiting for your location for "${serviceTitle}"`,
  data: {
    chatId,
    participantId: serviceProviderId,
    participantName: buyerName,
    participantImage: buyerImage,
    offerId,
    serviceTitle,
    actionType: 'location_request',
  }
}
```

## Future Enhancements

1. **Scheduled Reminders**: Send push notifications after a certain time if location not shared
2. **Location Templates**: Pre-defined location templates for common meeting places
3. **Auto-location**: Option to automatically share current location
4. **Location History**: Quick access to previously shared locations
5. **Integration**: Connect with calendar apps for automatic location sharing

## Testing Scenarios

1. **Service Provider Flow**:
   - Complete payment as buyer
   - Switch to service provider account
   - Verify location request modal appears
   - Test all three action buttons

2. **Buyer Flow**:
   - Complete payment
   - Verify no location request modal appears
   - Check notification received

3. **Reminder Flow**:
   - Accept offer but don't share location
   - Close and reopen chat
   - Verify reminder modal appears

4. **Notification Flow**:
   - Check notification appears for service provider
   - Verify notification data structure
   - Test notification interaction
