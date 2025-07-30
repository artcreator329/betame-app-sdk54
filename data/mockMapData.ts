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

// Mock locations around Kuala Lumpur area
export const nearbyServiceLocations: ServiceLocation[] = [
  {
    id: '1',
    title: 'Mani/Pedi',
    provider: 'Beauty Salon KL',
    rating: 4.8,
    price: 50,
    currency: 'RM',
    category: 'Beauty & Cosmetics',
    image: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1478,
      longitude: 101.6953,
    },
    address: 'Bukit Bintang, KL',
    distance: '0.8 km',
  },
  {
    id: '2',
    title: 'House Cleaning',
    provider: 'Clean Pro Services',
    rating: 4.7,
    price: 80,
    currency: 'RM',
    category: 'Cleaning & Maintenance',
    image: 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1516,
      longitude: 101.7000,
    },
    address: 'KLCC, KL',
    distance: '1.2 km',
  },
  {
    id: '3',
    title: 'Yoga Instructor',
    provider: 'Wellness Center',
    rating: 4.9,
    price: 60,
    currency: 'RM',
    category: 'Fitness & Personal Training',
    image: 'https://images.pexels.com/photos/3822587/pexels-photo-3822587.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1445,
      longitude: 101.6980,
    },
    address: 'Pavilion, KL',
    distance: '0.5 km',
  },
  {
    id: '4',
    title: 'Pet Grooming',
    provider: 'Pawsome Care',
    rating: 4.6,
    price: 45,
    currency: 'RM',
    category: 'Veterinary & Pet Care',
    image: 'https://images.pexels.com/photos/4498778/pexels-photo-4498778.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1390,
      longitude: 101.6869,
    },
    address: 'Mid Valley, KL',
    distance: '2.1 km',
  },
  {
    id: '5',
    title: 'Personal Trainer',
    provider: 'FitLife Gym',
    rating: 4.8,
    price: 75,
    currency: 'RM',
    category: 'Fitness & Personal Training',
    image: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1560,
      longitude: 101.7020,
    },
    address: 'Ampang Park, KL',
    distance: '1.8 km',
  },
  {
    id: '6',
    title: 'Web Development',
    provider: 'Tech Solutions',
    rating: 4.7,
    price: 300,
    currency: 'RM',
    category: 'Digital & IT',
    image: 'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1412,
      longitude: 101.6890,
    },
    address: 'Bangsar, KL',
    distance: '3.2 km',
  },
  {
    id: '7',
    title: 'Photography',
    provider: 'Creative Shots',
    rating: 4.9,
    price: 200,
    currency: 'RM',
    category: 'Photography & Videography',
    image: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1500,
      longitude: 101.6920,
    },
    address: 'Chinatown, KL',
    distance: '1.5 km',
  },
  {
    id: '8',
    title: 'Music Lessons',
    provider: 'Harmony Studio',
    rating: 4.8,
    price: 90,
    currency: 'RM',
    category: 'Music & Audio Production',
    image: 'https://images.pexels.com/photos/3428498/pexels-photo-3428498.jpeg?auto=compress&cs=tinysrgb&w=400',
    coordinate: {
      latitude: 3.1350,
      longitude: 101.6950,
    },
    address: 'Cheras, KL',
    distance: '4.0 km',
  },
];