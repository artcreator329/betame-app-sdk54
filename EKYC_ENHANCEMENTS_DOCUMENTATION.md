r# eKYC Process Enhancements Documentation

## Overview
This document outlines the enhancements made to the eKYC (Electronic Know Your Customer) process in the BetaMe application, including bank statement verification, status tracking, and nationality-based document requirements.

## Bank Statement Upload Enhancements

### File Type Support
- **Currently Supported**: JPG and PNG image files for bank statement uploads
- **Planned Support**: PDF files (requires proper DocumentPicker integration)
- **File Type Detection**: Automatic detection of file types from URIs with fallback to JPEG
- **Storage Configuration**: Supabase storage bucket configured to accept image/jpeg, image/png, image/jpg, and application/pdf MIME types

### Upload Process Improvements
- **Proper File Handling**: Files are read as base64 and converted to ArrayBuffer for Supabase storage
- **Error Handling**: Enhanced error messages and validation for different file formats
- **User Experience**: Updated UI text to reflect support for multiple file formats

### Status Tracking and Service Provider Approval
- **Pending Status**: Bank statements are automatically set to "pending" status when submitted
- **Profile Integration**: Profile page shows "In Review" status when bank statement is pending
- **Automatic Approval**: Database triggers automatically update user's `is_service_provider` status when bank statement is approved
- **Real-time Updates**: Profile refreshes automatically to show current status via real-time subscriptions
- **Status Reversal**: If bank statement status changes from approved to other statuses, user loses service provider status

### Database Schema Updates
- **Profiles Table**: Added `is_service_provider` boolean field with default FALSE
- **Bank Statements Table**: Includes status tracking with `status`, `reviewed_by`, `reviewed_at`, and `admin_notes` fields
- **Automatic Triggers**: Database triggers automatically sync bank statement status with user profile

## Nationality-Based Document Requirements

### Foreigner Selfie Requirement ✅ **IMPLEMENTED & WORKING**
- **Automatic Detection**: When a foreigner is detected during eKYC (either manually selected or via AI analysis), the system automatically requires a "Selfie with Passport" on the Additional Documents page
- **Consistent Requirements**: Foreigners are always required to provide a selfie with their passport, regardless of what identity document was initially uploaded
- **AI Integration**: When AI auto-fill detects foreign nationality, the additional documents are automatically updated to reflect the foreigner requirements
- **Supabase Storage**: The "Selfie with Passport" document is properly stored in the `proof_of_address_url` field in the `ekyc_submissions` table
- **Database Verification**: Confirmed that foreigner submissions correctly store the selfie with passport in the database

### Malaysian Document Requirements
- **IC Users**: Malaysian IC users are required to provide both "IC Back" and "Selfie with IC"
- **Passport Users**: Malaysian passport users are required to provide "Selfie with Passport"
- **Default State**: When no identity document is uploaded yet, Malaysian users see IC requirements by default

### Code Changes

#### eKYC Verification (`app/ekyc-verification.tsx`)
```typescript
// Enhanced getAdditionalDocuments function with nationality consideration
const getAdditionalDocuments = (): DocumentType[] => {
  // For foreigners, always require selfie with passport regardless of what's uploaded
  if (personalInfo.nationality === 'foreigner') {
    return [
      {
        id: 'selfie_with_passport',
        name: 'Selfie with Passport',
        description: 'Photo of yourself holding your passport',
        required: true,
        uploaded: false,
        verified: false
      }
    ];
  }
  
  // For Malaysian nationals, check what document was uploaded
  // ... existing logic for Malaysian users
};

// Updated AI auto-fill functions to trigger additional document updates
const autoFillFormData = (extracted: any) => {
  // ... existing auto-fill logic
  
  // Update additional documents when nationality changes
  setTimeout(() => {
    updateAdditionalDocuments();
  }, 100);
};
```

#### Bank Statement Service (`lib/bank-statement-service.ts`)
```typescript
// Enhanced file type detection
private detectFileType(uri: string): { fileType: string; fileExtension: string; fileName: string }

// Updated upload method with status tracking
const { data, error: dbError } = await supabase
  .from('bank_statements')
  .insert({
    // ... other fields
    status: 'pending', // Set status to pending for review
  })
```

#### Profile Page (`app/(tabs)/profile.tsx`)
```typescript
// Added bank statement status tracking
const [bankStatement, setBankStatement] = useState<any>(null);
const [loadingBankStatement, setLoadingBankStatement] = useState(true);

// Real-time subscription for bank statement changes
useEffect(() => {
  const channel = supabase
    .channel(`bank-statement-changes:${user.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'bank_statements',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      refreshProfile();
      loadBankStatement();
    })
    .subscribe();
}, [user, refreshProfile, loadBankStatement]);

