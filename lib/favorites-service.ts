import { supabase } from './supabase';
import { Service } from './service-service';

export interface FavoriteService {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
  service?: Service; // Joined service data
}

export class FavoritesService {
  /**
   * Get all favorite services for a user
   */
  static async getUserFavorites(userId: string): Promise<FavoriteService[]> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, skipping favorites fetch');
        return [];
      }

      const { data: favorites, error } = await supabase
        .from('favorites')
        .select(`
          *,
          service:services(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user favorites:', error);
        return [];
      }

      if (!favorites || favorites.length === 0) {
        return [];
      }

      // Get user profiles for the services to get provider names
      const serviceUserIds = favorites
        .map(fav => fav.service?.user_id)
        .filter(Boolean) as string[];

      if (serviceUserIds.length === 0) {
        return favorites;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at')
        .in('id', serviceUserIds);

      if (profilesError) {
        console.error('Error fetching profiles for favorites:', profilesError);
        return favorites; // Return favorites without profile data
      }

      // Create a map of user_id to profile data
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Combine favorites with profile data
      return favorites.map(favorite => {
        if (favorite.service) {
          const profile = profileMap.get(favorite.service.user_id);
          return {
            ...favorite,
            service: {
              ...favorite.service,
              provider_name: profile?.full_name || 'Service Provider',
              provider_avatar: profile?.avatar_url,
              provider_created_at: profile?.created_at
            }
          };
        }
        return favorite;
      });
    } catch (error) {
      console.error('Error in getUserFavorites:', error);
      return [];
    }
  }

  /**
   * Add a service to user's favorites
   */
  static async addToFavorites(userId: string, serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, cannot add to favorites');
        return { success: false, error: 'User not authenticated' };
      }

      // Check if already favorited
      const { data: existing, error: checkError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking existing favorite:', checkError);
        return { success: false, error: 'Failed to check existing favorite' };
      }

      if (existing) {
        return { success: false, error: 'Service already in favorites' };
      }

      // Add to favorites
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          service_id: serviceId
        });

      if (error) {
        console.error('Error adding to favorites:', error);
        return { success: false, error: 'Failed to add to favorites' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in addToFavorites:', error);
      return { success: false, error: 'Failed to add to favorites' };
    }
  }

  /**
   * Remove a service from user's favorites
   */
  static async removeFromFavorites(userId: string, serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, cannot remove from favorites');
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('service_id', serviceId);

      if (error) {
        console.error('Error removing from favorites:', error);
        return { success: false, error: 'Failed to remove from favorites' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeFromFavorites:', error);
      return { success: false, error: 'Failed to remove from favorites' };
    }
  }

  /**
   * Toggle favorite status for a service
   */
  static async toggleFavorite(userId: string, serviceId: string): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, cannot toggle favorite');
        return { success: false, isFavorited: false, error: 'User not authenticated' };
      }

      // Check if already favorited
      const { data: existing, error: checkError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking favorite status:', checkError);
        return { success: false, isFavorited: false, error: 'Failed to check favorite status' };
      }

      if (existing) {
        // Remove from favorites
        const removeResult = await this.removeFromFavorites(userId, serviceId);
        return {
          success: removeResult.success,
          isFavorited: false,
          error: removeResult.error
        };
      } else {
        // Add to favorites
        const addResult = await this.addToFavorites(userId, serviceId);
        return {
          success: addResult.success,
          isFavorited: true,
          error: addResult.error
        };
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      return { success: false, isFavorited: false, error: 'Failed to toggle favorite' };
    }
  }

  /**
   * Check if a service is favorited by a user
   */
  static async isFavorited(userId: string, serviceId: string): Promise<boolean> {
    try {
      console.log('🔍 isFavorited called with userId:', userId, 'serviceId:', serviceId);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ User not authenticated, skipping favorite check');
        return false;
      }

      console.log('✅ User authenticated, making API call');
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking if favorited:', error);
        return false;
      }

      console.log('✅ Favorite check completed, result:', !!data);
      return !!data;
    } catch (error) {
      console.error('❌ Error in isFavorited:', error);
      return false;
    }
  }

  /**
   * Get favorite count for a service
   */
  static async getFavoriteCount(serviceId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId);

      if (error) {
        console.error('Error getting favorite count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getFavoriteCount:', error);
      return 0;
    }
  }
} 