import { supabase } from './supabase';

export interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  order_index: number;
  click_count: number;
  created_at: string;
}

export class BannerService {
  /**
   * Fetch all active banners for homepage display
   */
  static async getActiveBanners(): Promise<Banner[]> {
    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching active banners:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveBanners:', error);
      return [];
    }
  }

  /**
   * Fetch all banners (for admin management)
   */
  static async getAllBanners(): Promise<Banner[]> {
    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching all banners:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllBanners:', error);
      throw error;
    }
  }

  /**
   * Increment click count for a banner
   */
  static async incrementClickCount(bannerId: string): Promise<void> {
    try {
      // First get the current click count
      const { data: currentBanner, error: fetchError } = await supabase
        .from('homepage_banners')
        .select('click_count')
        .eq('id', bannerId)
        .single();

      if (fetchError) {
        console.error('Error fetching current click count:', fetchError);
        throw fetchError;
      }

      // Then increment it
      const { error } = await supabase
        .from('homepage_banners')
        .update({ 
          click_count: (currentBanner?.click_count || 0) + 1
        })
        .eq('id', bannerId);

      if (error) {
        console.error('Error incrementing click count:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in incrementClickCount:', error);
      throw error;
    }
  }

  /**
   * Create a new banner
   */
  static async createBanner(bannerData: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .insert(bannerData)
        .select()
        .single();

      if (error) {
        console.error('Error creating banner:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createBanner:', error);
      throw error;
    }
  }

  /**
   * Update a banner
   */
  static async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating banner:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateBanner:', error);
      throw error;
    }
  }

  /**
   * Delete a banner
   */
  static async deleteBanner(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('homepage_banners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting banner:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteBanner:', error);
      throw error;
    }
  }

  /**
   * Toggle banner active status
   */
  static async toggleBannerStatus(id: string, isActive: boolean): Promise<Banner> {
    return this.updateBanner(id, { is_active: isActive });
  }

  /**
   * Reorder banners
   */
  static async reorderBanners(bannerOrders: { id: string; order_index: number }[]): Promise<void> {
    try {
      // Use a transaction to update all order indices
      const updates = bannerOrders.map(({ id, order_index }) => 
        supabase
          .from('homepage_banners')
          .update({ order_index })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error in reorderBanners:', error);
      throw error;
    }
  }
}
