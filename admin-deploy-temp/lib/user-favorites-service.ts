import { supabase } from './supabase';

export interface UserFavorite {
  id: string;
  user_id: string;
  favorited_user_id: string;
  created_at: string;
  favorited_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    tagline?: string;
  };
}

export class UserFavoritesService {
  /**
   * Get all favorited users for a user
   */
  static async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    try {
      const { data: favorites, error } = await supabase
        .from('user_favorites')
        .select(`
          *,
          favorited_user:profiles!user_favorites_favorited_user_id_fkey(
            id,
            full_name,
            avatar_url,
            bio,
            tagline
          )
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
   * Add a user to favorites
   */
  static async addToFavorites(userId: string, favoritedUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent users from favoriting themselves
      if (userId === favoritedUserId) {
        return { success: false, error: 'Cannot favorite yourself' };
      }

      // Check if already favorited
      const { data: existing, error: checkError } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('favorited_user_id', favoritedUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking existing favorite:', checkError);
        return { success: false, error: 'Failed to check existing favorite' };
      }

      if (existing) {
        return { success: false, error: 'User already in favorites' };
      }

      // Add to favorites
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          favorited_user_id: favoritedUserId
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
   * Remove a user from favorites
   */
  static async removeFromFavorites(userId: string, favoritedUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('favorited_user_id', favoritedUserId);

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
   * Toggle favorite status for a user
   */
  static async toggleFavorite(userId: string, favoritedUserId: string): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
    try {
      // Prevent users from favoriting themselves
      if (userId === favoritedUserId) {
        return { success: false, isFavorited: false, error: 'Cannot favorite yourself' };
      }

      // Check if already favorited
      const { data: existing, error: checkError } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('favorited_user_id', favoritedUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking favorite status:', checkError);
        return { success: false, isFavorited: false, error: 'Failed to check favorite status' };
      }

      if (existing) {
        // Remove from favorites
        const removeResult = await this.removeFromFavorites(userId, favoritedUserId);
        return {
          success: removeResult.success,
          isFavorited: false,
          error: removeResult.error
        };
      } else {
        // Add to favorites
        const addResult = await this.addToFavorites(userId, favoritedUserId);
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
   * Check if a user is favorited by another user
   */
  static async isFavorited(userId: string, favoritedUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('favorited_user_id', favoritedUserId)
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
   * Get favorite count for a user (how many people have favorited this user)
   */
  static async getFavoriteCount(favoritedUserId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('favorited_user_id', favoritedUserId);

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