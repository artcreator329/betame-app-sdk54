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

      return favorites || [];
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
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking if favorited:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isFavorited:', error);
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