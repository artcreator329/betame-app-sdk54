# Platform Fee Service Provider Display Fix

## Issue
The 2.2% platform fee was incorrectly being displayed on service provider transaction slips and deducted from their earnings. However, the platform fee should be paid by the buyer, not the service provider.

## Root Cause
The system was calculating and displaying platform fee deductions for service providers in:
1. Transaction slip PDFs (`lib/user-pdf-service.ts`)
2. Payment release receipts (`lib/payment-release-pdf-service.ts`, `lib/server-pdf-service.ts`)
3. Supabase Edge Function (`supabase/functions/generate-payment-release-pdf/index.ts`)
4. Orders page fee calculations (`app/(tabs)/orders.tsx`)

## Solution
Updated the fee structure to correctly reflect that:
- **Platform Fee (2.2%)**: Paid by buyer, NOT deducted from service provider
- **Service Fee (RM4.90 or 11%)**: The only fee deducted from service provider earnings

## Changes Made

### 1. Orders Page (`app/(tabs)/orders.tsx`)
- Set `platformFee = 0` for service provider calculations
- Updated `finalNetPayout` to only deduct service fee: `serviceAmount - serviceFee`
- Added comments explaining the fee structure

### 2. User PDF Service (`lib/user-pdf-service.ts`)
- Removed platform fee display from service provider transaction slips
- Replaced with HTML comment explaining the fee is paid by buyer

### 3. Payment Release PDF Service (`lib/payment-release-pdf-service.ts`)
- Updated fee calculation to exclude platform fee for service providers
- Changed display from "Platform Fee" to "Service Fee (RM4.90 or 11%)"
- Implemented proper service fee calculation (max of 11% or RM4.90)

### 4. Server PDF Service (`lib/server-pdf-service.ts`)
- Updated all three functions that generate receipts:
  - `generatePaymentReleaseHTML()`
  - `generateAndStorePDF()` 
  - `generateTextReceipt()`
- Applied same fee structure changes as other PDF services

### 5. Supabase Edge Function (`supabase/functions/generate-payment-release-pdf/index.ts`)
- Updated platform fee calculation and display
- Changed to show service fee instead of platform fee

### 6. Documentation Updates
- Updated `PAYMENT_RELEASE_FLOW.md`
- Updated `PAYMENT_RELEASE_IMPLEMENTATION.md`
- Corrected example calculations to show proper fee structure

## New Fee Structure for Service Providers

### Before (Incorrect)
```
Original Amount: RM 10.22
Platform Fee (2.2%): -RM 0.22
Service Fee (11%): -RM 1.12
Final Payout: RM 8.87
```

### After (Correct)
```
Original Amount: RM 10.22
Platform Fee (2.2%): -RM 0.00
Service Fee (RM4.90 or 11%): -RM 1.12
Final Payout: RM 9.10
```

*Platform fee (2.2%) shows as RM 0.00 because it's paid by buyer, not deducted from service provider*

## Impact
- Service providers now see correct transaction slips without platform fee deductions
- Service providers receive higher payouts (original amount minus only service fee)
- Platform fee remains transparent to buyers but hidden from service provider receipts
- All PDF generation services now consistently apply the correct fee structure

## Testing
To verify the fix:
1. Complete a service order as a service provider
2. Generate transaction slip from Orders page
3. Confirm platform fee is not displayed
4. Confirm final payout only deducts service fee (RM4.90 or 11%)

## Files Modified
- `app/(tabs)/orders.tsx`
- `lib/user-pdf-service.ts`
- `lib/payment-release-pdf-service.ts`
- `lib/server-pdf-service.ts`
- `supabase/functions/generate-payment-release-pdf/index.ts`
- `PAYMENT_RELEASE_FLOW.md`
- `PAYMENT_RELEASE_IMPLEMENTATION.md`