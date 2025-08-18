# Mock Pages Testing Guide

This guide explains how to test the mock Malaysian payment gateway and eKYC verification pages that have been created for development and testing purposes.

## Overview

Two mock pages have been created to simulate real-world payment and verification flows while waiting for actual API integrations:

1. **Malaysian Payment Gateway** (`/malaysian-payment-gateway`)
2. **eKYC Verification** (`/ekyc-verification`)

## 1. Malaysian Payment Gateway

### Access
- Navigate to **Settings** → **Test Payment Gateway**
- Or directly visit `/malaysian-payment-gateway`

### Features
- **Payment Methods**: FPX (Online Banking), Touch 'n Go, GrabPay, Boost, Credit/Debit Cards
- **Bank Selection**: Major Malaysian banks (Maybank, CIMB, Public Bank, etc.)
- **Card Processing**: Credit card form with validation
- **Security Badge**: Shows secure payment messaging
- **Processing Flow**: Simulates payment processing with loading states
- **Success Confirmation**: Payment summary and completion

### Testing Flow
1. **Choose Payment Method**: Select from available Malaysian payment options
2. **Enter Details**: 
   - For FPX: Select your bank
   - For Credit Card: Enter card details (any valid format)
   - For eWallets: Shows redirect message
3. **Process Payment**: Click "Pay RM 152.50" (mock amount)
4. **View Success**: See payment confirmation and summary

### Mock Data
- **Payment Amount**: RM 150.00
- **Processing Fee**: RM 3.30 (2.2%)
- **Total**: RM 153.30
- **Processing Time**: 3 seconds simulation

## 2. eKYC Verification

### Access
- Navigate to **Settings** → **Become a service provider** → **Start eKYC Verification**
- Or directly visit `/ekyc-verification`

### Features
- **Multi-step Process**: Personal Info → Documents → Verification → Review → Complete
- **Progress Indicator**: Visual progress tracking
- **Document Upload**: Simulated document capture
- **Personal Information**: Malaysian IC format and address fields
- **Verification Simulation**: Mock processing with status updates
- **Review & Submit**: Final review before submission

### Testing Flow
1. **Personal Information**: Fill in all required fields
   - Full Name, IC Number, Date of Birth
   - Phone, Email, Address details
2. **Document Upload**: Click "Upload Document" for each required document
   - IC Front/Back, Selfie with IC (required)
   - Bank Statement (optional)
3. **Verification**: Watch the automated verification process
4. **Review**: Check all information before submission
5. **Submit**: Complete the verification process

### Required Documents
- **IC Front (MyKad)**: Front side of Malaysian Identity Card
- **IC Back (MyKad)**: Back side of Malaysian Identity Card  
- **Selfie with IC**: Photo holding your IC
- **Bank Statement**: Optional for payment verification

### Mock Validation
- All personal information fields are required
- Document uploads are simulated (no actual camera/gallery)
- Verification process takes 3 seconds
- Submission process takes 2 seconds

## Technical Implementation

### File Structure
```
app/
├── malaysian-payment-gateway.tsx    # Payment gateway mock
├── ekyc-verification.tsx            # eKYC verification mock
└── become-service-provider.tsx      # Updated with eKYC link
```

### Key Features
- **Responsive Design**: Works on mobile and web
- **Theme Support**: Dark/light mode compatible
- **Form Validation**: Client-side validation
- **Loading States**: Progress indicators and spinners
- **Error Handling**: User-friendly error messages
- **Navigation**: Seamless integration with existing app flow

### State Management
- **Payment Gateway**: Step-based navigation (method → details → processing → success)
- **eKYC**: Multi-step form with progress tracking
- **Form Data**: Local state management with validation

## Integration Notes

### When Real APIs Are Ready
1. **Payment Gateway**:
   - Replace mock payment methods with actual payment provider integration
   - Implement real bank selection and FPX integration
   - Add actual payment processing and webhook handling
   - Replace success simulation with real payment confirmation

2. **eKYC Verification**:
   - Integrate with actual eKYC service provider
   - Implement real document capture and upload
   - Add actual identity verification API calls
   - Replace mock processing with real verification status updates

### Current Limitations
- No actual payment processing
- No real document upload/capture
- No actual eKYC verification
- Mock data and simulated responses
- No backend integration

## Testing Scenarios

### Payment Gateway Testing
1. **Test all payment methods**: Try each payment option
2. **Form validation**: Test with invalid card details
3. **Bank selection**: Test FPX bank selection
4. **Processing flow**: Verify loading states and success
5. **Error handling**: Test with missing information

### eKYC Testing
1. **Complete flow**: Go through all steps
2. **Form validation**: Test required field validation
3. **Document upload**: Test document upload simulation
4. **Progress tracking**: Verify step completion
5. **Review process**: Check information accuracy

## Future Enhancements

### Payment Gateway
- Add more Malaysian payment methods
- Implement actual payment provider SDKs
- Add payment history and receipts
- Implement refund and dispute handling

### eKYC Verification
- Add actual document capture
- Implement real verification APIs
- Add verification status tracking
- Implement re-verification flow

## Support

For questions about these mock pages or integration requirements, please refer to the development team or create an issue in the project repository.

---

**Note**: These are development/testing pages and should not be used in production without proper API integration and security measures.
