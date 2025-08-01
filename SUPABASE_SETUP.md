# Supabase Integration Setup

This document outlines the Supabase integration setup for the BetaMe app.

## Configuration

### Environment Variables

The following environment variables are configured in `.env.local`:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://rkcfgebgpixgfvggbwmc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=<REDACTED>

# Project Configuration
SUPABASE_PROJECT_ID=rkcfgebgpixgfvggbwmc
SUPABASE_ACCESS_TOKEN=<REDACTED_SUPABASE_ACCESS_TOKEN>
```

### Supabase Client

The Supabase client is configured in `lib/supabase.ts` with:
- Standard client for user operations
- Admin client for server-side operations
- Environment variable support for secure configuration

## Database Schema

### Tables Created

#### `wallets`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `premium_stones` (Integer, default: 0)
- `betame_credits` (Integer, default: 0)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `transactions`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `type` (Text, enum: 'conversion', 'boost_purchase', 'stone_purchase', 'credit_purchase')
- `amount` (Integer)
- `description` (Text)
- `created_at` (Timestamp)

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own wallet and transaction data
- Automatic wallet creation for new users (10 stones, 5 credits)
- Automatic timestamp updates

## Wallet Service

The `WalletService` class in `lib/wallet-service.ts` provides:

### Methods

- `getWallet(userId)` - Retrieve user's wallet data
- `updateWallet(walletData)` - Update wallet balances
- `convertStonesToCredits(userId, stonesAmount)` - Convert stones to credits
- `purchaseBoost(userId, boostCost, boostTitle)` - Purchase visibility boosts
- `recordTransaction(transaction)` - Record transaction history
- `getTransactionHistory(userId)` - Get user's transaction history

### Usage Example

```typescript
import { WalletService } from '../lib/wallet-service';

// Get user's wallet
const wallet = await WalletService.getWallet(userId);

// Convert stones to credits
const result = await WalletService.convertStonesToCredits(userId, 20);
if (result.success) {
  console.log('Conversion successful:', result.wallet);
} else {
  console.error('Conversion failed:', result.error);
}

// Purchase boost
const boostResult = await WalletService.purchaseBoost(userId, 50, '2x Visibility!');
if (boostResult.success) {
  console.log('Boost purchased:', boostResult.wallet);
}
```

## Remote Configuration

This project uses **remote Supabase only** - no local development setup is required. All database operations are performed directly against the production Supabase instance.

### Project Details
- **Project URL**: https://rkcfgebgpixgfvggbwmc.supabase.co
- **Project ID**: rkcfgebgpixgfvggbwmc
- **Dashboard**: https://supabase.com/dashboard/project/rkcfgebgpixgfvggbwmc

## Next Steps

1. **Authentication Integration**: Set up Supabase Auth for user management
2. **Real-time Updates**: Implement real-time wallet balance updates
3. **Payment Integration**: Add payment processing for purchasing stones/credits
4. **Analytics**: Track wallet usage and conversion rates
5. **Testing**: Add unit tests for wallet service methods

## Security Notes

- The service role key should never be exposed to client-side code
- All database operations use RLS policies for security
- Environment variables are properly excluded from version control
- User authentication is required for all wallet operations