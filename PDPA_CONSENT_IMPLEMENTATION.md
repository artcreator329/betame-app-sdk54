# PDPA Consent Implementation for eKYC Verification

This document outlines the comprehensive implementation of Malaysian Personal Data Protection Act (PDPA) consent requirements for the eKYC verification system in the BetaMe application.

## Overview

The implementation ensures full compliance with Malaysia's Personal Data Protection Act 2010 by requiring explicit user consent before processing any personal data for eKYC verification purposes.

## Key Features

### 1. Real Name Input Modal
- **File**: `components/RealNameInputModal.tsx`
- **Purpose**: Collects user's real name before PDPA consent
- **Features**:
  - Validates real name format (letters and spaces only)
  - Clear requirements and examples
  - Privacy notice about name usage
  - Integration with PDPA consent flow

### 2. Comprehensive PDPA Consent Modal
- **File**: `components/PDPAConsentModal.tsx`
- **Purpose**: Displays detailed PDPA consent information before eKYC verification
- **Features**:
  - Clear explanation of data collection and usage
  - User rights under PDPA
  - Data retention and security policies
  - Explicit consent checkboxes
  - Accept/Decline options
  - Uses real name in consent form
  - Generates signed PDF document upon consent

### 3. PDPA Consent PDF Service
- **File**: `lib/pdpa-consent-pdf-service.ts`
- **Purpose**: Generates and stores signed PDPA consent PDF documents
- **Features**:
  - Professional PDF generation with user's real name
  - Digital signature with timestamp
  - Secure storage in Supabase
  - Audit trail with document ID
  - Download functionality for users

### 4. Integration with eKYC Flow
- **File**: `app/ekyc-verification.tsx`
- **Integration Points**:
  - Shows real name input modal before PDPA consent
  - Shows PDPA consent modal after real name is provided
  - Generates and stores PDF upon consent acceptance
  - Tracks consent status and PDF URL throughout the process
  - Validates both real name and consent before submission
  - Visual indicators of consent status with download option

### 5. Database Schema Updates
- **Migration**: `database/add_pdpa_consent_fields.sql`
- **New Fields**:
  - `pdpa_consent_given` (BOOLEAN)
  - `pdpa_consent_given_at` (TIMESTAMP)
  - `pdpa_consent_pdf_url` (TEXT)
- **Constraints**: Ensures timestamp is set when consent is given

### 6. PDPA Consents Table
- **Migration**: `database/create_pdpa_consents_table.sql`
- **Purpose**: Dedicated table for PDPA consent records and PDF documents
- **Features**:
  - Complete audit trail of all consent records
  - PDF document URLs and metadata
  - User consent history
  - Admin access for compliance monitoring

## Implementation Details

### PDPA Consent Modal Features

#### 1. Comprehensive Information Display
```typescript
// What Personal Data We Will Collect
- Identity Documents (IC/Passport)
- Liveness Verification (Selfie with document)
- Personal Information (Name, DOB, Address, etc.)
```

#### 2. Clear Usage Purposes
```typescript
// How We Will Use Your Data
- eKYC compliance verification
- Malaysian regulatory requirements
- Fraud prevention and security
- Verified service provider status
```

#### 3. Data Security & Retention
```typescript
// Data Retention and Security
- Secure encrypted processing
- Temporary storage during verification
- Automatic deletion after verification
```

#### 4. User Rights Under PDPA
```typescript
// Your Rights Under PDPA
- Right to access personal data
- Right to correct inaccurate data
- Right to withdraw consent
- Right to lodge complaints
```

### Consent Flow Integration

#### 1. Pre-Verification Consent Check
```typescript
// Before starting eKYC verification
if (!pdpaConsentGiven) {
  setShowPDPAConsent(true);
  return;
}
```

#### 2. Consent Validation
```typescript
// Before submission
if (!pdpaConsentGiven) {
  Alert.alert('PDPA Consent Required', 'You must provide PDPA consent before proceeding.');
  setShowPDPAConsent(true);
  return;
}
```

#### 3. Consent Tracking
```typescript
// Store consent with submission
const submissionData = {
  // ... other fields
  pdpa_consent_given: pdpaConsentGiven,
  pdpa_consent_given_at: pdpaConsentGiven ? new Date().toISOString() : undefined
};
```

### Database Schema

