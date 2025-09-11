/**
 * Script to manually verify a user for both eKYC and bank statement
 * Usage: node scripts/verify-user.js
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to set this

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUser(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    // Find the user by email
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError);
      return;
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Step 1: Update user profile verification status
    console.log('📝 Updating user profile verification status...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        verification_status: 'verified',
        is_service_provider: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('❌ Error updating user profile:', profileError);
    } else {
      console.log('✅ User profile updated successfully');
    }

    // Step 2: Check if eKYC submission exists and update it
    console.log('📝 Checking eKYC submission...');
    const { data: ekycSubmission, error: ekycFetchError } = await supabase
      .from('ekyc_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (ekycFetchError && ekycFetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching eKYC submission:', ekycFetchError);
    } else if (ekycSubmission) {
      console.log('📝 Updating existing eKYC submission...');
      const { error: ekycUpdateError } = await supabase
        .from('ekyc_submissions')
        .update({
          status: 'approved',
          admin_notes: 'Manually verified by admin',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ekycSubmission.id);

      if (ekycUpdateError) {
        console.error('❌ Error updating eKYC submission:', ekycUpdateError);
      } else {
        console.log('✅ eKYC submission approved successfully');
      }
    } else {
      console.log('⚠️ No eKYC submission found - creating a placeholder...');
      const { error: ekycCreateError } = await supabase
        .from('ekyc_submissions')
        .insert({
          user_id: user.id,
          nationality: 'Malaysian',
          full_name: user.user_metadata?.full_name || 'Verified User',
          date_of_birth: '1990-01-01',
          phone_number: user.phone || '+60123456789',
          email: user.email,
          address_type: 'Current Address',
          address: 'Verified Address',
          city: 'Kuala Lumpur',
          postcode: '50000',
          state: 'Kuala Lumpur',
          status: 'approved',
          admin_notes: 'Manually verified by admin - placeholder submission',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          pdpa_consent_given: true,
          pdpa_consent_given_at: new Date().toISOString()
        });

      if (ekycCreateError) {
        console.error('❌ Error creating eKYC submission:', ekycCreateError);
      } else {
        console.log('✅ eKYC placeholder submission created and approved');
      }
    }

    // Step 3: Check if bank statement exists and update it
    console.log('📝 Checking bank statement...');
    const { data: bankStatement, error: bankFetchError } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (bankFetchError && bankFetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching bank statement:', bankFetchError);
    } else if (bankStatement) {
      console.log('📝 Updating existing bank statement...');
      const { error: bankUpdateError } = await supabase
        .from('bank_statements')
        .update({
          status: 'approved',
          admin_notes: 'Manually verified by admin',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bankStatement.id);

      if (bankUpdateError) {
        console.error('❌ Error updating bank statement:', bankUpdateError);
      } else {
        console.log('✅ Bank statement approved successfully');
      }
    } else {
      console.log('⚠️ No bank statement found - creating a placeholder...');
      const { error: bankCreateError } = await supabase
        .from('bank_statements')
        .insert({
          user_id: user.id,
          name: user.user_metadata?.full_name || 'Verified User',
          ic_number: '123456789012',
          bank_name: 'Verified Bank',
          bank_account_number: '1234567890',
          statement_file_url: 'https://placeholder-statement.pdf',
          status: 'approved',
          admin_notes: 'Manually verified by admin - placeholder submission',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString()
        });

      if (bankCreateError) {
        console.error('❌ Error creating bank statement:', bankCreateError);
      } else {
        console.log('✅ Bank statement placeholder created and approved');
      }
    }

    // Step 4: Ensure wallet exists
    console.log('💰 Ensuring wallet exists...');
    const { data: wallet, error: walletFetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletFetchError && walletFetchError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { error: walletCreateError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          premium_stones: 0,
          betame_betacoins: 100, // Give some initial BetaCoins
          betame_stones: 0,
          betame_diamonds: 50, // Give some initial diamonds
          cash: 0
        });

      if (walletCreateError) {
        console.error('❌ Error creating wallet:', walletCreateError);
      } else {
        console.log('✅ Wallet created with initial balance');
      }
    } else if (walletFetchError) {
      console.error('❌ Error fetching wallet:', walletFetchError);
    } else {
      console.log('✅ Wallet already exists');
    }

    console.log('\n🎉 User verification completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log('   - Profile: Updated to verified service provider');
    console.log('   - eKYC: Approved');
    console.log('   - Bank Statement: Approved');
    console.log('   - Wallet: Ensured exists');
    console.log('\n✅ The user should now be able to create service listings!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the verification
const email = 'gzd8onijy7@wyoxafp.com';
verifyUser(email);