import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MessageCircle, Heart, ChevronRight, Wallet, MapPin, Calendar } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

import ServiceCard from '@/components/ServiceCard';
import SearchBarWithAutoComplete from '@/components/SearchBarWithAutoComplete';
import NearbyCategoryIcon from '@/components/NearbyCategoryIcon';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { BannerService, Banner } from '@/lib/banner-service';

import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useColors } from '@/contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && screenWidth >= 1024;

// Unread message badge component
const MessageBadge = ({ count }: { count: number }) => {
  const colors = useColors();
  if (count === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      top: -2,
      right: -6,
      backgroundColor: colors.status.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.text.white,
    }}>
      <Text style={{
        color: colors.text.white,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
      }}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [nearbyServices, setNearbyServices] = useState<Service[]>([]);
  const [trendingServices, setTrendingServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { totalUnreadCount } = useUnreadMessageCount();
  const colors = useColors();

  // Helper function to convert database service to UI service format
  const convertToUIService = (dbService: DBService): Service => {
    return {
      id: dbService.id || '',
      title: dbService.title,
      description: dbService.description,
      price: Number(dbService.price) || 0,
      currency: dbService.currency || 'RM',
      category_name: dbService.category_name || 'General',
      image_url: dbService.image_url || undefined, // Remove hardcoded fallback, let ServiceCard handle it
      latitude: dbService.latitude,
      longitude: dbService.longitude,
      location: dbService.location,
      rating: dbService.rating || 0,
      review_count: dbService.review_count || 0,
      user_id: dbService.user_id,
      is_nearby: dbService.is_nearby,
      is_trending: dbService.is_trending,
      created_at: dbService.created_at,
      updated_at: dbService.updated_at,
      provider_name: dbService.provider_name || 'Service Provider',
      provider_avatar: dbService.provider_avatar,
    };
  };

  const fetchData = useCallback(async () => {
    setIsLoadingServices(true);
    
    try {
      // Fetch all data concurrently
      const [bannersData, nearby, trending] = await Promise.all([
        BannerService.getActiveBanners(),
        ServiceService.getNearbyServices(),
        ServiceService.getTrendingServices()
      ]);
      
      setBanners(bannersData);
      setNearbyServices(nearby.map(convertToUIService));
      setTrendingServices(trending.map(convertToUIService));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Track last fetch time to prevent excessive refetching
  const lastFetchTimeRef = useRef<number>(0);

  // Refetch data when screen comes into focus (but not on every render)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if data is stale (more than 5 minutes old)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - lastFetchTimeRef.current > fiveMinutes) {
        fetchData();
        lastFetchTimeRef.current = now;
      }
    }, [fetchData])
  );

  const handleSlideChange = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40));
    setCurrentSlide(slideIndex);
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/text-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {user ? (
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/wallet')}
              >
                <View style={[styles.iconBackground, { backgroundColor: colors.primary.main, shadowColor: colors.shadow.medium }]}>
                  <Wallet size={20} color={colors.text.white} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/favorites')}
              >
                <View style={[styles.iconBackground, { backgroundColor: colors.primary.main, shadowColor: colors.shadow.medium }]}>
                  <Heart size={20} color={colors.text.white} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/messages')}
              >
                <View style={[styles.iconBackground, { backgroundColor: colors.primary.main, shadowColor: colors.shadow.medium }]}>
                  <View style={{ position: 'relative' }}>
                    <MessageCircle size={20} color={colors.text.white} />
                    <MessageBadge count={totalUnreadCount} />
                  </View>
                </View>
              </TouchableOpacity>

            </View>
          ) : (
            <View style={styles.authButtons}>
              <TouchableOpacity 
                style={[styles.signInButton, { backgroundColor: colors.primary.main }]}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={[styles.signInButtonText, { color: colors.text.white }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBarWithAutoComplete
            placeholder="Search for Talents/Services..."
            onSearch={(query) => router.push(`/search?q=${encodeURIComponent(query)}`)}
          />
        </View>



        {/* Banner Ad Space */}
        <View style={[styles.bannerContainer, { shadowColor: colors.shadow.medium }]}>
          {banners.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleSlideChange}
                style={styles.bannerSlider}
                nestedScrollEnabled={true}
              >
                {banners.map((item) => {
                  const bannerWidth = isDesktop ? screenWidth - 200 : screenWidth - 40;
                  const bannerHeight = Math.round(bannerWidth * (425 / 1200));
                  
                  // Check if there's any text content to display
                  const hasTextContent = item.title || item.description || item.link_url;
                  
                  const handleBannerClick = async () => {
                    try {
                      // Increment click count
                      await BannerService.incrementClickCount(item.id);
                      
                      // Handle banner click - could open link or navigate
                      if (item.link_url) {
                        // For now, just show an alert
                        Alert.alert('Banner Clicked', `Banner: ${item.title}`);
                      }
                    } catch (error) {
                      console.error('Error tracking banner click:', error);
                      // Still show the alert even if tracking fails
                      if (item.link_url) {
                        Alert.alert('Banner Clicked', `Banner: ${item.title}`);
                      }
                    }
                  };
                  
                  return (
                    <View key={item.id}>
                      <TouchableOpacity 
                        style={[styles.bannerSlide, { 
                          width: bannerWidth,
                          height: bannerHeight 
                        }]}
                        onPress={handleBannerClick}
                        activeOpacity={0.9}
                      >
                        <Image 
                          source={{ uri: item.image_url }} 
                          style={[styles.bannerImage, { height: bannerHeight }]}
                          resizeMode="cover"
                        />
                        {hasTextContent && (
                          <View style={[styles.bannerOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
                            <Text style={[styles.bannerTitle, { color: colors.text.white }]}>{item.title}</Text>
                            {item.description && (
                              <Text style={[styles.bannerSubtext, { color: colors.text.white }]}>{item.description}</Text>
                            )}
                            {item.link_url && (
                              <View style={styles.bannerButton}>
                                <Text style={styles.bannerButtonText}>Learn More</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.bannerIndicators}>
                {banners.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentSlide && styles.activeIndicator,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noBannersContainer}>
              <Text style={styles.noBannersText}>No banners available</Text>
            </View>
          )}
        </View>

        {/* Nearby Services */}
        <View style={[styles.section, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/nearby')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Nearby</Text>
            <ChevronRight size={20} color={colors.primary.main} />
          </TouchableOpacity>
          {isLoadingServices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading nearby services...</Text>
            </View>
          ) : nearbyServices.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyContent}
            >
              {nearbyServices.slice(0, isDesktop ? 16 : 8).map((service) => (
                <View key={service.id} style={styles.nearbyServiceCard}>
                  <ServiceCard service={service} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No nearby services available</Text>
            </View>
          )}
        </View>

        {/* Trending Services */}
        <View style={[styles.section, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => router.push('/trending')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Trending</Text>
            <ChevronRight size={20} color={colors.primary.main} />
          </TouchableOpacity>
          {isLoadingServices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading services...</Text>
              </View>
          ) : trendingServices.length > 0 ? (
            <View style={styles.servicesGrid}>
              {trendingServices.slice(0, isDesktop ? 8 : 4).map((service) => (
                <View key={service.id} style={styles.serviceCardContainer}>
                  <ServiceCard service={service} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No trending services available</Text>
            </View>
          )}
        </View>

        {/* Footer Links - Desktop Only */}
        {isDesktop && (
          <View style={[styles.footerSection, { backgroundColor: colors.background.tertiary }]}>
            <View style={styles.footerLinks}>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/terms-of-service')}
              >
                <Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>Terms of Use</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/legal')}
              >
                <Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>Legal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/faq')}
              >
                <Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/about-us')}
              >
                <Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => router.push('/contact-us')}
              >
                <Text style={[styles.footerLinkText, { color: colors.text.secondary }]}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  desktopScrollContent: {
    paddingBottom: 40, // Reduced since no bottom nav
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isDesktop ? 40 : 20,
    paddingVertical: isDesktop ? 24 : 16,
  },
  logoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    height: isDesktop ? 32 : 28,
    width: isDesktop ? 120 : 100,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchSection: {
    paddingHorizontal: isDesktop ? 40 : 20,
    paddingBottom: isDesktop ? 24 : 16,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 12,
  },
  iconBackground: {
    width: isDesktop ? 40 : 36,
    height: isDesktop ? 40 : 36,
    borderRadius: isDesktop ? 20 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  bannerContainer: {
    margin: isDesktop ? 40 : 20,
    borderRadius: isDesktop ? 16 : 12,
    overflow: 'hidden',
    position: 'relative',
    height: isDesktop ? 200 : 140,
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
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: isDesktop ? 40 : 20,
  },
  bannerTitle: {
    fontSize: isDesktop ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtext: {
    fontSize: isDesktop ? 16 : 14,
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
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  section: {
    marginHorizontal: isDesktop ? 40 : 20,
    marginBottom: isDesktop ? 24 : 16,
    borderRadius: isDesktop ? 16 : 12,
    padding: isDesktop ? 24 : 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: isDesktop ? 22 : 18,
    fontWeight: '600',
  },
  nearbyContent: {
    paddingRight: 16,
  },
  nearbyServiceCard: {
    width: isDesktop ? 220 : 200, // Smaller width for more cards per row
    marginRight: isDesktop ? 16 : 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCardContainer: {
    width: isDesktop ? '23%' : '48%', // 4 columns on desktop, 2 on mobile
    marginBottom: isDesktop ? 16 : 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,

  },
  jobsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  jobCard: {
    width: isDesktop ? '23%' : '48%', // 4 columns on desktop, 2 on mobile
    borderRadius: isDesktop ? 12 : 12,
    marginBottom: isDesktop ? 16 : 12,
    overflow: 'hidden',
  },
  jobImage: {
    width: '100%',
    height: isDesktop ? 100 : 80, // Smaller height for more compact cards
  },
  jobContent: {
    padding: isDesktop ? 12 : 12, // Reduced padding
  },
  jobTitle: {
    fontSize: isDesktop ? 16 : 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: isDesktop ? 14 : 12,
    marginBottom: 8,
    lineHeight: isDesktop ? 18 : 16,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobLocationText: {
    fontSize: 11,

    marginLeft: 4,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobBudget: {
    flex: 1,
  },
  jobBudgetText: {
    fontSize: 12,
    fontWeight: '600',

  },
  jobSellerReceivesText: {
    fontSize: 10,
    marginTop: 2,
  },
  jobDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDateText: {
    fontSize: 10,

    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,

    textAlign: 'center',
    marginBottom: 12,
  },
  createJobButton: {

    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createJobButtonText: {

    fontSize: 14,
    fontWeight: '600',
  },
  authButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInButton: {

    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInButtonText: {

    fontSize: 14,
    fontWeight: '600',
  },
  // Footer Styles
  footerSection: {
    marginHorizontal: isDesktop ? 40 : 20,
    marginBottom: isDesktop ? 24 : 16,
    borderRadius: isDesktop ? 16 : 12,
    padding: isDesktop ? 24 : 16,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isDesktop ? 24 : 16,
  },
  footerLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerLinkText: {
    fontSize: isDesktop ? 16 : 14,
    fontWeight: '500',
    textDecorationLine: 'none',
  },
  bannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  noBannersContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  noBannersText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});