import { supabase } from './supabase';
import { FeatureService } from './feature-service';

export interface Service {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_id?: string;
  category_name?: string;
  industry?: string;
  image_url?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  service_area_radius?: number;
  service_area_description?: string;
  service_area_type?: string;
  is_nearby?: boolean;
  is_trending?: boolean;
  rating?: number;
  review_count?: number;
  provider_name?: string;
  provider_avatar?: string;
  created_at?: string;
  updated_at?: string;
  parent_service_id?: string; // For service variants
  service_variants?: Service[]; // Child services/variants
  show_on_profile?: boolean; // Whether to display this service on user's profile by default
}

export class ServiceService {
  /**
   * Get all services
   */
  static async getAllServices(): Promise<Service[]> {
    console.log('🔍 ServiceService.getAllServices: Starting...');
    try {
      // Get all services including variants
      console.log('🔍 ServiceService.getAllServices: Making Supabase query...');
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (servicesError) {
        console.error('❌ ServiceService.getAllServices: Error fetching services:', servicesError);
        return [];
      }

      console.log('✅ ServiceService.getAllServices: Got services from DB:', allServices?.length || 0);

      if (!allServices || allServices.length === 0) {
        console.log('ℹ️ ServiceService.getAllServices: No services found');
        return [];
      }

      // Separate parent services from variants
      const parentServices = allServices.filter(service => !service.parent_service_id);
      const serviceVariants = allServices.filter(service => service.parent_service_id);

      // Group variants by parent service ID
      const variantsMap = new Map<string, Service[]>();
      serviceVariants.forEach(variant => {
        const parentId = variant.parent_service_id!;
        if (!variantsMap.has(parentId)) {
          variantsMap.set(parentId, []);
        }
        variantsMap.get(parentId)!.push(variant);
      });

      // Get unique user IDs from all services
      const userIds = [...new Set(allServices.map(s => s.user_id))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return parent services without profile data and variants
        return parentServices.map(service => ({
          ...service,
          provider_name: 'Service Provider',
          provider_avatar: undefined,
          service_variants: variantsMap.get(service.id) || []
        }));
      }

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get active features for all services
      const serviceIds = parentServices.map(s => s.id);
      const activeFeaturesMap = await FeatureService.getActiveFeaturesForServices(serviceIds);

      // Combine parent services with profile data, variants, and active features
      return parentServices.map(service => {
        const profile = profileMap.get(service.user_id);
        const variants = variantsMap.get(service.id) || [];
        const activeFeatures = activeFeaturesMap[service.id] || [];
        
        // Add profile data to variants as well
        const variantsWithProfiles = variants.map(variant => {
          const variantProfile = profileMap.get(variant.user_id);
          return {
            ...variant,
            provider_name: variantProfile?.full_name || 'Service Provider',
            provider_avatar: variantProfile?.avatar_url
          };
        });

        return {
          ...service,
          provider_name: profile?.full_name || 'Service Provider',
          provider_avatar: profile?.avatar_url,
          service_variants: variantsWithProfiles,
          active_features: activeFeatures
        };
      });
    } catch (error) {
      console.error('Error in getAllServices:', error);
      return [];
    }
  }

  /**
   * Get nearby services (main services only with pricing from lowest variant)
   */
  static async getNearbyServices(): Promise<Service[]> {
    try {
      // Get all nearby services including variants
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_nearby', true)
        .order('created_at', { ascending: false });

      if (servicesError) {
        console.error('Error fetching nearby services:', servicesError);
        return [];
      }

      if (!allServices || allServices.length === 0) {
        return [];
      }

      // Separate main services from variants
      const mainServices = allServices.filter(service => !service.parent_service_id);
      const serviceVariants = allServices.filter(service => service.parent_service_id);

      // Group variants by parent service ID
      const variantsMap = new Map<string, Service[]>();
      serviceVariants.forEach(variant => {
        const parentId = variant.parent_service_id!;
        if (!variantsMap.has(parentId)) {
          variantsMap.set(parentId, []);
        }
        variantsMap.get(parentId)!.push(variant);
      });

      // Get unique user IDs from main services
      const userIds = [...new Set(mainServices.map(s => s.user_id))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return main services without profile data but with adjusted pricing
        return mainServices.map(service => {
          const variants = variantsMap.get(service.id) || [];
          const lowestPrice = variants.length > 0 
            ? Math.min(...variants.map(v => v.price))
            : service.price;
          
          return {
            ...service,
            price: lowestPrice,
            provider_name: 'Service Provider',
            provider_avatar: undefined,
            service_variants: variants
          };
        });
      }

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get active features for all services
      const serviceIds = mainServices.map(s => s.id);
      const activeFeaturesMap = await FeatureService.getActiveFeaturesForServices(serviceIds);

      // Combine main services with profile data, adjusted pricing, and active features
      return mainServices.map(service => {
        const profile = profileMap.get(service.user_id);
        const variants = variantsMap.get(service.id) || [];
        const lowestPrice = variants.length > 0 
          ? Math.min(...variants.map(v => v.price))
          : service.price;
        const activeFeatures = activeFeaturesMap[service.id] || [];
        
        return {
          ...service,
          price: lowestPrice,
          provider_name: profile?.full_name || 'Service Provider',
          provider_avatar: profile?.avatar_url,
          service_variants: variants,
          active_features: activeFeatures
        };
      });
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
      // First get trending services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_trending', true)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false });

      if (servicesError) {
        console.error('Error fetching trending services:', servicesError);
        return [];
      }

      if (!services || services.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(services.map(s => s.user_id))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return services without profile data
        return services.map(service => ({
          ...service,
          provider_name: 'Service Provider',
          provider_avatar: undefined
        }));
      }

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get active features for all services
      const serviceIds = services.map(s => s.id);
      const activeFeaturesMap = await FeatureService.getActiveFeaturesForServices(serviceIds);

      // Combine services with profile data and active features
      return services.map(service => {
        const profile = profileMap.get(service.user_id);
        const activeFeatures = activeFeaturesMap[service.id] || [];
        return {
          ...service,
          provider_name: profile?.full_name || 'Service Provider',
          provider_avatar: profile?.avatar_url,
          active_features: activeFeatures
        };
      });
    } catch (error) {
      console.error('Error in getTrendingServices:', error);
      return [];
    }
  }

