import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFavoritesTable() {
  try {
    console.log('🧪 Testing favorites table existence...');

    // Check if favorites table exists by trying to query it
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log('⚠️  Favorites table does not exist. Please create it manually in the Supabase dashboard.');
        console.log('📋 SQL to create favorites table:');
        console.log(`
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_service_id ON favorites(service_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
        `);
      } else {
        console.error('❌ Error checking favorites table:', error);
      }
      return;
    }

    console.log('✅ Favorites table exists and is accessible');
    console.log('📊 Current favorites count:', data?.length || 0);

    // Check if services table exists
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title')
      .limit(5);

    if (servicesError) {
      console.error('❌ Error checking services table:', servicesError);
    } else {
      console.log('✅ Services table exists');
      console.log('📋 Available services:', services?.length || 0);
      if (services && services.length > 0) {
        console.log('📝 Sample services:');
        services.forEach((service, index) => {
          console.log(`  ${index + 1}. ${service.title} (${service.id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFavoritesTable(); 