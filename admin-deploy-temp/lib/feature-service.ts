import { supabase } from './supabase';

export interface ServiceFeatureApplication {
  id?: string;
  user_id: string;
  service_id: string;
  feature_type: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max';
  feature_name: string;
  applied_at?: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeatureIcon {
  type: 'feature_2x' | 'boost_instant' | 'showcase_max' | 'boost_feature_max';
  iconName: string;
  color: string;
}

export class FeatureService {
  /**
   * Get active features for a specific service
   */
  static async getActiveFeaturesForService(serviceId: string): Promise<ServiceFeatureApplication[]> {
    try {
      const { data, error } = await supabase
        .from('service_feature_applications')
        .select('*')
        .eq('service_id', serviceId)
        .gte('expires_at', new Date().toISOString())
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching active features for service:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveFeaturesForService:', error);
      return [];
    }
  }

  /**
   * Get active features for multiple services
   */
  static async getActiveFeaturesForServices(serviceIds: string[]): Promise<Record<string, ServiceFeatureApplication[]>> {
    try {
      if (serviceIds.length === 0) return {};

      const { data, error } = await supabase
        .from('service_feature_applications')
        .select('*')
        .in('service_id', serviceIds)
        .gte('expires_at', new Date().toISOString())
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching active features for services:', error);
        return {};
      }

      // Group by service_id
      const groupedFeatures: Record<string, ServiceFeatureApplication[]> = {};
      (data || []).forEach(feature => {
        if (!groupedFeatures[feature.service_id]) {
          groupedFeatures[feature.service_id] = [];
        }
        groupedFeatures[feature.service_id].push(feature);
      });

      return groupedFeatures;
    } catch (error) {
      console.error('Error in getActiveFeaturesForServices:', error);
      return {};
    }
  }

  /**
   * Get feature icon configuration
   */
  static getFeatureIcon(featureType: string): FeatureIcon | null {
    const featureIcons: Record<string, FeatureIcon> = {
      'boost_instant': {
        type: 'boost_instant',
        iconName: 'boost-icon.png',
        color: '#FF6B35'
      },
      'showcase_max': {
        type: 'showcase_max',
        iconName: 'showcase-icon.png',
        color: '#4A90E2'
      },
      'feature_2x': {
        type: 'feature_2x',
        iconName: 'feature-icon.png',
        color: '#7ED321'
      },
      'boost_feature_max': {
        type: 'boost_feature_max',
        iconName: 'boostFeature-icon.png',
        color: '#9B59B6'
      }
    };

    return featureIcons[featureType] || null;
  }

  /**
   * Apply a feature to a service
   */
  static async applyFeatureToService(
    userId: string,
    serviceId: string,
    featureType: string,
    featureName: string,
    expiresAt: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('service_feature_applications')
        .insert({
          user_id: userId,
          service_id: serviceId,
          feature_type: featureType,
          feature_name: featureName,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error applying feature to service:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in applyFeatureToService:', error);
      return { success: false, error: 'Failed to apply feature' };
    }
  }

  /**
   * Remove expired features (cleanup function)
   */
  static async removeExpiredFeatures(): Promise<{ success: boolean; removedCount?: number }> {
    try {
      const { data, error } = await supabase
        .from('service_feature_applications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        console.error('Error removing expired features:', error);
        return { success: false };
      }

      return { success: true, removedCount: data?.length || 0 };
    } catch (error) {
      console.error('Error in removeExpiredFeatures:', error);
      return { success: false };
    }
  }
}