  /**
   * Get services by category (main services only with pricing from lowest variant)
   */
  static async getServicesByCategory(categoryName: string): Promise<Service[]> {
    try {
      // Get all services by category including variants
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('category_name', categoryName)
        .order('created_at', { ascending: false });

      if (servicesError) {
        console.error('Error fetching services by category:', servicesError);
        return [];
      }

      if (!allServices || allServices.length === 0) {
        return [];
      }

      // Separate main services from variants
      const mainServices = allServices.filter(service => !service.parent_service_id);
      const serviceVariants = allServices.filter(service => service.parent_service_id);

      // Group variants by parent service ID
      const variantsMap = new Map<string, Service[]>();
      serviceVariants.forEach(variant => {
        const parentId = variant.parent_service_id!;
        if (!variantsMap.has(parentId)) {
          variantsMap.set(parentId, []);
        }
        variantsMap.get(parentId)!.push(variant);
      });

      // Get unique user IDs from main services
      const userIds = [...new Set(mainServices.map(s => s.user_id))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return main services without profile data but with adjusted pricing
        return mainServices.map(service => {
          const variants = variantsMap.get(service.id) || [];
          const lowestPrice = variants.length > 0 
            ? Math.min(...variants.map(v => v.price))
            : service.price;
          
          return {
            ...service,
            price: lowestPrice,
            provider_name: 'Service Provider',
            provider_avatar: undefined,
            service_variants: variants
          };
        });
      }

      // Create a map for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine main services with profile data and adjusted pricing
      return mainServices.map(service => {
        const profile = profileMap.get(service.user_id);
        const variants = variantsMap.get(service.id) || [];
        const lowestPrice = variants.length > 0 
          ? Math.min(...variants.map(v => v.price))
          : service.price;
        
        return {
          ...service,
          price: lowestPrice,
          provider_name: profile?.full_name || 'Service Provider',
          provider_avatar: profile?.avatar_url,
          service_variants: variants
        };
      });
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

      const services = data || [];
      
      // Get active features for all services
      const serviceIds = services.map(s => s.id);
      const activeFeaturesMap = await FeatureService.getActiveFeaturesForServices(serviceIds);

      // Combine services with active features
      return services.map(service => ({
        ...service,
        active_features: activeFeaturesMap[service.id] || []
      }));
    } catch (error) {
      console.error('Error in getUserServices:', error);
      return [];
    }
  }

  /**
   * Get service variants for a parent service
   */
  static async getServiceVariants(parentServiceId: string): Promise<Service[]> {
    try {
      const { data: variants, error } = await supabase
        .from('services')
        .select('*')
        .eq('parent_service_id', parentServiceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching service variants:', error);
        return [];
      }

      return variants || [];
    } catch (error) {
      console.error('Error in getServiceVariants:', error);
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
      console.log('🔍 ServiceService.getServiceById: Fetching service with ID:', id);
      
      const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('❌ ServiceService.getServiceById: Error fetching service by ID:', error);
        return null;
      }

      if (!service) {
        console.log('❌ ServiceService.getServiceById: No service found with ID:', id);
        return null;
      }

      console.log('✅ ServiceService.getServiceById: Service found:', service.title);

      // Get the profile for this service's user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', service.user_id)
        .maybeSingle();

      if (profileError) {
        console.error('⚠️ ServiceService.getServiceById: Error fetching profile:', profileError);
        // Return service without profile data
        return {
          ...service,
          provider_name: 'Service Provider',
          provider_avatar: undefined
        };
      }

      // Combine service with profile data
      const result = {
        ...service,
        provider_name: profile?.full_name || 'Service Provider',
        provider_avatar: profile?.avatar_url
      };

      console.log('📦 ServiceService.getServiceById: Returning service with profile data');
      return result;
    } catch (error) {
      console.error('❌ ServiceService.getServiceById: Unexpected error:', error);
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

  /**
   * Toggle show_on_profile status for a service
   */
  static async toggleServiceProfileVisibility(serviceId: string, showOnProfile: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          show_on_profile: showOnProfile,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) {
        console.error('Error toggling service profile visibility:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in toggleServiceProfileVisibility:', error);
      return false;
    }
  }
}