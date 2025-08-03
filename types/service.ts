export interface Service {
  id: string;
  title: string;
  provider: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  image: string;
  category: string;
  description: string;
  isNearby?: boolean;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}