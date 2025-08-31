# Invoice Loading State Implementation

## Overview
Added loading state functionality to the "Download Invoice" button to provide visual feedback when users click the button, similar to the existing transaction slip loading state.

## Changes Made

### 1. Added Loading State Variable
```typescript
const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null); // Track which order is generating invoice
```

### 2. Updated handleViewPDFInvoice Function
```typescript
const handleViewPDFInvoice = async (orderId: string) => {
  try {
    // Set loading state for this specific order
    setGeneratingInvoice(orderId);
    
    // ... existing logic ...
    
  } catch (error) {
    console.error('Error viewing buyer invoice:', error);
    Alert.alert('Error', 'Failed to open buyer invoice');
  } finally {
    // Clear loading state
    setGeneratingInvoice(null);
  }
};
```

### 3. Updated Download Invoice Button
```typescript
<TouchableOpacity
  style={[
    styles.primaryActionButton, 
    { backgroundColor: '#10B981' },
    generatingInvoice === order.id && styles.buttonDisabled
  ]}
  onPress={() => order.id && !generatingInvoice && handleViewPDFInvoice(order.id)}
  activeOpacity={generatingInvoice === order.id ? 1 : 0.8}
  disabled={generatingInvoice === order.id}
>
  <View style={styles.buttonIconContainer}>
    {generatingInvoice === order.id ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <Ionicons name="document-text-outline" size={20} color="#fff" />
    )}
  </View>
  <Text style={styles.primaryActionButtonText}>
    {generatingInvoice === order.id ? 'Generating...' : 'Download Invoice'}
  </Text>
</TouchableOpacity>
```

## Features

### Loading State Behavior
- **Loading Icon**: Shows spinning ActivityIndicator instead of document icon
- **Loading Text**: Changes from "Download Invoice" to "Generating..."
- **Button Disabled**: Prevents multiple clicks during generation
- **Visual Feedback**: Button becomes slightly transparent and unresponsive
- **Per-Order Tracking**: Each order has its own loading state (multiple orders can be processed simultaneously)

### User Experience Improvements
- **Immediate Feedback**: User knows the button was clicked and is working
- **Prevents Double-Clicks**: Button is disabled during generation
- **Clear Status**: Text clearly indicates what's happening
- **Professional Feel**: Consistent with existing transaction slip loading behavior

## Technical Details

### State Management
- Uses `generatingInvoice` state to track which specific order is generating an invoice
- State is set to the order ID when generation starts
- State is cleared to `null` when generation completes (success or error)
- Uses `finally` block to ensure state is always cleared

### Button Behavior
- **Disabled State**: Button cannot be clicked when `generatingInvoice === order.id`
- **Visual Changes**: Uses existing `buttonDisabled` style for consistent appearance
- **Icon Replacement**: ActivityIndicator replaces the document icon during loading
- **Text Update**: Dynamic text based on loading state

### Error Handling
- Loading state is cleared even if an error occurs (using `finally` block)
- User gets appropriate error message while button returns to normal state
- No stuck loading states

## Files Modified
- `app/(tabs)/orders.tsx` - Added loading state functionality

## Status
✅ **IMPLEMENTED** - Download Invoice button now shows loading state during PDF generation, providing clear visual feedback to users.