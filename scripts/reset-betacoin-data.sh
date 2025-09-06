#!/bin/bash

# Reset All BetaCoin Data Script
# This script executes the SQL migration to reset all users' betacoin data

set -e

echo "🚨 WARNING: This will permanently delete ALL betacoin data including:"
echo "   - All user betacoin balances"
echo "   - All betacoin transaction history"
echo "   - All purchased features"
echo "   - All check-in data"
echo "   - All referral data"
echo "   - All payment transaction records for betacoin purchases"
echo ""
echo "This action CANNOT be undone!"
echo ""

# Ask for confirmation
read -p "Are you sure you want to proceed? (type 'RESET' to confirm): " confirmation

if [ "$confirmation" != "RESET" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '#' | xargs)
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please log in first:"
    echo "supabase login"
    exit 1
fi

echo "🔄 Executing betacoin data reset migration..."

# Execute the migration using Supabase CLI
supabase db push --db-url "$EXPO_PUBLIC_SUPABASE_URL" --password "$(echo $SUPABASE_SERVICE_ROLE_KEY)" --file "database/reset_all_betacoin_data.sql"

if [ $? -eq 0 ]; then
    echo "✅ BetaCoin data reset completed successfully!"
    echo ""
    echo "📊 To verify the reset, you can run these queries in Supabase Dashboard:"
    echo "   SELECT COUNT(*) as users_with_betacoins FROM wallets WHERE betame_betacoins > 0;"
    echo "   SELECT COUNT(*) as betacoin_transactions FROM transactions WHERE type = 'betacoin_purchase';"
    echo "   SELECT COUNT(*) as purchased_features FROM purchased_features;"
    echo ""
    echo "All counts should return 0 (zero)."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

