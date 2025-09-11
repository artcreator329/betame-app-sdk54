import { supabase } from './supabase';
import { FeatureService } from './feature-service';
import { AnalyticsService } from './analytics-service';
import { UserLocation, sortServicesByDistance } from '@/utils/location-utils';

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
  is_digital_service?: boolean;
  rating?: number;
  review_count?: number;
  provider_name?: string;
  provider_avatar?: string;
  provider_created_at?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'inactive' | 'draft';
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
      // Get all services including variants (only active and visible services for public listing)
      console.log('🔍 ServiceService.getAllServices: Making Supabase query...');
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active') // Only active services (not drafts)
        .eq('show_on_profile', true) // Only services visible on profile/public
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

      // Get profiles for these users from both tables
      const [profilesResult, userProfilesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, created_at')
          .in('id', userIds),
        supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url, created_at')
          .in('user_id', userIds)
      ]);

      if (profilesResult.error) {
        console.error('Error fetching profiles:', profilesResult.error);
      }

      if (userProfilesResult.error) {
        console.error('Error fetching user_profiles:', userProfilesResult.error);
      }

      // Create a map for quick lookup, prioritizing profiles table
      const profileMap = new Map();
      
      // Add profiles from profiles table
      profilesResult.data?.forEach(p => {
        profileMap.set(p.id, p);
      });
      
      // Add profiles from user_profiles table (only if not already in profiles table)
      userProfilesResult.data?.forEach(p => {
        if (!profileMap.has(p.user_id)) {
          profileMap.set(p.user_id, {
            id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            created_at: p.created_at
          });
        }
      });

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
            provider_avatar: variantProfile?.avatar_url,
            provider_created_at: variantProfile?.created_at
          };
        });

        return {
          ...service,
          provider_name: profile?.full_name || 'Service Provider',
          provider_avatar: profile?.avatar_url,
          provider_created_at: profile?.created_at,
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
      // Get all nearby services including variants (only active and visible services)
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_nearby', true)
        .eq('status', 'active') // Only active services (not drafts)
        .eq('show_on_profile', true) // Only services visible on profile/public
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
   * Get nearby services sorted by distance from user location
   * @param userLocation User's current location coordinates
   * @returns Promise<Service[]> Services sorted by distance (nearest first)
   */
  static async getNearbyServicesSortedByLocation(userLocation: UserLocation): Promise<Service[]> {
    try {
      // Get all nearby services first
      const nearbyServices = await this.getNearbyServices();
      
      // Filter services that have coordinates
      const servicesWithLocation = nearbyServices.filter(
        service => service.latitude && service.longitude
      );
      
      // Sort by distance from user location
      const sortedServices = sortServicesByDistance(servicesWithLocation, userLocation);
      
      return sortedServices;
    } catch (error) {
      console.error('Error in getNearbyServicesSortedByLocation:', error);
      return [];
    }
  }

  /**
   * Get trending services based on real view analytics
   */
  static async getTrendingServices(): Promise<Service[]> {
    try {
      // Get trending services based on real view data
      const trendingData = await AnalyticsService.getTrendingServices(50);
      
      if (trendingData.length === 0) {
        console.log('No trending services found based on view data, falling back to manual trending flag');
        const fallbackServices = await this.getFallbackTrendingServices();
        if (fallbackServices.length === 0) {
          console.log('No manually marked trending services found, using top-rated services as trending');
          return this.getTopRatedServicesAsTrending();
        }
        return fallbackServices;
      }

      // Extract service IDs from trending data
      const trendingServiceIds = trendingData.map(item => item.service_id);

      // Get services with their details (only active and visible services)
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('id', trendingServiceIds)
        .eq('status', 'active')
        .eq('show_on_profile', true);

      if (servicesError) {
        console.error('Error fetching trending services:', servicesError);
        const fallbackServices = await this.getFallbackTrendingServices();
        if (fallbackServices.length === 0) {
          return this.getTopRatedServicesAsTrending();
        }
        return fallbackServices;
      }

      if (!allServices || allServices.length === 0) {
        const fallbackServices = await this.getFallbackTrendingServices();
        if (fallbackServices.length === 0) {
          return this.getTopRatedServicesAsTrending();
        }
        return fallbackServices;
      }

      // Sort services by trending score
      const servicesWithTrendingScore = allServices.map(service => {
        const trendingInfo = trendingData.find(t => t.service_id === service.id);
        return {
          ...service,
          trending_score: trendingInfo?.trending_score || 0,
          total_views_7d: trendingInfo?.total_views_7d || 0,
          unique_views_7d: trendingInfo?.unique_views_7d || 0,
        };
      });

      // Sort by trending score (highest first)
      servicesWithTrendingScore.sort((a, b) => b.trending_score - a.trending_score);

      // Separate main services from variants
      const mainServices = servicesWithTrendingScore.filter(service => !service.parent_service_id);
      const serviceVariants = servicesWithTrendingScore.filter(service => service.parent_service_id);

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
        // Return main services without profile data but with variants
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

      // Combine main services with profile data, variants, and active features
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
      console.error('Error in getTrendingServices:', error);
      const fallbackServices = await this.getFallbackTrendingServices();
      if (fallbackServices.length === 0) {
        return this.getTopRatedServicesAsTrending();
      }
      return fallbackServices;
    }
  }

  /**
   * Fallback method to get trending services using manual is_trending flag
   */
  private static async getFallbackTrendingServices(): Promise<Service[]> {
    try {
      console.log('🔥 getFallbackTrendingServices: Starting fallback trending services query');
      
      // Get all trending services including variants (only active and visible services)
      const { data: allTrendingServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_trending', true)
        .eq('status', 'active')
        .eq('show_on_profile', true)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false });

      if (servicesError) {
        console.error('Error fetching fallback trending services:', servicesError);
        return [];
      }

      if (!allTrendingServices || allTrendingServices.length === 0) {
        console.log('🔥 getFallbackTrendingServices: No trending services found');
        return [];
      }

      console.log(`🔥 getFallbackTrendingServices: Found ${allTrendingServices.length} trending services`);

      // Separate main services from variants
      const mainTrendingServices = allTrendingServices.filter(service => !service.parent_service_id);
      const trendingVariants = allTrendingServices.filter(service => service.parent_service_id);

      console.log(`🔥 getFallbackTrendingServices: ${mainTrendingServices.length} main trending services, ${trendingVariants.length} trending variants`);

      // If we have trending variants but no main trending services, 
      // we need to fetch their parent services
      let parentServicesToInclude: Service[] = [];
      if (trendingVariants.length > 0) {
        const parentIds = [...new Set(trendingVariants.map(v => v.parent_service_id))];
        console.log(`🔥 getFallbackTrendingServices: Fetching ${parentIds.length} parent services`);
        
        const { data: parentServices, error: parentError } = await supabase
          .from('services')
          .select('*')
          .in('id', parentIds)
          .eq('status', 'active')
          .eq('show_on_profile', true);

        if (parentError) {
          console.error('Error fetching parent services for trending variants:', parentError);
        } else if (parentServices) {
          parentServicesToInclude = parentServices;
          console.log(`🔥 getFallbackTrendingServices: Found ${parentServices.length} parent services`);
        }
      }

      // Combine main trending services with parent services of trending variants
      const allMainServices = [...mainTrendingServices, ...parentServicesToInclude];
      const allVariants = [...allTrendingServices.filter(service => service.parent_service_id)];

      console.log(`🔥 getFallbackTrendingServices: Total main services to process: ${allMainServices.length}`);

      if (allMainServices.length === 0) {
        console.log('🔥 getFallbackTrendingServices: No main services to return');
        return [];
      }

      // Group variants by parent service ID
      const variantsMap = new Map<string, Service[]>();
      allVariants.forEach(variant => {
        const parentId = variant.parent_service_id!;
        if (!variantsMap.has(parentId)) {
          variantsMap.set(parentId, []);
        }
        variantsMap.get(parentId)!.push(variant);
      });

      // Get unique user IDs from main services
      const userIds = [...new Set(allMainServices.map(s => s.user_id))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return main services without profile data but with variants
        return allMainServices.map(service => {
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
      const serviceIds = allMainServices.map(s => s.id);
      const activeFeaturesMap = await FeatureService.getActiveFeaturesForServices(serviceIds);

      // Combine main services with profile data, variants, and active features
      const result = allMainServices.map(service => {
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

      console.log(`🔥 getFallbackTrendingServices: Returning ${result.length} services`);
      return result;
    } catch (error) {
      console.error('Error in getFallbackTrendingServices:', error);
      return [];
    }
  }

  /**
   * Final fallback method to get top-rated services as trending when no trending services exist
   */
  private static async getTopRatedServicesAsTrending(): Promise<Service[]> {
    try {
      console.log('🔥 Using top-rated services as trending fallback');
      
      // Get all active services, prioritizing those with ratings and reviews
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .eq('show_on_profile', true)
        .order('rating', { ascending: false })
        .order('review_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20); // Get top 20 services

      if (servicesError) {
        console.error('Error fetching top-rated services as trending:', servicesError);
        return [];
      }

      if (!allServices || allServices.length === 0) {
        console.log('No services found for trending fallback');
        return [];
      }

      console.log(`✅ Found ${allServices.length} services for trending fallback`);

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
        console.error('Error fetching profiles for trending fallback:', profilesError);
        // Return main services without profile data but with variants
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

      // Combine main services with profile data, variants, and active features
      const result = mainServices.map(service => {
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

      console.log(`🔥 Returning ${result.length} services as trending fallback`);
      return result;
    } catch (error) {
      console.error('Error in getTopRatedServicesAsTrending:', error);
      return [];
    }
  }

  /**
   * Get digital services (main services only with pricing from lowest variant)
   */
  static async getDigitalServices(): Promise<Service[]> {
    try {
      // Get all digital services including variants (only active and visible services)
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_digital_service', true)
        .eq('status', 'active')
        .eq('show_on_profile', true)
        .order('created_at', { ascending: false });

      if (servicesError) {
        console.error('Error fetching digital services:', servicesError);
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
      console.error('Error in getDigitalServices:', error);
      return [];
    }
  }

  /**
   * Get services by category (main services only with pricing from lowest variant)
   */
  static async getServicesByCategory(categoryName: string): Promise<Service[]> {
    try {
      // Get all services by category including variants (only active and visible services)
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('category_name', categoryName)
        .eq('status', 'active')
        .eq('show_on_profile', true)
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
   * Save service as draft
   */
  static async saveDraft(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          ...service,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving service draft:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in saveDraft:', error);
      return null;
    }
  }

  /**
   * Update existing draft
   */
  static async updateDraft(id: string, updates: Partial<Service>): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'draft') // Only update if it's still a draft
        .select()
        .single();

      if (error) {
        console.error('Error updating service draft:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateDraft:', error);
      return null;
    }
  }

  /**
   * Get user's draft services
   */
  static async getUserDrafts(userId: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user drafts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserDrafts:', error);
      return [];
    }
  }

  /**
   * Convert draft to active service
   */
  static async publishDraft(id: string): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {
        console.error('Error publishing draft:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in publishDraft:', error);
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
   * Delete a service and all related data in the correct order
   */
  static async deleteService(id: string): Promise<boolean> {
    try {
      console.log(`Starting deletion process for service ${id}`);

      // Step 1: Get all service offers for this service
      const { data: serviceOffers, error: offersError } = await supabase
        .from('service_offers')
        .select('id, status')
        .eq('service_id', id);

      if (offersError) {
        console.error('Error checking service offers:', offersError);
        return false;
      }

      // Step 2: If there are service offers, we need to delete their dependencies first
      if (serviceOffers && serviceOffers.length > 0) {
        console.log(`Found ${serviceOffers.length} service offers to process for service ${id}`);
        
        const serviceOfferIds = serviceOffers.map(offer => offer.id);

        // Step 2a: Get active jobs that reference these service offers
        const { data: activeJobs, error: activeJobsError } = await supabase
          .from('active_jobs')
          .select('id')
          .in('service_offer_id', serviceOfferIds);

        if (activeJobsError) {
          console.error('Error getting active jobs:', activeJobsError);
          return false;
        }

        console.log(`Found ${activeJobs?.length || 0} active jobs to delete`);

        // Step 2b: Delete active job completion photos if there are active jobs
        if (activeJobs && activeJobs.length > 0) {
          const activeJobIds = activeJobs.map(job => job.id).filter(id => id != null);
          
          if (activeJobIds.length > 0) {
            const { error: deleteJobPhotosError } = await supabase
              .from('active_job_completion_photos')
              .delete()
              .in('active_job_id', activeJobIds);

            if (deleteJobPhotosError) {
              console.error('Error deleting active job completion photos:', deleteJobPhotosError);
              // Continue anyway, this might not exist
            }
          }

          // Step 2c: Delete active jobs that reference these service offers
          const { error: deleteActiveJobsError } = await supabase
            .from('active_jobs')
            .delete()
            .in('service_offer_id', serviceOfferIds);

          if (deleteActiveJobsError) {
            console.error('Error deleting active jobs:', deleteActiveJobsError);
            return false;
          }

          console.log(`Successfully deleted ${activeJobs.length} active jobs`);
        }

        // Step 2d: Get job status records that reference these service offers
        const { data: jobStatuses, error: jobStatusesError } = await supabase
          .from('job_status')
          .select('id')
          .in('service_offer_id', serviceOfferIds);

        if (jobStatusesError) {
          console.error('Error getting job statuses:', jobStatusesError);
          return false;
        }

        // Step 2e: Delete job communications and completion photos if there are job statuses
        if (jobStatuses && jobStatuses.length > 0) {
          const jobStatusIds = jobStatuses.map(js => js.id);
          
          // Delete job communications
          const { error: deleteJobCommsError } = await supabase
            .from('job_communications')
            .delete()
            .in('job_status_id', jobStatusIds);

          if (deleteJobCommsError) {
            console.error('Error deleting job communications:', deleteJobCommsError);
            // Continue anyway
          }

          // Delete job completion photos
          const { error: deleteCompletionPhotosError } = await supabase
            .from('job_completion_photos')
            .delete()
            .in('job_status_id', jobStatusIds);

          if (deleteCompletionPhotosError) {
            console.error('Error deleting job completion photos:', deleteCompletionPhotosError);
            // Continue anyway
          }
        }

        // Step 2f: Delete job status records
        const { error: deleteJobStatusError } = await supabase
          .from('job_status')
          .delete()
          .in('service_offer_id', serviceOfferIds);

        if (deleteJobStatusError) {
          console.error('Error deleting job status records:', deleteJobStatusError);
          return false;
        }

        // Step 2g: Delete escrow transactions that might reference these service offers
        const { error: deleteEscrowError } = await supabase
          .from('escrow_transactions')
          .delete()
          .in('service_offer_id', serviceOfferIds);

        if (deleteEscrowError) {
          console.error('Error deleting escrow transactions:', deleteEscrowError);
          // Continue anyway, this might not exist
        }

        // Step 2h: Now delete the service offers themselves
        const { error: deleteOffersError } = await supabase
          .from('service_offers')
          .delete()
          .eq('service_id', id);

        if (deleteOffersError) {
          console.error('Error deleting service offers:', deleteOffersError);
          return false;
        }

        console.log(`Successfully deleted ${serviceOffers.length} service offers and their dependencies`);
      }

      // Step 3: Delete other service-related data
      
      // Delete service views
      const { error: deleteViewsError } = await supabase
        .from('service_views')
        .delete()
        .eq('service_id', id);

      if (deleteViewsError) {
        console.error('Error deleting service views:', deleteViewsError);
        // Continue anyway
      }

      // Delete service analytics
      const { error: deleteAnalyticsError } = await supabase
        .from('service_analytics')
        .delete()
        .eq('service_id', id);

      if (deleteAnalyticsError) {
        console.error('Error deleting service analytics:', deleteAnalyticsError);
        // Continue anyway
      }

      // Delete favorites
      const { error: deleteFavoritesError } = await supabase
        .from('favorites')
        .delete()
        .eq('service_id', id);

      if (deleteFavoritesError) {
        console.error('Error deleting favorites:', deleteFavoritesError);
        // Continue anyway
      }

      // Delete reviews
      const { error: deleteReviewsError } = await supabase
        .from('reviews')
        .delete()
        .eq('service_id', id);

      if (deleteReviewsError) {
        console.error('Error deleting reviews:', deleteReviewsError);
        // Continue anyway
      }

      // Delete service feature applications
      const { error: deleteFeaturesError } = await supabase
        .from('service_feature_applications')
        .delete()
        .eq('service_id', id);

      if (deleteFeaturesError) {
        console.error('Error deleting service features:', deleteFeaturesError);
        // Continue anyway
      }

      // Delete service locations
      const { error: deleteLocationsError } = await supabase
        .from('service_locations')
        .delete()
        .eq('service_id', id);

      if (deleteLocationsError) {
        console.error('Error deleting service locations:', deleteLocationsError);
        // Continue anyway
      }

      // Get chats related to this service
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .eq('service_id', id);

      if (chatsError) {
        console.error('Error getting chats:', chatsError);
        // Continue anyway
      }

      // Delete chat messages first (they reference chats)
      if (chats && chats.length > 0) {
        const chatIds = chats.map(chat => chat.id);
        
        const { error: deleteChatMessagesError } = await supabase
          .from('chat_messages')
          .delete()
          .in('chat_id', chatIds);

        if (deleteChatMessagesError) {
          console.error('Error deleting chat messages:', deleteChatMessagesError);
          // Continue anyway
        }
      }

      // Delete chats related to this service
      const { error: deleteChatsError } = await supabase
        .from('chats')
        .delete()
        .eq('service_id', id);

      if (deleteChatsError) {
        console.error('Error deleting chats:', deleteChatsError);
        // Continue anyway
      }

      // Step 4: Delete service variants (child services) recursively
      const { data: variants, error: variantsError } = await supabase
        .from('services')
        .select('id')
        .eq('parent_service_id', id);

      if (variantsError) {
        console.error('Error checking service variants:', variantsError);
        return false;
      }

      if (variants && variants.length > 0) {
        console.log(`Found ${variants.length} service variants to delete`);
        for (const variant of variants) {
          const success = await this.deleteService(variant.id);
          if (!success) {
            console.error(`Failed to delete service variant ${variant.id}`);
            return false;
          }
        }
      }

      // Step 5: Finally delete the main service
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting service:', error);
        return false;
      }

      console.log(`Successfully deleted service ${id} and all related data`);
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

      // Get service variants if this is a main service
      let serviceVariants: Service[] = [];
      if (!service.parent_service_id) {
        const { data: variants, error: variantsError } = await supabase
          .from('services')
          .select('*')
          .eq('parent_service_id', service.id)
          .order('created_at', { ascending: true });

        if (variantsError) {
          console.error('⚠️ ServiceService.getServiceById: Error fetching service variants:', variantsError);
        } else {
          serviceVariants = variants || [];
        }
      }

      // Get the profile for this service's user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', service.user_id)
        .maybeSingle();

      if (profileError) {
        console.error('⚠️ ServiceService.getServiceById: Error fetching profile:', profileError);
        // Return service without profile data but with variants
        return {
          ...service,
          provider_name: 'Service Provider',
          provider_avatar: undefined,
          service_variants: serviceVariants
        };
      }

      // Combine service with profile data and variants
      const result = {
        ...service,
        provider_name: profile?.full_name || 'Service Provider',
        provider_avatar: profile?.avatar_url,
        service_variants: serviceVariants
      };

      console.log('📦 ServiceService.getServiceById: Returning service with profile data and', serviceVariants.length, 'variants');
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
        .eq('status', 'active')
        .eq('show_on_profile', true)
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