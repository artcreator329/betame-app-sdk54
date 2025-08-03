import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Star, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface FavoriteService {
  id: string;
  title: string;
  provider_name?: string;
  rating: number;
  review_count: number;
  price: number;
  currency: string;
  image_url?: string;
  location: string;
  description: string;
  isFavorited: boolean;
}

// TODO: Implement favorites functionality with Supabase
// For now, return empty array until favorites table is created
const getFavoriteServices = async (): Promise<FavoriteService[]> => {
  return [];
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteService[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favoriteServices = await getFavoriteServices();
        setFavorites(favoriteServices);
        setSavedCount(favoriteServices.length);
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleServicePress = (serviceId: string) => {
    router.push(`/service/${serviceId}`);
  };

  const toggleFavorite = (serviceId: string) => {
    setFavorites((prev: FavoriteService[]) => 
      prev.map((service: FavoriteService) => 
        service.id === serviceId 
          ? { ...service, isFavorited: !service.isFavorited }
          : service
      )
    );
  };

  const renderServiceCard = (service: FavoriteService) => {
    return (
      <TouchableOpacity
        key={service.id}
        style={styles.serviceCard}
        onPress={() => handleServicePress(service.id)}
      >
        <Image source={{ uri: service.image_url || 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={styles.serviceImage} />
        <View style={styles.serviceInfo}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingText}>{service.rating}</Text>
              <Text style={styles.reviewCount}>({service.review_count})</Text>
            </View>
          </View>
          
          <Text style={styles.serviceProvider} numberOfLines={2}>
            {service.provider_name || 'Unknown Provider'}
          </Text>
          
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#8E8E93" />
            <Text style={styles.locationText} numberOfLines={1}>
              {service.location}
            </Text>
          </View>
          
          <View style={styles.serviceFooter}>
            <Text style={styles.servicePrice}>
              From {service.currency}{service.price}
            </Text>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(service.id)}
            >
              <Heart 
                size={20} 
                color={service.isFavorited ? "#FF3B30" : "#8E8E93"}
                fill={service.isFavorited ? "#FF3B30" : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Favorite Lists</Text>
          <Text style={styles.headerSubtitle}>({savedCount} saved)</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400' }}
            style={styles.profileImage}
          />
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>Anvenia Tan</Text>
            <Text style={styles.profileBio}>Believe in God ✨</Text>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Favorites List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Favorite Lists ({savedCount} saved)</Text>
          <View style={styles.sortContainer}>
            <Filter size={16} color="#8E8E93" />
            <Text style={styles.sortText}>Sort</Text>
          </View>
        </View>

        <View style={styles.servicesList}>
          {favorites.map(renderServiceCard)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  filterButton: {
    padding: 4,
  },
  profileSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: '#8E8E93',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  servicesList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 160,
  },
  serviceInfo: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  serviceProvider: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  favoriteButton: {
    padding: 4,
  },
});