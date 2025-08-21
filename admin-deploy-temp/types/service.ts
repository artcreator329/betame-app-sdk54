import { ServiceFeatureApplication } from '@/lib/feature-service';

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category_name: string;
  industry?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  rating: number;
  review_count: number;
  user_id: string;
  is_nearby?: boolean;
  is_trending?: boolean;
  created_at?: string;
  updated_at?: string;
  provider_name?: string;
  provider_avatar?: string;
  parent_service_id?: string; // For service variants
  service_variants?: Service[]; // Child services/variants
  show_on_profile?: boolean; // Whether to display this service on user's profile by default
  active_features?: ServiceFeatureApplication[]; // Active features applied to this service
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}