// Dynamic button text based on status
<Text style={[styles.becomeServiceProviderButtonText, { color: colors.text.white }]}>
  {bankStatement?.status === 'pending' ? 'In Review' : 'Become a Service Provider'}
</Text>

// Status-specific subtext
<Text style={[styles.becomeServiceProviderButtonSubtext, { color: colors.text.white }]}>
  {bankStatement?.status === 'pending' 
    ? 'Your bank statement is being reviewed' 
    : ekycSubmission?.status === 'approved' 
      ? 'Upload bank statement to verify your account' 
      : 'Complete eKYC verification first'
  }
</Text>
```

#### Database Migrations
```sql
-- Add is_service_provider column to profiles table
ALTER TABLE profiles ADD COLUMN is_service_provider BOOLEAN DEFAULT FALSE;

-- Create trigger function for automatic status updates
CREATE OR REPLACE FUNCTION update_user_service_provider_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles SET is_service_provider = TRUE WHERE id = NEW.user_id;
  END IF;
  
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE profiles SET is_service_provider = FALSE WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updates
CREATE TRIGGER bank_statement_status_trigger
  AFTER UPDATE ON bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_service_provider_status();
```

#### Bank Upload Screen (`app/bank-upload.tsx`)
```typescript
// Added document picker support for PDF files
import * as DocumentPicker from 'expo-document-picker';

// Updated file picker to support both images and PDFs
const result = await DocumentPicker.getDocumentAsync({
  type: ['image/*', 'application/pdf'],
  copyToCacheDirectory: true,
});
```

## User Flow

### Before Bank Statement Submission
1. User completes eKYC verification
2. Profile shows "Become a Service Provider" button
3. Button text: "Upload bank statement to verify your account"

### After Bank Statement Submission
1. User uploads bank statement image (JPG or PNG)
2. Status automatically set to "pending"
3. Profile shows "In Review" button
4. Button text: "Your bank statement is being reviewed"
5. Button is visually disabled (grayed out)
6. Clicking button shows "Bank Statement Under Review" alert

### After Bank Statement Approval
1. Admin approves bank statement in admin panel
2. Database trigger automatically updates user's `is_service_provider` to TRUE
3. Real-time subscription detects the change
4. Profile automatically refreshes
5. Profile shows "XXXX is a verified service provider" message
6. User can now create service listings

### Status States
- **No Bank Statement**: "Become a Service Provider" → "Upload bank statement to verify your account"
- **Pending Review**: "In Review" → "Your bank statement is being reviewed"
- **Approved**: "XXXX is a verified service provider" (user can create services)
- **Rejected**: User can resubmit (handled by admin)

## Technical Implementation

### Database Schema
The `bank_statements` table includes:
- `status`: Text field with values like 'pending', 'approved', 'rejected'
- `reviewed_by`: UUID of admin who reviewed the statement
- `reviewed_at`: Timestamp when review was completed
- `admin_notes`: Text field for admin comments

The `profiles` table includes:
- `is_service_provider`: Boolean field indicating service provider status

### Real-time Updates
- Profile page refreshes bank statement status on focus
- Pull-to-refresh updates all status information
- Automatic status checks when navigating to profile
- Real-time subscription to bank statement changes
- Automatic profile refresh when bank statement status changes

### Error Handling
- Graceful handling of missing bank statements
- Clear error messages for unsupported file types
- Fallback to default file type detection
- Proper handling of database trigger failures

## Testing

### File Upload Testing
- ✅ JPG files upload successfully
- ✅ PNG files upload successfully  
- ⏳ PDF files support planned (DocumentPicker integration needed)
- ✅ File type detection works correctly
- ✅ Storage bucket accepts all supported formats

### Status Display Testing
- ✅ "Become a Service Provider" shows before submission
- ✅ "In Review" shows after submission
- ✅ Button appearance changes appropriately
- ✅ Alert messages display correctly
- ✅ Status persists across app sessions

### Service Provider Approval Testing
- ✅ Database trigger automatically updates user profile when bank statement is approved
- ✅ Real-time subscription detects status changes
- ✅ Profile automatically refreshes to show "verified service provider" status
- ✅ User can create service listings after approval
- ✅ Status reversal works correctly (approved → pending removes service provider status)

## Future Enhancements

### Planned Features
- Email notifications when bank statement is reviewed
- Push notifications for status changes
- Admin dashboard for bank statement review
- Bulk status updates for multiple submissions
- Document preview in admin interface
- PDF file support via DocumentPicker integration
- Automated bank statement validation using OCR
- Integration with banking APIs for verification

### Potential Improvements
- OCR text extraction from bank statements
- Automated validation of account details
- Integration with banking APIs for verification
- Multi-language support for status messages
- Advanced admin review workflow with multiple approval stages
