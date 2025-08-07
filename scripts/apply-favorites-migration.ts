import { supabaseAdmin } from '../lib/supabase';

async function applyFavoritesMigration() {
  try {
    console.log('🔄 Applying favorites table migration...');

    // Create favorites table
    const { error: createTableError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS favorites (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, service_id)
        );
      `
    });

    if (createTableError) {
      console.error('❌ Error creating favorites table:', createTableError);
      return;
    }

    console.log('✅ Favorites table created successfully');

    // Enable RLS
    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
      return;
    }

    console.log('✅ RLS enabled successfully');

    // Create RLS policies
    const policies = [
      {
        name: 'Users can view their own favorites',
        sql: 'CREATE POLICY "Users can view their own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);'
      },
      {
        name: 'Users can insert their own favorites',
        sql: 'CREATE POLICY "Users can insert their own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);'
      },
      {
        name: 'Users can delete their own favorites',
        sql: 'CREATE POLICY "Users can delete their own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);'
      }
    ];

    for (const policy of policies) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: policy.sql });
      if (error) {
        console.log(`⚠️  Policy "${policy.name}" might already exist:`, error.message);
      } else {
        console.log(`✅ Policy "${policy.name}" created successfully`);
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_favorites_service_id ON favorites(service_id);',
      'CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);'
    ];

    for (const index of indexes) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: index });
      if (error) {
        console.error('❌ Error creating index:', error);
      } else {
        console.log('✅ Index created successfully');
      }
    }

    console.log('🎉 Favorites migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
applyFavoritesMigration(); 