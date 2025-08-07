import { supabase } from '../lib/supabase';

async function checkUserFavoritesTable() {
  console.log('🔍 Checking if user_favorites table exists...');

  try {
    // Check if user_favorites table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_favorites');

    if (tableError) {
      console.error('❌ Error checking for user_favorites table:', tableError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('⚠️  user_favorites table does not exist.');
      console.log('📋 Please run the following SQL in your Supabase dashboard:');
      console.log('');
      console.log(`
-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, favorited_user_id)
);

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own user favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_favorited_user_id ON user_favorites(favorited_user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);
      `);
      console.log('');
      console.log('📍 Go to your Supabase dashboard → SQL Editor → Run the above SQL');
      return;
    }

    console.log('✅ user_favorites table exists!');

    // Test if we can query the table
    const { data: testData, error: testError } = await supabase
      .from('user_favorites')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error testing user_favorites table:', testError);
      console.log('🔧 The table exists but there might be permission issues.');
      return;
    }

    console.log('✅ user_favorites table is working correctly!');
    console.log(`📊 Current records: ${testData?.length || 0}`);

  } catch (error) {
    console.error('❌ Error checking user_favorites table:', error);
  }
}

// Run the check
checkUserFavoritesTable(); 