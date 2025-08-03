import { supabase } from './supabase';

export interface Service {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  is_nearby?: boolean;
  is_trending?: boolean;
  rating?: number;
  review_count?: number;
  provider_name?: string;
  provider_avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export class ServiceService {
  /**
   * Get all services
   */
  static async getAllServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles!services_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        return [];
      }

      return (data || []).map(service => ({
        ...service,
        provider_name: service.profiles?.full_name || 'Service Provider',
        provider_avatar: service.profiles?.avatar_url
      }));
    } catch (error) {
      console.error('Error in getAllServices:', error);
      return [];
    }
  }

  /**
   * Get nearby services
   */
  static async getNearbyServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles!services_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('is_nearby', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching nearby services:', error);
        return [];
      }

      return (data || []).map(service => ({
        ...service,
        provider_name: service.profiles?.full_name || 'Service Provider',
        provider_avatar: service.profiles?.avatar_url
      }));
    } catch (error) {
      console.error('Error in getNearbyServices:', error);
      return [];
    }
  }

  /**
   * Get trending services
   */
  static async getTrendingServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles!services_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('is_trending', true)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false });

      if (error) {
        console.error('Error fetching trending services:', error);
        return [];
      }

      return (data || []).map(service => ({
        ...service,
        provider_name: service.profiles?.full_name || 'Service Provider',
        provider_avatar: service.profiles?.avatar_url
      }));
    } catch (error) {
      console.error('Error in getTrendingServices:', error);
      return [];
    }
  }

  /**
   * Get services by category
   */
  static async getServicesByCategory(categoryName: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category_name', categoryName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getServicesByCategory:', error);
      return [];
    }
  }

  /**
   * Get user's services
   */
  static async getUserServices(userId: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user services:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserServices:', error);
      return [];
    }
  }

  /**
   * Create a new service
   */
  static async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          ...service,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating service:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createService:', error);
      return null;
    }
  }

  /**
   * Update an existing service
   */
  static async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating service:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateService:', error);
      return null;
    }
  }

  /**
   * Delete a service
   */
  static async deleteService(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting service:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteService:', error);
      return false;
    }
  }

  /**
   * Get a single service by ID
   */
  static async getServiceById(id: string): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching service by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getServiceById:', error);
      return null;
    }
  }

  /**
   * Search services by title or description
   */
  static async searchServices(query: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching services:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchServices:', error);
      return [];
    }
  }
}