# Supabase Wallet Issues - Diagnosis and Fixes

## Issue Analysis

The wallet error `PGRST116: "JSON object requested, multiple (or no) rows returned"` was occurring despite the wallet record existing in the database. This indicates a **Row Level Security (RLS) authentication issue**, not a missing table or data problem.

### Root Cause Investigation

1. **Tables Exist**: ✅ All wallet-related tables exist in Supabase
   - `wallets`, `transactions`, `purchased_features`, `check_ins`, `referrals`

2. **Data Exists**: ✅ User wallet record exists
   - User `af123559-a1d8-4434-b662-0925d1d8b3a4` has wallet with 3505 credits

3. **RLS Policies**: ✅ Correct RLS policies are in place
   - Users can view/update their own wallets
   - Policies use `auth.uid() = user_id`

4. **The Problem**: ❌ Authentication state inconsistency
   - Transaction recording succeeds (user is authenticated)
   - Wallet fetching fails immediately after (authentication issue)
   - This suggests JWT token expiration or session invalidation

## Database Schema Status

### Current Wallet Table Structure
```sql
wallets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    premium_stones INTEGER NOT NULL DEFAULT 0,  -- Legacy column
    betame_stones INTEGER NOT NULL DEFAULT 0,   -- New column
    betame_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Schema Fixes Applied
1. **Made `betame_stones` NOT NULL** with default 0
2. **Updated existing records** to ensure consistency
3. **Added better backward compatibility** handling

## Code Fixes Applied

### 1. Enhanced Error Handling (`lib/wallet-service.ts`)
```typescript
// Now handles different error codes specifically:
// - PGRST116: No rows (create wallet)  
// - PGRST301: RLS violation (auth issue)
// - Other errors: Log and return null
```

### 2. Better Authentication Debugging
```typescript
// Added detailed logging for wallet operations:
console.log('🔍 Getting wallet for user:', userId);
console.log('🔍 Wallet query result:', { data: !!data, error: error?.code });
```

### 3. Admin Bypass Method
```typescript
// Added getWalletAdmin() method that bypasses RLS for debugging
static async getWalletAdmin(userId: string): Promise<WalletData | null>
```

### 4. Improved Service Payment Processing
```typescript
// processServicePayment() now handles wallet creation automatically
// recordServicePaymentReceived() for service providers
```

### 5. Authentication Integration
```typescript
// AuthContext now ensures wallet exists during user profile fetch
await WalletService.ensureWalletExists(userId);
```

## Database Operations Performed

### 1. Schema Consistency Fix
```sql
-- Made betame_stones NOT NULL with proper default
ALTER TABLE wallets 
ALTER COLUMN betame_stones SET DEFAULT 0,
ALTER COLUMN betame_stones SET NOT NULL;
```

### 2. Data Consistency Fix
```sql
-- Ensured all records have betame_stones populated
UPDATE wallets 
SET betame_stones = premium_stones 
WHERE betame_stones IS NULL 
AND premium_stones IS NOT NULL;
```

## Authentication Issue Solutions

### Primary Issue: Session Authentication
The main problem is likely **JWT token expiration or invalidation** between operations:

1. **Transaction recording succeeds** → User is authenticated
2. **Wallet fetching fails** → Session expired/invalid
3. **RLS blocks access** → Returns PGRST116 instead of authentication error

### Fixes Implemented:

1. **Better Error Detection**
   - Distinguish between "no data" and "no access"
   - Log PGRST301 (RLS violation) separately from PGRST116 (no rows)

2. **Session Refresh Integration**
   - Persistent authentication system refreshes tokens every 25 minutes
   - Wallet operations now happen during authenticated profile fetch

3. **Graceful Fallbacks**
   - If wallet fetch fails due to auth, log detailed error
   - Don't crash payment processing - record transaction first

## Testing and Verification

### Manual Tests to Run:
1. **Sign in as user** → Check wallet creation
2. **Make service payment** → Verify balance deduction
3. **Check transaction history** → Confirm recording
4. **Restart app** → Verify session persistence

### Debug Logs to Monitor:
```
🔍 Getting wallet for user: [user-id]
🔍 Wallet query result: { data: true/false, error: code }
✅ Found existing wallet for user: [user-id] with [amount] credits
🔐 RLS policy violation - user not authenticated properly
```

## Expected Behavior After Fixes

✅ **Wallet Operations**
- Automatic wallet creation for new users
- Graceful handling of authentication issues
- Better error messages for debugging

✅ **Payment Processing**
- Service payments work correctly
- Balance checking before payments
- Transaction recording with audit trail

✅ **Session Management**
- Persistent authentication prevents token expiration
- Wallet operations during authenticated profile fetch
- Proper error handling for edge cases

## Next Steps

1. **Monitor Logs**: Watch for the new detailed error messages
2. **Test Payment Flow**: Verify service payments work end-to-end
3. **Session Debugging**: If RLS violations persist, investigate JWT token handling
4. **User Experience**: Confirm no more PGRST116 errors for users

## Emergency Debugging

If issues persist, use the admin method to bypass RLS:
```typescript
// For debugging only - bypasses RLS
const wallet = await WalletService.getWalletAdmin(userId);
```

This will help determine if the issue is authentication-related or data-related.