#### ekyc_submissions Table Updates
```sql
-- New PDPA consent fields
ALTER TABLE ekyc_submissions 
ADD COLUMN pdpa_consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN pdpa_consent_given_at TIMESTAMP WITH TIME ZONE;

-- Constraint to ensure data integrity
ALTER TABLE ekyc_submissions 
ADD CONSTRAINT check_pdpa_consent_timestamp 
CHECK (
    (pdpa_consent_given = FALSE) OR 
    (pdpa_consent_given = TRUE AND pdpa_consent_given_at IS NOT NULL)
);
```

## User Experience Flow

### 1. Initial Access
1. User navigates to eKYC verification
2. System checks for existing consent
3. If no consent, real name input modal is displayed first

### 2. Real Name Collection
1. User enters their real name as it appears on official documents
2. System validates name format (letters and spaces only)
3. User confirms their real name for PDPA consent

### 3. Consent Process
1. User reads comprehensive PDPA information (using their real name)
2. User must check both consent boxes:
   - "I have read and understood the PDPA consent notice"
   - "I consent to the processing of my personal data"
3. User clicks "Accept & Continue" or "Decline"
4. System generates signed PDF document with user's consent
5. PDF is stored securely and linked to eKYC submission

### 4. Verification Process
1. If consent given, proceed to eKYC verification
2. If consent declined, return to previous screen
3. Consent status is tracked throughout the process

### 5. Visual Indicators
- **Terms Step**: Shows both real name and PDPA consent status
- **Success State**: Green checkmark when both provided
- **Download Option**: PDF download button when consent is provided
- **Warning State**: Red alert when either is required

## Compliance Features

### 1. Explicit Consent
- Users must actively check consent boxes
- Cannot proceed without consent
- Clear explanation of what consent means

### 2. Right to Withdraw
- Contact information provided: `privacy@betame.com.my`
- Users can withdraw consent at any time
- Clear withdrawal process

### 3. Data Minimization
- Only collects necessary data for eKYC
- Temporary storage during verification
- Automatic deletion after verification
- PDPA consent PDFs stored for legal compliance

### 4. Transparency
- Clear explanation of data usage
- User rights under PDPA
- Contact information for questions

## Security Measures

### 1. Data Encryption
- All personal data encrypted in transit and at rest
- Secure processing environment
- Access controls and audit trails

### 2. Data Retention
- Temporary storage only during verification
- Automatic deletion after verification completion
- No long-term storage of sensitive documents

### 3. Access Controls
- Row-level security policies
- User can only access their own data
- Admin access for verification purposes only

## Testing Scenarios

### 1. New User Flow
- Navigate to eKYC verification
- PDPA modal should appear
- Cannot proceed without consent
- Consent should be tracked

### 2. Returning User Flow
- If consent already given, proceed directly
- If consent not given, show modal again
- Consent status should persist

### 3. Consent Withdrawal
- User should be able to decline
- Should return to previous screen
- No data should be processed

### 4. Database Validation
- Consent fields should be properly stored
- Timestamp should be set when consent given
- Constraint should prevent invalid states

## Monitoring and Auditing

### 1. Consent Tracking
- Track consent rates and timing
- Monitor consent withdrawal rates
- Audit consent timestamps

### 2. Compliance Monitoring
- Ensure all eKYC submissions have consent
- Monitor for consent-related issues
- Regular compliance reviews

### 3. User Feedback
- Monitor user questions about consent
- Track consent-related support requests
- Continuous improvement based on feedback

## Future Enhancements

### 1. Consent Management Dashboard
- Allow users to view/manage their consent
- Provide consent history
- Enable consent withdrawal

### 2. Multi-language Support
- Translate consent form to multiple languages
- Support for different regional requirements
- Localized privacy policies

### 3. Advanced Consent Options
- Granular consent for different data types
- Time-limited consent options
- Consent renewal notifications

## Conclusion

This implementation provides comprehensive PDPA compliance for the eKYC verification system, ensuring that:

1. **Users are fully informed** about data collection and usage
2. **Explicit consent is obtained** before any data processing
3. **User rights are protected** under Malaysian law
4. **Data security is maintained** throughout the process
5. **Compliance is verifiable** through proper tracking and auditing

The system now meets all requirements of Malaysia's Personal Data Protection Act 2010 while providing a smooth user experience for eKYC verification.
