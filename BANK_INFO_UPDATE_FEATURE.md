# Bank Information Update Feature

## Overview
This feature allows verified service providers to update their bank information (bank name and account number) while maintaining security by keeping name and ID number read-only.

## Features Implemented

### 1. User Interface

#### Settings Page Integration
- **Location**: `app/settings.tsx`
- **Button**: "Update Bank Information" (only visible to service providers)
- **Icon**: Building2 icon from Lucide React
- **Condition**: Only shows when `userProfile?.is_service_provider` is true

#### Bank Information Update Page
- **Location**: `app/update-bank-info.tsx`
- **Features**:
  - Loads current bank statement data
  - Shows read-only fields for name and IC number
  - Editable fields for bank name and account number
  - Form validation
  - Success/error feedback
  - Clear user guidance about status reset

### 2. Service Layer

#### Bank Information Service
- **Location**: `lib/bank-info-service.ts`
- **Methods**:
  - `getBankInfo(userId)` - Retrieve current bank information
  - `updateBankInfo(userId, updates)` - Update bank name and account number
  - `isEligibleForUpdate(userId)` - Check if user can update bank info
  - `getUpdateHistory(userId)` - Get update history (for future use)

### 3. Database Schema

#### Bank Statements Table
- **Existing Fields**: All existing bank statement fields remain unchanged
- **Update Logic**: Only `bank_name` and `bank_account_number` can be updated
- **Security**: Name and IC number remain read-only

#### Database Triggers
- **Function**: `reset_bank_statement_status_on_update()`
- **Purpose**: Automatically resets status to 'pending' when bank info is updated
- **Behavior**: 
  - Clears `reviewed_by`, `reviewed_at`, and `admin_notes`
  - Sets status back to 'pending' for admin review
  - Ensures all updates go through proper verification process

### 4. Security Features

#### Access Control
- Only service providers can see the update button
- Only users with approved bank statements can update information
- Name and ID number are completely read-only

#### Validation
- Bank name is required and must be trimmed
- Bank account number is required and must be trimmed
- Only approved bank statements can be updated

#### Status Management
- Updates automatically reset status to 'pending'
- Requires admin review before re-approval
- Maintains audit trail of changes

## User Flow

### 1. Accessing the Feature
1. User navigates to Settings page
2. If user is a service provider, "Update Bank Information" button is visible
3. User taps the button to access the update page

### 2. Update Process
1. System loads current bank statement data
2. User sees read-only name and IC number fields
3. User can edit bank name and account number
4. User submits the form
5. System validates the input
6. Database trigger resets status to 'pending'
7. User receives confirmation message

### 3. Post-Update
1. Bank statement status is reset to 'pending'
2. Admin must review the updated information
3. User's service provider status may be temporarily affected
4. Admin can approve or reject the changes

## Error Handling

### Common Scenarios
- **No Bank Statement**: Redirects to bank statement upload
- **Not a Service Provider**: Button not visible
- **No Approved Statement**: Shows error message
- **Validation Errors**: Clear error messages for each field
- **Network Errors**: Graceful error handling with retry options

### User Feedback
- Loading states during data fetch and save operations
- Clear success messages with status information
- Informative error messages with actionable guidance

## Integration Points

### Profile Page
- Real-time updates when bank statement status changes
- Automatic refresh of service provider status
- Consistent user experience across the app

### Admin Panel
- Admins can review updated bank information
- Status tracking for pending updates
- Ability to approve or reject changes

## Future Enhancements

### Potential Improvements
1. **Update History**: Show history of bank information changes
2. **Email Notifications**: Notify admins of pending updates
3. **Bulk Updates**: Allow admins to process multiple updates
4. **Audit Logging**: Enhanced tracking of who made changes and when
5. **Mobile Verification**: SMS verification for sensitive changes

### Security Enhancements
1. **Two-Factor Authentication**: Require 2FA for bank info updates
2. **Document Verification**: Require new bank statement for major changes
3. **Rate Limiting**: Prevent excessive update attempts
4. **IP Tracking**: Log IP addresses for security monitoring

## Technical Notes

### Database Triggers
The system uses PostgreSQL triggers to automatically manage status changes:
- Triggers fire before updates to bank_statements table
- Automatically reset status to 'pending' when bank info changes
- Maintain data integrity and security

### Service Architecture
- Singleton pattern for service management
- Comprehensive error handling and validation
- Type-safe interfaces for all operations
- Consistent API responses across all methods

### UI/UX Considerations
- Consistent with existing app design patterns
- Clear visual distinction between read-only and editable fields
- Informative messaging about status changes
- Responsive design for all screen sizes
