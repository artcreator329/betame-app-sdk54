# Stone Purchase to Credit Purchase Migration

## Overview
This migration removes the ability to purchase stones directly and replaces it with credit purchase functionality. Users can now only purchase credits directly, while stones remain available through daily check-ins and can be converted to credits.

## Changes Made

### 1. Wallet Service Updates (`lib/wallet-service.ts`)
- **Removed**: `addStones()` method for stone purchases
- **Added**: `addCredits()` method for credit purchases
- **Updated**: Transaction type enum to remove `'stone_purchase'` and keep only `'credit_purchase'`

### 2. New Credit Purchase Component (`components/CreditPurchase.tsx`)
- **Created**: New component to handle credit purchases
- **Features**: 
  - Uses images from `assets/images/credit-purchase/` directory
  - Supports RM5, RM20, RM35, RM80, RM100, RM180 purchase options
  - Maps credit amounts based on price tiers
  - Modern UI with gradient backgrounds and selection states

### 3. Wallet Screen Updates (`app/wallet.tsx`)
- **Replaced**: `StoneMarketplace` import with `CreditPurchase`
- **Updated**: All "Buy Stones" buttons to "Purchase Credits"
- **Modified**: Stone balance card to remove purchase options
- **Enhanced**: Credit balance card with purchase functionality
- **Updated**: Alert messages to reference credit purchases instead of stone purchases

### 4. Payment Modal Updates
- **Updated**: `components/PaymentModal.tsx` - Changed "Buy Credits" to "Purchase Credits"
- **Updated**: `components/MalaysianPaymentModal.tsx` - Changed "Buy Credits" to "Purchase Credits"

### 5. Premium Features Marketplace Updates (`components/PremiumFeaturesMarketplace.tsx`)
- **Updated**: All feature costs from stones to credits
- **Changed**: `stoneCost` property to `creditCost`
- **Modified**: Price displays from "X Stones" to "X Credits"
- **Updated**: Insufficient balance alerts to reference credits instead of stones

### 6. Database Schema Updates
- **Created**: `database/remove_stone_purchase_type.sql` migration
- **Updated**: `database/create_wallet_tables.sql` to remove `stone_purchase` from enum
- **Removed**: `stone_purchase` transaction type from database schema

### 7. Documentation Updates
- **Updated**: `SUPABASE_SETUP.md` to remove stone purchase references
- **Updated**: `WALLET_FIX_SUMMARY.md` to reference credit purchases only

### 8. Component Cleanup
- **Deleted**: `components/StoneMarketplace.tsx` (no longer needed)

## Credit Purchase Tiers

The new credit purchase system uses the following tiers based on the images in `assets/images/credit-purchase/`:

| Image | Price | Credits | Value |
|-------|-------|---------|-------|
| RM5.png | RM 5 | 5 | 1:1 ratio |
| RM20.png | RM 20 | 20 | 1:1 ratio |
| RM35.png | RM 35 | 35 | 1:1 ratio |
| RM80.png | RM 80 | 80 | 1:1 ratio |
| RM100.png | RM 100 | 100 | 1:1 ratio |
| RM180.png | RM 180 | 180 | 1:1 ratio |

## User Experience Changes

### Before:
- Users could purchase stones directly
- Stones were the primary currency for premium features
- Complex conversion system from stones to credits

### After:
- Users can only purchase credits directly
- Credits are the primary currency for all premium features
- Stones are earned through daily check-ins and can be converted to credits
- Simplified purchase flow with direct credit acquisition

## Migration Steps

1. **Database Migration**: Run `database/remove_stone_purchase_type.sql` to update transaction types
2. **App Update**: Deploy the updated app with new credit purchase functionality
3. **User Communication**: Inform users about the new credit purchase system
4. **Monitor**: Check for any issues with the new purchase flow

## Benefits

1. **Simplified Economy**: Direct credit purchases eliminate confusion
2. **Better UX**: Users can directly buy what they need (credits) without conversion
3. **Clearer Pricing**: Direct RM to credit mapping is more transparent
4. **Reduced Complexity**: Fewer steps in the purchase process
5. **Better Monetization**: Direct credit sales may improve conversion rates

## Backward Compatibility

- Existing stones in user wallets remain functional
- Stone-to-credit conversion still available
- Daily check-in system continues to award stones
- No data loss for existing users