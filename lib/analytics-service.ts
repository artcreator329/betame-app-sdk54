import { supabase } from './supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ServiceViewData {
  service_id: string;
  user_id?: string;
  viewer_ip?: string;
  user_agent?: string;
  view_source: 'service_card' | 'search' | 'trending' | 'category' | 'nearby' | 'other';
  session_id?: string;
}

export interface ServiceAnalytics {
  service_id: string;
  date: string;
  total_views: number;
  unique_views: number;
  views_from_trending: number;
  views_from_search: number;
  views_from_service_card: number;
  views_from_other: number;
}

export interface TrendingServiceData {
  service_id: string;
  total_views_7d: number;
  unique_views_7d: number;
  views_from_trending_7d: number;
  trending_score: number;
}

export class AnalyticsService {
  private static readonly SESSION_STORAGE_KEY = 'betame_session_id';
  private static readonly VIEW_COOLDOWN_MS = 30000; // 30 seconds cooldown between views
  private static readonly VIEW_STORAGE_KEY = 'service_views_tracked';

  /**
   * Generate or retrieve session ID
   */
  private static getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = localStorage.getItem(this.SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Check if view should be tracked (avoid duplicate views)
   */
  private static shouldTrackView(serviceId: string): boolean {
    if (typeof window === 'undefined') return true;
    
    const now = Date.now();
    const viewKey = `${serviceId}_${now}`;
    const trackedViews = JSON.parse(localStorage.getItem(this.VIEW_STORAGE_KEY) || '{}');
    
    // Check if we've already tracked a view for this service recently
    const lastViewTime = trackedViews[serviceId];
    if (lastViewTime && (now - lastViewTime) < this.VIEW_COOLDOWN_MS) {
      return false;
    }
    
    // Update the last view time
    trackedViews[serviceId] = now;
    localStorage.setItem(this.VIEW_STORAGE_KEY, JSON.stringify(trackedViews));
    
    return true;
  }

  /**
   * Track a service view
   */
  static async trackServiceView(data: ServiceViewData): Promise<boolean> {
    try {
      // Check if we should track this view
      if (!this.shouldTrackView(data.service_id)) {
        return false;
      }

      const sessionId = this.getSessionId();
      
      // Get user agent if available
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      
      const viewData = {
        service_id: data.service_id,
        user_id: data.user_id || null,
        viewer_ip: data.viewer_ip || null,
        user_agent: data.user_agent || userAgent || null,
        view_source: data.view_source,
        session_id: data.session_id || sessionId,
      };

      const { error } = await supabase
        .from('service_views')
        .insert(viewData);

      if (error) {
        console.error('Error tracking service view:', error);
        return false;
      }

      console.log('✅ Service view tracked:', data.service_id, data.view_source);
      return true;
    } catch (error) {
      console.error('Error in trackServiceView:', error);
      return false;
    }
  }

  /**
   * Track service card view (most common use case)
   */
  static async trackServiceCardView(serviceId: string, userId?: string): Promise<boolean> {
    return this.trackServiceView({
      service_id: serviceId,
      user_id: userId,
      view_source: 'service_card',
    });
  }

  /**
   * Track trending page view
   */
  static async trackTrendingView(serviceId: string, userId?: string): Promise<boolean> {
    return this.trackServiceView({
      service_id: serviceId,
      user_id: userId,
      view_source: 'trending',
    });
  }

  /**
   * Track search result view
   */
  static async trackSearchView(serviceId: string, userId?: string): Promise<boolean> {
    return this.trackServiceView({
      service_id: serviceId,
      user_id: userId,
      view_source: 'search',
    });
  }

  /**
   * Track category page view
   */
  static async trackCategoryView(serviceId: string, userId?: string): Promise<boolean> {
    return this.trackServiceView({
      service_id: serviceId,
      user_id: userId,
      view_source: 'category',
    });
  }

  /**
   * Track nearby services view
   */
  static async trackNearbyView(serviceId: string, userId?: string): Promise<boolean> {
    return this.trackServiceView({
      service_id: serviceId,
      user_id: userId,
      view_source: 'nearby',
    });
  }

  /**
   * Get service analytics for a specific service
   */
  static async getServiceAnalytics(serviceId: string, days: number = 7): Promise<ServiceAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('service_analytics')
        .select('*')
        .eq('service_id', serviceId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching service analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getServiceAnalytics:', error);
      return [];
    }
  }

  /**
   * Get trending services based on real view data
   */
  static async getTrendingServices(limit: number = 20): Promise<TrendingServiceData[]> {
    try {
      // Try to use the RPC function first
      const { data, error } = await supabase
        .rpc('get_trending_services', { limit_count: limit });

      if (error) {
        // If RPC function doesn't exist or fails, fall back to manual query
        console.log('RPC function get_trending_services not available, using fallback query');
        return this.getTrendingServicesFallback(limit);
      }

      return data || [];
    } catch (error) {
      console.log('Error calling get_trending_services RPC, using fallback query');
      return this.getTrendingServicesFallback(limit);
    }
  }

  /**
   * Fallback method to get trending services when RPC function is not available
   */
  private static async getTrendingServicesFallback(limit: number = 20): Promise<TrendingServiceData[]> {
    try {
      // Get services with manual trending flag as fallback
      const { data, error } = await supabase
        .from('services')
        .select('id')
        .eq('is_trending', true)
        .eq('status', 'active')
        .limit(limit);

      if (error) {
        console.error('Error fetching fallback trending services:', error);
        return [];
      }

      // Convert to TrendingServiceData format
      return (data || []).map(service => ({
        service_id: service.id,
        total_views_7d: 0,
        unique_views_7d: 0,
        views_from_trending_7d: 0,
        trending_score: 1.0
      }));
    } catch (error) {
      console.error('Error in getTrendingServicesFallback:', error);
      return [];
    }
  }

  /**
   * Get top performing services by views
   */
  static async getTopPerformingServices(limit: number = 10, days: number = 7): Promise<ServiceAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('service_analytics')
        .select('*')
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('total_views', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching top performing services:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTopPerformingServices:', error);
      return [];
    }
  }

  /**
   * Get view statistics for a service
   */
  static async getServiceViewStats(serviceId: string, days: number = 30): Promise<{
    totalViews: number;
    uniqueViews: number;
    viewsBySource: Record<string, number>;
    dailyViews: Array<{ date: string; views: number }>;
  }> {
    try {
      const analytics = await this.getServiceAnalytics(serviceId, days);
      
      const totalViews = analytics.reduce((sum, day) => sum + day.total_views, 0);
      const uniqueViews = analytics.reduce((sum, day) => sum + day.unique_views, 0);
      
      const viewsBySource = {
        trending: analytics.reduce((sum, day) => sum + day.views_from_trending, 0),
        search: analytics.reduce((sum, day) => sum + day.views_from_search, 0),
        service_card: analytics.reduce((sum, day) => sum + day.views_from_service_card, 0),
        other: analytics.reduce((sum, day) => sum + day.views_from_other, 0),
      };

      const dailyViews = analytics.map(day => ({
        date: day.date,
        views: day.total_views,
      }));

      return {
        totalViews,
        uniqueViews,
        viewsBySource,
        dailyViews,
      };
    } catch (error) {
      console.error('Error in getServiceViewStats:', error);
      return {
        totalViews: 0,
        uniqueViews: 0,
        viewsBySource: {},
        dailyViews: [],
      };
    }
  }
}

