# Structured Inquiry System Implementation

## Overview

The structured inquiry system allows users to send detailed service inquiries by selecting specific service variants, distinguishing them from service offers with a purple color scheme.

## Features Implemented

### 1. Service Variant Selection Modal (`ServiceVariantSelectionModal.tsx`)

**Purpose**: Allows users to select from available service variants when sending a structured inquiry.

**Key Features**:
- Displays main service and all available variants
- Shows service details (title, description, price, category, location)
- Handles loading states and error cases
- Provides clear variant selection interface

**Usage**:
```typescript
<ServiceVariantSelectionModal
  visible={serviceVariantSelectionModalVisible}
  onClose={handleServiceVariantSelectionCancel}
  onVariantSelect={handleServiceVariantSelected}
  serviceId={inquiryServiceData?.serviceId || ''}
  serviceTitle={inquiryServiceData?.serviceTitle || ''}
/>
```

### 2. Purple Color Scheme for Inquiries

**Purpose**: Visually distinguish structured inquiries from service offers (green) using purple colors.

**Color Palette**:
- Background: `#F3E8FF` (Light purple)
- Border: `#9333EA` (Purple)
- Text: `#9333EA` (Purple)
- Buttons: `#9333EA` (Purple)

**Updated Components**:
- `StructuredInquiryMessage.tsx` - Purple styling for received inquiries
- `StructuredInquiryDraft.tsx` - Purple styling for draft inquiries

### 3. Enhanced Chat Integration

**Purpose**: Seamlessly integrate structured inquiries into the chat system.

**Key Updates**:
- Added service variant selection modal state management
- Updated structured inquiry handling to show variant selection
- Enhanced message rendering to support structured inquiry type
- Added proper navigation flow for inquiry cancellation

**Message Flow**:
1. User navigates to service with `structuredInquiry=true` parameter
2. Service variant selection modal appears
3. User selects a variant
4. Purple-colored inquiry draft is created
5. User reviews and sends the inquiry
6. Inquiry appears as purple message in chat

### 4. Message Type Support

**Supported Message Types**:
- `text` - Regular text messages
- `service` - Service sharing messages
- `offer` - Service offers (green)
- `structured_inquiry` - Structured inquiries (purple)
- `job_offer` - Job application offers

### 5. Database Integration

**Message Storage**:
- Structured inquiries are stored with `message_type: 'structured_inquiry'`
- Service variant data is stored in the message content as JSON
- Maintains compatibility with existing chat system

## Implementation Details

### Chat Screen Updates (`app/chat/[participantId].tsx`)

**New State Variables**:
```typescript
const [serviceVariantSelectionModalVisible, setServiceVariantSelectionModalVisible] = useState(false);
const [inquiryServiceData, setInquiryServiceData] = useState<{
  serviceId: string;
  serviceTitle: string;
} | null>(null);
```

**New Handler Functions**:
- `handleServiceVariantSelected()` - Processes selected variant
- `handleServiceVariantSelectionCancel()` - Handles modal cancellation
- `renderMessage()` - Enhanced message rendering with structured inquiry support

**Updated Effects**:
- Modified structured inquiry handling to show variant selection modal
- Added proper cleanup and navigation handling

### Service Integration

**ServiceService Integration**:
- Uses existing `getServiceById()` method to fetch service with variants
- Leverages existing service variant structure
- Maintains compatibility with current service system

**Variant Structure**:
- Main services have `parent_service_id: null`
- Variants have `parent_service_id: <main_service_id>`
- All variants inherit from main service structure

## User Experience Flow

### For Service Inquiries:

1. **Service Discovery**: User finds a service they're interested in
2. **Inquiry Initiation**: User taps "Send Structured Inquiry" button
3. **Variant Selection**: Modal shows main service and available variants
4. **Variant Choice**: User selects the specific variant they want to inquire about
5. **Draft Review**: Purple-colored inquiry draft appears with selected variant details
6. **Send Inquiry**: User reviews and sends the structured inquiry
7. **Chat Integration**: Inquiry appears as purple message in chat conversation

### Visual Distinction:

- **Service Offers**: Green color scheme (existing)
- **Structured Inquiries**: Purple color scheme (new)
- **Regular Messages**: Standard chat colors
- **Job Offers**: Existing job offer styling

## Technical Benefits

### 1. Clear Visual Separation
- Users can easily distinguish between offers and inquiries
- Purple color provides clear visual hierarchy
- Consistent color scheme across all inquiry components

### 2. Enhanced User Experience
- Service variant selection provides specific inquiry context
- Draft review allows users to confirm before sending
- Seamless integration with existing chat system

### 3. Scalable Architecture
- Modular component design allows easy extension
- Consistent with existing message type system
- Maintains backward compatibility

### 4. Robust Error Handling
- Graceful handling of missing services or variants
- Clear error messages for users
- Proper loading states during data fetching

## Testing

### Automated Testing
Run the test script to verify system functionality:
```bash
node scripts/test-structured-inquiry.js
```

### Manual Testing Steps
1. Navigate to a service detail page
2. Tap "Send Structured Inquiry" option
3. Verify service variant selection modal appears
4. Select a service variant
5. Confirm purple-colored inquiry draft appears
6. Send the inquiry
7. Verify purple message appears in chat
8. Test with services that have multiple variants
9. Test with services that have no variants

## Future Enhancements

### Potential Improvements:
1. **Rich Inquiry Templates**: Pre-defined inquiry templates for different service types
2. **Inquiry Analytics**: Track inquiry response rates and conversion
3. **Smart Suggestions**: AI-powered inquiry content suggestions
4. **Inquiry Status**: Track inquiry read/response status
5. **Bulk Inquiries**: Allow inquiries to multiple service providers
6. **Inquiry Scheduling**: Schedule inquiries for optimal timing

### Integration Opportunities:
1. **Notification System**: Enhanced notifications for structured inquiries
2. **Search Integration**: Filter services by inquiry response rate
3. **Profile Integration**: Show inquiry history in user profiles
4. **Analytics Dashboard**: Service provider inquiry analytics

## Conclusion

The structured inquiry system provides a comprehensive solution for users to send detailed service inquiries with clear visual distinction from service offers. The purple color scheme ensures users won't confuse inquiries with offers, while the service variant selection provides specific context for each inquiry.

The implementation maintains consistency with the existing chat system while adding powerful new functionality that enhances the user experience for both service seekers and providers.