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
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const categories: Category[] = [
  { id: 'household', name: 'Household', icon: '🏠' },
  { id: 'knowledge', name: 'Knowledge', icon: '📚' },
  { id: 'performers', name: 'Performers', icon: '🎭' },
  { id: 'kids', name: 'Kids', icon: '👶' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'education', name: 'Education', icon: '🎓' },
];

export const nearbyServices: Service[] = [
  {
    id: '1',
    title: 'Mani/Pedi',
    provider: 'Beauty Salon',
    rating: 4.8,
    reviewCount: 120,
    price: 50,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Beauty & Cosmetics',
    description: 'Professional manicure and pedicure services',
    isNearby: true,
  },
  {
    id: '2',
    title: 'Cleaning',
    provider: 'Clean Pro',
    rating: 4.7,
    reviewCount: 89,
    price: 80,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Cleaning & Maintenance',
    description: 'Home cleaning services',
    isNearby: true,
  },
  {
    id: '3',
    title: 'Yoga Instructor',
    provider: 'Wellness Center',
    rating: 4.9,
    reviewCount: 156,
    price: 60,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/3822587/pexels-photo-3822587.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Fitness & Personal Training',
    description: 'Personal yoga training sessions',
    isNearby: true,
  },
  {
    id: '4',
    title: 'Website Design',
    provider: 'Tech Solutions',
    rating: 4.6,
    reviewCount: 203,
    price: 300,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Digital & IT',
    description: 'Professional website development',
    isNearby: true,
  },
  {
    id: '5',
    title: 'Badminton Coach',
    provider: 'Sports Academy',
    rating: 4.8,
    reviewCount: 95,
    price: 45,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Sports & Recreation',
    description: 'Professional badminton coaching',
    isNearby: true,
  },
];

export const trendingServices: Service[] = [
  {
    id: '6',
    title: 'Train your summer body with me',
    provider: 'Raj Kumar',
    rating: 4.9,
    reviewCount: 867,
    price: 88,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Fitness & Personal Training',
    description: 'Personal fitness training for summer body preparation',
  },
  {
    id: '7',
    title: 'Create 3 Cashcow videos for your YouTube channel',
    provider: 'Abdul Khalib',
    rating: 4.9,
    reviewCount: 451,
    price: 120,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Marketing & Advertising',
    description: 'Professional YouTube video creation service',
  },
  {
    id: '8',
    title: 'Learn 1-on-1 English from native speaker',
    provider: 'Jeslina Kong',
    rating: 4.9,
    reviewCount: 210,
    price: 68,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Education & Training',
    description: 'Private English lessons with native speaker',
  },
  {
    id: '9',
    title: 'Professional martial arts training',
    provider: 'Mike Chen',
    rating: 4.8,
    reviewCount: 342,
    price: 75,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/7045582/pexels-photo-7045582.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Sports & Recreation',
    description: 'Learn martial arts with experienced instructor',
  },
  {
    id: '10',
    title: 'Pawer Puff - Pet Care Services',
    provider: 'Abang Joe',
    rating: 4.7,
    reviewCount: 259,
    price: 55,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/4498778/pexels-photo-4498778.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Veterinary & Pet Care',
    description: 'Take care your pet for short-term',
  },
  {
    id: '11',
    title: 'Home renovation consultation',
    provider: 'David Wong',
    rating: 4.6,
    reviewCount: 123,
    price: 150,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Construction & Renovation',
    description: 'Expert home renovation planning and consultation',
  },
];

export const allServices = [...nearbyServices, ...trendingServices];

export const sellerServices = [
  {
    id: 'service-1',
    title: '1-on-1 English Learning',
    description: 'Learning english with Jeslina for IELTS Tests preparation\n1-on-1 learning enable Jeslina to focus only you during the 2 hours learning.\nJeslina has helped...',
    price: 128,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'service-2',
    title: 'English Learning Class',
    description: 'Learning english with Jeslina for IELTS Tests preparation\nJoin Jeslina\'s weekly 2 hours class for English Learning, FOC Examination test is provided to determine...',
    price: 88,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'service-3',
    title: 'Pre-U English Tuition',
    description: 'Learning english with Jeslina for Pre-U\nJoin Jeslina\'s pre-U English tuition at KL every Tuesday & Thursday. Jeslina\'s student scoring rate in STPM for past 3 years has never lower...',
    price: 100,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/5427674/pexels-photo-5427674.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'service-4',
    title: 'English Online Class',
    description: 'Learning english with Jeslina via Google Meet. Assessment of 15 minutes is FOC to determine the level of your English standards and to decide your English...',
    price: 38,
    currency: 'RM',
    image: 'https://images.pexels.com/photos/4144222/pexels-photo-4144222.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];