import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/lib/category-service';
import { Colors } from '@/constants/Colors';
import { 
  Car, Palette, Dumbbell, Home, Laptop, GraduationCap, 
  Sparkles, Brush, Activity, Dog, UtensilsCrossed, Camera, 
  Music, Pen, TrendingUp, Briefcase, DollarSign, Scale, 
  Hospital, Hammer, Truck, Theater, Plane, Lightbulb, 
  Wrench, Sprout, Baby, Users, BookOpen, MessageCircle, 
  ChefHat, PartyPopper, Shield, Package, Box, 
  Droplets, Zap, PaintBucket, Trees, Heart, Clipboard 
} from 'lucide-react-native';

interface NearbyCategoryIconProps {
  category: Category;
}

function getCategoryIcon(categoryName: string) {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'automotive': Car,
    'design': Palette,
    'health & fitness': Dumbbell,
    'home services': Home,
    'technology': Laptop,
    'education': GraduationCap,
    'beauty': Sparkles,
    'cleaning': Brush,
    'fitness': Activity,
    'sports': Activity,
    'pet care': Dog,
    'food': UtensilsCrossed,
    'photography': Camera,
    'music': Music,
    'art': Palette,
    'writing': Pen,
    'marketing': TrendingUp,
    'business': Briefcase,
    'finance': DollarSign,
    'legal': Scale,
    'medical': Hospital,
    'construction': Hammer,
    'transportation': Truck,
    'entertainment': Theater,
    'travel': Plane,
    'consulting': Lightbulb,
    'business & consulting': Briefcase,
    'repair': Wrench,
    'gardening': Sprout,
    'childcare': Baby,
    'elderly care': Users,
    'tutoring': BookOpen,
    'language': MessageCircle,
    'cooking': ChefHat,
    'event planning': PartyPopper,
    'security': Shield,
    'delivery': Package,
    'moving': Box,
    'handyman': Hammer,
    'plumbing': Droplets,
    'electrical': Zap,
    'painting': PaintBucket,
    'landscaping': Trees,
    'veterinary': Heart
  };

  const key = categoryName.toLowerCase();
  const IconComponent = iconMap[key] || iconMap[Object.keys(iconMap).find(k => key.includes(k)) || ''] || Clipboard;
  return IconComponent;
}

export default function NearbyCategoryIcon({ category }: NearbyCategoryIconProps) {
  const router = useRouter();
  const IconComponent = getCategoryIcon(category.name);

  const handlePress = () => {
    // Navigate to nearby services filtered by this category
    router.push({
      pathname: '/nearby',
      params: { category: category.name }
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <IconComponent size={24} color={Colors.text.white} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 70,
    marginRight: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  title: {
    fontSize: 11,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
});