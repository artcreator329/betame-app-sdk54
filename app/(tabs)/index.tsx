import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MessageCircle, Heart, ChevronRight, Wallet } from 'lucide-react-native';
import ServiceCard from '@/components/ServiceCard';
import NearbyServiceIcon from '@/components/NearbyServiceIcon';
import { categories, nearbyServices, trendingServices } from '@/data/mockData';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface BannerSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  backgroundColor?: string;
}

const bannerSlides: BannerSlide[] = [
  {
    id: '1',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Job Opportunity',
    subtitle: 'Find your next career',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  {
    id: '2',
    image: 'https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Learn New Skills',
    subtitle: 'Expand your knowledge',
    backgroundColor: 'rgba(13, 110, 253, 0.4)',
  },
  {
    id: '3',
    image: 'https://images.pexels.com/photos/6120218/pexels-photo-6120218.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Fitness & Wellness',
    subtitle: 'Transform your lifestyle',
    backgroundColor: 'rgba(25, 135, 84, 0.4)',
  },
  {
    id: '4',
    image: 'https://images.pexels.com/photos/4498778/pexels-photo-4498778.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Pet Care Services',
    subtitle: 'Love and care for your pets',
    backgroundColor: 'rgba(220, 53, 69, 0.4)',
  },
  {
    id: '5',
    image: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Home Services',
    subtitle: 'Professional help at home',
    backgroundColor: 'rgba(255, 193, 7, 0.4)',
  },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Household');
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleSlideChange = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40));
    setCurrentSlide(slideIndex);
  };

  const renderBannerItem = ({ item }: { item: BannerSlide }) => (
    <View style={[styles.bannerSlide, { width: screenWidth - 40 }]}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={[styles.bannerOverlay, { backgroundColor: item.backgroundColor }]}>
        <Text style={styles.bannerText}>{item.title}</Text>
        <Text style={styles.bannerSubtext}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for Talents/Services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/favorites')}
            >
              <Heart size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/messages')}
            >
              <MessageCircle size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.name && styles.selectedCategoryTab,
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.name && styles.selectedCategoryText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Banner Ad Space */}
        <View style={styles.bannerContainer}>
          <FlatList
            data={bannerSlides}
            renderItem={renderBannerItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleSlideChange}
            style={styles.bannerSlider}
          />
          <View style={styles.bannerIndicators}>
            {bannerSlides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentSlide && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Nearby Services */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/nearby')}
          >
            <Text style={styles.sectionTitle}>Nearby</Text>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nearbyContent}
          >
            {nearbyServices.map((service) => (
              <NearbyServiceIcon key={service.id} service={service} />
            ))}
          </ScrollView>
        </View>

        {/* Trending Services */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/nearby')}
          >
            <Text style={styles.sectionTitle}>Trending</Text>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
          <View style={styles.servicesGrid}>
            {trendingServices.slice(0, 4).map((service) => (
              <View key={service.id} style={styles.serviceCardContainer}>
                <ServiceCard service={service} />
              </View>
            ))}
          </View>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 12,
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  selectedCategoryText: {
    color: 'white',
  },
  bannerContainer: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerSlider: {
    width: '100%',
    height: '100%',
  },
  bannerSlide: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: 140,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  bannerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtext: {
    fontSize: 14,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    flexDirection: 'row',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 6,
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  nearbyContent: {
    paddingRight: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
});