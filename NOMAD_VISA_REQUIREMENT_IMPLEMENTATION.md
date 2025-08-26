# Nomad Visa Requirement Implementation

## Overview
This document outlines the implementation of the Nomad Visa requirement for users who use passports for eKYC verification during the bank statement upload process.

## Requirements
- **Trigger**: Nomad Visa requirement is automatically activated when the system detects a user is using a passport (not Malaysian IC) for eKYC verification
- **Visibility**: The Nomad Visa upload option is hidden for Malaysian IC users
- **Compulsory**: Bank statement uploading remains compulsory for all users regardless of document type
- **Conditional**: Nomad Visa upload is only required for passport users

## Database Changes

### Bank Statements Table
Added new fields to the `bank_statements` table:
- `nomad_visa_file_url` (TEXT): URL to uploaded nomad visa document
- `nomad_visa_required` (BOOLEAN): Whether nomad visa is required based on user document type
- `nomad_visa_uploaded` (BOOLEAN): Whether nomad visa has been uploaded

### Migration Applied
```sql
-- Add nomad visa fields to bank_statements table
ALTER TABLE bank_statements 
ADD COLUMN nomad_visa_file_url TEXT,
ADD COLUMN nomad_visa_required BOOLEAN DEFAULT FALSE,
ADD COLUMN nomad_visa_uploaded BOOLEAN DEFAULT FALSE;
```

## Code Changes

### 1. Types (`types/bank-statement.ts`)
Updated interfaces to include nomad visa fields:
- `BankStatement` interface: Added nomad visa fields
- `BankStatementFormData` interface: Added `nomad_visa_required` field

### 2. Bank Statement Service (`lib/bank-statement-service.ts`)
Enhanced `uploadBankStatement` method:
- Added `nomadVisaUri` parameter
- Added nomad visa file upload logic
- Stores nomad visa files in `nomad-visas/{userId}/` directory
- Updates database with nomad visa information

### 3. Bank Statement Upload Form (`app/bank-upload.tsx`)
Key changes:
- **Detection Logic**: Automatically detects passport users based on eKYC data
- **Conditional UI**: Shows nomad visa upload section only for passport users
- **Validation**: Requires nomad visa upload for passport users
- **User Experience**: Clear messaging about nomad visa requirement

#### Detection Logic
```typescript
// Determine if nomad visa is required based on document type
const isPassportUser = Boolean(ekycSubmission.passport_number && !ekycSubmission.ic_number);
```

#### UI Changes
- Added nomad visa upload section with image picker
- Updated info section to mention nomad visa requirement
- Added validation for nomad visa upload
- Enhanced user feedback and status indicators

### 4. Admin Interface (`app/admin/bank-statements.tsx`)
Enhanced admin review capabilities:
- **List View**: Shows nomad visa status (Required/Uploaded) for passport users
- **Detail View**: Displays nomad visa document in modal
- **Visual Indicators**: Color-coded status (green for uploaded, orange for required)
- **Missing Document Handling**: Shows placeholder when nomad visa not uploaded

## User Flow

### For Passport Users:
1. User completes eKYC with passport
2. User navigates to bank statement upload
3. System detects passport usage and shows nomad visa requirement
4. User uploads both bank statement and nomad visa
5. Both documents are submitted for admin review

### For Malaysian IC Users:
1. User completes eKYC with Malaysian IC
2. User navigates to bank statement upload
3. System detects IC usage and hides nomad visa requirement
4. User uploads only bank statement
5. Bank statement is submitted for admin review

### For Admins:
1. Admin views bank statement submissions
2. Passport users show nomad visa status indicator
3. Admin can view both bank statement and nomad visa documents
4. Admin can approve/reject based on both documents

## File Storage
- **Bank Statements**: `bank-statements/{userId}/{timestamp}.{extension}`
- **Nomad Visas**: `nomad-visas/{userId}/{timestamp}.{extension}`
- **Supported Formats**: JPG, PNG, PDF
- **Storage Bucket**: `documents` (Supabase Storage)

## Validation Rules
- Bank statement upload is always required
- Nomad visa upload is required only for passport users
- Form validation prevents submission without required documents
- File type validation for both documents

## Error Handling
- Clear error messages for missing nomad visa
- Graceful handling of upload failures
- User-friendly validation feedback
- Admin notification of incomplete submissions

## Service Provider Agreement Update
Updated section 2.1 to include:
> "For foreign passport holders: Provide Nomad Visa or equivalent residency permit during bank statement verification."

## Testing Scenarios
1. **Malaysian IC User**: Should not see nomad visa requirement
2. **Passport User**: Should see nomad visa requirement and validation
3. **Admin Review**: Should see both documents for passport users
4. **Validation**: Should prevent submission without required documents
5. **File Upload**: Should handle various file formats correctly

## Future Enhancements
- Support for additional visa types
- Automated visa validation
- Integration with immigration databases
- Enhanced document verification workflows
