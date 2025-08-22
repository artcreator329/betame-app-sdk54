# Bank Statement Upload Feature Implementation

## Overview
This document outlines the implementation of the "Become a Service Provider" feature that requires users to upload bank statements for verification.

## Features Implemented

### 1. Database Schema
- **Table**: `bank_statements`
- **Fields**:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to auth.users)
  - `name` (TEXT, Account holder name)
  - `ic_number` (TEXT, IC number)
  - `bank_name` (TEXT, Bank name)
  - `bank_account_number` (TEXT, Bank account number)
  - `statement_file_url` (TEXT, URL to uploaded statement)
  - `status` (TEXT, 'pending' | 'approved' | 'rejected')
  - `admin_notes` (TEXT, Optional admin notes)
  - `reviewed_by` (UUID, Admin who reviewed)
  - `reviewed_at` (TIMESTAMP, Review timestamp)
  - `created_at` (TIMESTAMP, Creation timestamp)
  - `updated_at` (TIMESTAMP, Update timestamp)

### 2. Row Level Security (RLS) Policies
- Users can view their own bank statements
- Users can insert their own bank statements
- Users can update their own pending bank statements
- Admins can view all bank statements
- Admins can update all bank statements

### 3. User Interface Components

#### Bank Statement Upload Page (`/bank-statement-upload`)
- **Location**: `app/bank-statement-upload.tsx`
- **Features**:
  - Form for entering bank details (Name, IC, Bank Name, Account Number)
  - Image picker for uploading bank statement
  - Form validation
  - Upload progress indicator
  - Success/error feedback
  - Navigation back to profile

#### Admin Bank Statements Page (`/admin/bank-statements`)
- **Location**: `app/admin/bank-statements.tsx`
- **Features**:
  - List all bank statement submissions
  - Filter by status (pending, approved, rejected)
  - View statement images
  - Approve/reject submissions
  - Add admin notes
  - View user details

### 4. Services

#### Bank Statement Service (`lib/bank-statement-service.ts`)
- **Singleton pattern** for service management
- **Methods**:
  - `uploadBankStatement()` - Upload statement with form data
  - `getUserBankStatement()` - Get user's bank statement
  - `getAllBankStatements()` - Get all statements (admin)
  - `updateBankStatementStatus()` - Update status (admin)
  - `deleteBankStatement()` - Delete statement

### 5. TypeScript Types (`types/bank-statement.ts`)
- `BankStatement` - Main interface
- `BankStatementFormData` - Form data interface
- `BankStatementWithUser` - Extended interface with user data

### 6. Navigation Updates
- **Profile Page**: "Become a Service Provider" button now redirects to `/bank-statement-upload`
- **Admin Dashboard**: Added "Bank Statements" navigation item

## User Flow

### For Users:
1. User clicks "Become a Service Provider" on profile page
2. User is redirected to bank statement upload page
3. User fills in bank details form
4. User uploads bank statement image
5. Form validates all required fields
6. Image and data are uploaded to Supabase
7. User receives confirmation
8. User can check status on profile page

### For Admins:
1. Admin navigates to "Bank Statements" in admin dashboard
2. Admin views list of all submissions
3. Admin can filter by status
4. Admin clicks on submission to view details
5. Admin can view uploaded statement image
6. Admin can approve/reject with notes
7. Status is updated in database

## Technical Implementation Details

### Image Upload
- Uses Supabase Storage bucket `documents`
- File path: `bank-statements/{userId}/{timestamp}.jpg`
- Supports JPEG format
- Automatic public URL generation

### Form Validation
- Required fields: Name, IC, Bank Name, Account Number
- IC number format validation
- Bank account number format validation
- Image upload requirement

### Error Handling
- Network error handling
- Upload failure recovery
- Database error handling
- User-friendly error messages

### Security
- Row Level Security (RLS) policies
- User can only access their own data
- Admin access controls
- Secure file upload with proper permissions

## Files Created/Modified

### New Files:
- `app/bank-statement-upload.tsx` - Upload page
- `app/admin/bank-statements.tsx` - Admin review page
- `lib/bank-statement-service.ts` - Service layer
- `types/bank-statement.ts` - TypeScript types

### Modified Files:
- `app/(tabs)/profile.tsx` - Updated button navigation
- `app/admin/_layout.tsx` - Added navigation item

### Database:
- `bank_statements` table created with RLS policies

## Testing Considerations

### User Testing:
- Test form validation
- Test image upload
- Test navigation flow
- Test error scenarios

### Admin Testing:
- Test submission review
- Test status updates
- Test filtering
- Test image viewing

### Security Testing:
- Verify RLS policies
- Test user access controls
- Test admin permissions

## Future Enhancements

### Potential Improvements:
1. **OCR Integration**: Automatically extract bank details from uploaded images
2. **Multiple Bank Support**: Allow users to add multiple bank accounts
3. **Document Verification**: Integration with bank verification APIs
4. **Email Notifications**: Notify users of approval/rejection
5. **Bulk Operations**: Admin bulk approve/reject functionality
6. **Audit Trail**: Track all status changes with timestamps
7. **Document Expiry**: Set expiration dates for uploaded documents

### Performance Optimizations:
1. **Image Compression**: Compress uploaded images
2. **Lazy Loading**: Load images on demand in admin panel
3. **Pagination**: Implement pagination for large datasets
4. **Caching**: Cache frequently accessed data

## Deployment Notes

### Prerequisites:
- Supabase project with Storage enabled
- `documents` storage bucket created
- Proper RLS policies configured

### Environment Variables:
- Ensure Supabase URL and keys are configured
- Verify storage bucket permissions

### Testing Checklist:
- [ ] User can upload bank statement
- [ ] Admin can review submissions
- [ ] Status updates work correctly
- [ ] RLS policies are enforced
- [ ] Error handling works properly
- [ ] Navigation flows correctly

## Support and Maintenance

### Monitoring:
- Monitor upload success rates
- Track admin review times
- Monitor storage usage
- Check for failed uploads

### Maintenance:
- Regular cleanup of old rejected submissions
- Monitor storage bucket usage
- Update RLS policies as needed
- Review and update validation rules
