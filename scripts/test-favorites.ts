import { supabase } from '../lib/supabase';
import { FavoritesService } from '../lib/favorites-service';

async function testFavorites() {
  try {
    console.log('🧪 Testing favorites functionality...');

    // Check if favorites table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'favorites');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    if (!tables || tables.length === 0) {
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
      return;
    }

    console.log('✅ Favorites table exists');

    // Test getting user favorites (will be empty for new users)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️  No authenticated user found');
      return;
    }

    console.log('👤 Testing with user:', user.id);

    const favorites = await FavoritesService.getUserFavorites(user.id);
    console.log('📋 User favorites:', favorites.length);

    // Test checking if a service is favorited
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .limit(1);

    if (services && services.length > 0) {
      const serviceId = services[0].id;
      const isFavorited = await FavoritesService.isFavorited(user.id, serviceId);
      console.log('❤️  Service favorited:', isFavorited);

      // Test toggling favorite
      const toggleResult = await FavoritesService.toggleFavorite(user.id, serviceId);
      console.log('🔄 Toggle result:', toggleResult);

      // Check again
      const isFavoritedAfter = await FavoritesService.isFavorited(user.id, serviceId);
      console.log('❤️  Service favorited after toggle:', isFavoritedAfter);
    }

    console.log('✅ Favorites test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFavorites(); 