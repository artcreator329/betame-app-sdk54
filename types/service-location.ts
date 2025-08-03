export interface ServiceLocation {
  id: string;
  title: string;
  provider: string;
  rating: number;
  price: number;
  currency: string;
  category: string;
  image: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  address: string;
  distance: string;
}