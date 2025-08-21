import { supabase } from '../lib/supabase';

async function applyUserFavoritesMigration() {
  console.log('Applying user favorites table migration...');

  try {
    // Create user_favorites table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_favorites (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          favorited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, favorited_user_id)
        );
      `
    });

    if (createTableError) {
      console.error('Error creating user_favorites table:', createTableError);
      return;
    }

    console.log('✓ user_favorites table created');

    // Enable Row Level Security
    const { error: enableRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;'
    });

    if (enableRLSError) {
      console.error('Error enabling RLS:', enableRLSError);
      return;
    }

    console.log('✓ Row Level Security enabled');

    // Create RLS policies
    const policies = [
      {
        name: 'Users can view their own user favorites',
        sql: 'CREATE POLICY "Users can view their own user favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);'
      },
      {
        name: 'Users can insert their own user favorites',
        sql: 'CREATE POLICY "Users can insert their own user favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);'
      },
      {
        name: 'Users can delete their own user favorites',
        sql: 'CREATE POLICY "Users can delete their own user favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);'
      }
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.error(`Error creating policy "${policy.name}":`, error);
        return;
      }
      console.log(`✓ Policy "${policy.name}" created`);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_favorited_user_id ON user_favorites(favorited_user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);'
    ];

    for (const index of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: index });
      if (error) {
        console.error('Error creating index:', error);
        return;
      }
    }

    console.log('✓ Indexes created');

    console.log('✅ User favorites migration completed successfully!');

  } catch (error) {
    console.error('Error applying user favorites migration:', error);
  }
}

// Run the migration
applyUserFavoritesMigration(); 