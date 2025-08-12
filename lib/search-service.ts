import { supabase } from './supabase';

export interface SearchSuggestion {
  id: string;
  type: 'service' | 'category' | 'location' | 'user' | 'job';
  title: string;
  subtitle?: string;
  image_url?: string;
  category?: string;
  location?: string;
  user_id?: string;
  rating?: number;
  price?: number;
  currency?: string;
}

export interface SearchFilters {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  type?: 'service' | 'job' | 'user';
}

export interface SearchResult {
  services: SearchSuggestion[];
  jobs: SearchSuggestion[];
  users: SearchSuggestion[];
  categories: SearchSuggestion[];
  locations: SearchSuggestion[];
  total: number;
}

export class SearchService {
  private static readonly SUGGESTION_LIMIT = 8;
  private static readonly SEARCH_LIMIT = 20;

  /**
   * Get auto-complete suggestions based on query
   */
  static async getAutoCompleteSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    try {
      // Search services
      const { data: services } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          price,
          currency,
          image_url,
          category_name,
          location,
          rating,
          user_id,
          profiles!services_user_id_fkey(full_name, avatar_url)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .limit(this.SUGGESTION_LIMIT);

      if (services) {
        services.forEach(service => {
          suggestions.push({
            id: service.id,
            type: 'service',
            title: service.title,
            subtitle: `${service.currency} ${service.price} • ${service.category_name}`,
            image_url: service.image_url,
            category: service.category_name,
            location: service.location,
            user_id: service.user_id,
            rating: service.rating,
            price: service.price,
            currency: service.currency
          });
        });
      }

      // Search job listings
      const { data: jobs } = await supabase
        .from('job_listings')
        .select(`
          id,
          title,
          description,
          budget_amount,
          currency,
          cover_photo,
          location_address,
          user_id,
          profiles!job_listings_user_id_fkey(full_name, avatar_url)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .limit(this.SUGGESTION_LIMIT);

      if (jobs) {
        jobs.forEach(job => {
          suggestions.push({
            id: job.id,
            type: 'job',
            title: job.title,
            subtitle: job.budget_amount ? `${job.currency} ${job.budget_amount} • Job` : 'Job Opportunity',
            image_url: job.cover_photo,
            location: job.location_address,
            user_id: job.user_id
          });
        });
      }

      // Search users/profiles
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(this.SUGGESTION_LIMIT);

      if (users) {
        users.forEach(user => {
          suggestions.push({
            id: user.id,
            type: 'user',
            title: user.full_name || 'User',
            subtitle: user.bio || 'Service Provider',
            image_url: user.avatar_url,
            user_id: user.id
          });
        });
      }

      // Search categories (distinct from services)
      const { data: categories } = await supabase
        .from('services')
        .select('category_name')
        .ilike('category_name', `%${searchTerm}%`)
        .not('category_name', 'is', null)
        .limit(this.SUGGESTION_LIMIT);

      if (categories) {
        const uniqueCategories = [...new Set(categories.map(c => c.category_name))];
        uniqueCategories.forEach(category => {
          if (category && !suggestions.some(s => s.type === 'category' && s.title === category)) {
            suggestions.push({
              id: `category-${category}`,
              type: 'category',
              title: category,
              subtitle: 'Category'
            });
          }
        });
      }

      // Search locations (distinct from services and jobs)
      const { data: serviceLocations } = await supabase
        .from('services')
        .select('location')
        .ilike('location', `%${searchTerm}%`)
        .not('location', 'is', null)
        .limit(this.SUGGESTION_LIMIT);

      const { data: jobLocations } = await supabase
        .from('job_listings')
        .select('location_address')
        .ilike('location_address', `%${searchTerm}%`)
        .not('location_address', 'is', null)
        .limit(this.SUGGESTION_LIMIT);

      const allLocations = [
        ...(serviceLocations?.map(l => l.location) || []),
        ...(jobLocations?.map(l => l.location_address) || [])
      ];

      const uniqueLocations = [...new Set(allLocations.filter(Boolean))];
      uniqueLocations.forEach(location => {
        if (location && !suggestions.some(s => s.type === 'location' && s.title === location)) {
          suggestions.push({
            id: `location-${location}`,
            type: 'location',
            title: location,
            subtitle: 'Location'
          });
        }
      });

      // Sort suggestions by relevance (exact matches first, then partial matches)
      return suggestions
        .sort((a, b) => {
          const aExact = a.title.toLowerCase().startsWith(searchTerm);
          const bExact = b.title.toLowerCase().startsWith(searchTerm);
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // Then by type priority (services first, then jobs, users, categories, locations)
          const typePriority = { service: 0, job: 1, user: 2, category: 3, location: 4 };
          return typePriority[a.type] - typePriority[b.type];
        })
        .slice(0, this.SUGGESTION_LIMIT);

    } catch (error) {
      console.error('Error fetching auto-complete suggestions:', error);
      return [];
    }
  }

  /**
   * Perform full search with filters
   */
  static async search(query: string, filters?: SearchFilters): Promise<SearchResult> {
    const searchTerm = query.trim().toLowerCase();
    const result: SearchResult = {
      services: [],
      jobs: [],
      users: [],
      categories: [],
      locations: [],
      total: 0
    };

    if (!searchTerm) {
      return result;
    }

    try {
      // Build service query
      let serviceQuery = supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          price,
          currency,
          image_url,
          category_name,
          location,
          rating,
          review_count,
          user_id,
          profiles!services_user_id_fkey(full_name, avatar_url)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%`)
        .eq('status', 'active');

      // Apply filters
      if (filters?.category) {
        serviceQuery = serviceQuery.eq('category_name', filters.category);
      }
      if (filters?.location) {
        serviceQuery = serviceQuery.ilike('location', `%${filters.location}%`);
      }
      if (filters?.minPrice) {
        serviceQuery = serviceQuery.gte('price', filters.minPrice);
      }
      if (filters?.maxPrice) {
        serviceQuery = serviceQuery.lte('price', filters.maxPrice);
      }
      if (filters?.rating) {
        serviceQuery = serviceQuery.gte('rating', filters.rating);
      }

      const { data: services } = await serviceQuery.limit(this.SEARCH_LIMIT);

      if (services) {
        result.services = services.map(service => ({
          id: service.id,
          type: 'service' as const,
          title: service.title,
          subtitle: `${service.currency} ${service.price} • ${service.category_name}`,
          image_url: service.image_url,
          category: service.category_name,
          location: service.location,
          user_id: service.user_id,
          rating: service.rating,
          price: service.price,
          currency: service.currency
        }));
      }

      // Search jobs if not filtered to services only
      if (!filters?.type || filters.type === 'job') {
        let jobQuery = supabase
          .from('job_listings')
          .select(`
            id,
            title,
            description,
            budget_amount,
            currency,
            cover_photo,
            location_address,
            user_id,
            profiles!job_listings_user_id_fkey(full_name, avatar_url)
          `)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .eq('status', 'active');

        if (filters?.location) {
          jobQuery = jobQuery.ilike('location_address', `%${filters.location}%`);
        }

        const { data: jobs } = await jobQuery.limit(this.SEARCH_LIMIT);

        if (jobs) {
          result.jobs = jobs.map(job => ({
            id: job.id,
            type: 'job' as const,
            title: job.title,
            subtitle: job.budget_amount ? `${job.currency} ${job.budget_amount} • Job` : 'Job Opportunity',
            image_url: job.cover_photo,
            location: job.location_address,
            user_id: job.user_id
          }));
        }
      }

      // Search users if not filtered to services/jobs only
      if (!filters?.type || filters.type === 'user') {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, bio, avatar_url')
          .or(`full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
          .limit(this.SEARCH_LIMIT);

        if (users) {
          result.users = users.map(user => ({
            id: user.id,
            type: 'user' as const,
            title: user.full_name || 'User',
            subtitle: user.bio || 'Service Provider',
            image_url: user.avatar_url,
            user_id: user.id
          }));
        }
      }

      result.total = result.services.length + result.jobs.length + result.users.length;

    } catch (error) {
      console.error('Error performing search:', error);
    }

    return result;
  }

  /**
   * Get popular search terms
   */
  static async getPopularSearchTerms(): Promise<string[]> {
    try {
      // Get most common categories
      const { data: categories } = await supabase
        .from('services')
        .select('category_name')
        .not('category_name', 'is', null)
        .limit(10);

      const popularTerms = categories
        ? [...new Set(categories.map(c => c.category_name).filter(Boolean))]
        : [];

      // Add some common search terms
      const commonTerms = [
        'Cleaning', 'Tutoring', 'Photography', 'Web Design', 'Delivery',
        'Repair', 'Beauty', 'Fitness', 'Cooking', 'Pet Care'
      ];

      return [...new Set([...popularTerms, ...commonTerms])].slice(0, 8);
    } catch (error) {
      console.error('Error fetching popular search terms:', error);
      return [];
    }
  }

  /**
   * Get recent searches for a user (placeholder - use useRecentSearches hook in components)
   */
  static getRecentSearches(): string[] {
    // This is a placeholder - use useRecentSearches hook in components
    return [];
  }

  /**
   * Save a search term to recent searches (placeholder - use useRecentSearches hook in components)
   */
  static saveRecentSearch(term: string): void {
    // This is a placeholder - use useRecentSearches hook in components
    console.log('Saving recent search:', term);
  }
}