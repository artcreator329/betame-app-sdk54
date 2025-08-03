import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handlePress = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to view service details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    router.push(`/service/${service.id}`);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={{ uri: service.image_url || 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.ratingContainer}>
          <Star size={12} color="#FFD700" fill="#FFD700" />
          <Text style={styles.rating}>{service.rating}</Text>
          <Text style={styles.reviewCount}>({service.review_count})</Text>
        </View>
        <Text style={styles.provider}>{service.provider_name || 'Unknown Provider'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {service.title}
        </Text>
        <Text style={styles.price}>
          From {service.currency}{service.price}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 2,
  },
  provider: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 8,
    lineHeight: 16,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
  },
});