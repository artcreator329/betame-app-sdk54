import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import ServiceCard from '@/components/ServiceCard';
import DesktopWrapper from '@/components/DesktopWrapper';
import ResponsiveGrid, { GridCard } from '@/components/ResponsiveGrid';
import LayoutToggle from '@/components/LayoutToggle';
import { Service } from '@/types/service';
import { ServiceService, Service as DBService } from '@/lib/service-service';
import { useColors } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

export default function DigitalServicesScreen() {
  const [digitalServices, setDigitalServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGridLayout, setIsGridLayout] = useState(true);
  const router = useRouter();
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
      image_url: dbService.image_url || undefined,
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

  useEffect(() => {
    const loadDigitalServices = async () => {
      try {
        setIsLoading(true);
        const services = await ServiceService.getDigitalServices();
        setDigitalServices(services.map(convertToUIService));
      } catch (error) {
        console.error('Error loading digital services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDigitalServices();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.primary.main} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Digital Services</Text>
          <View style={styles.headerActions}>
            {!isDesktop && (
              <LayoutToggle 
                isGridLayout={isGridLayout} 
                onToggle={() => setIsGridLayout(!isGridLayout)} 
              />
            )}
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading digital services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (digitalServices.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.primary.main} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Digital Services</Text>
          <View style={styles.headerActions}>
            {!isDesktop && (
              <LayoutToggle 
                isGridLayout={isGridLayout} 
                onToggle={() => setIsGridLayout(!isGridLayout)} 
              />
            )}
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No digital services found</Text>
          <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
            Digital services will appear here when service providers create them
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <DesktopWrapper scrollable={true} className="digital-services-screen">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.primary.main} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Digital Services</Text>
          <View style={styles.headerActions}>
            {!isDesktop && (
              <LayoutToggle 
                isGridLayout={isGridLayout} 
                onToggle={() => setIsGridLayout(!isGridLayout)} 
              />
            )}
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isDesktop ? (
            <ResponsiveGrid 
              columns={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}
              gap={16}
              className="digital-services-grid"
            >
              {digitalServices.map((service) => (
                <GridCard key={service.id} className="app-service-card">
                  <ServiceCard 
                    service={service}
                    onPress={() => {
                      if (isWeb && width >= 1024) {
                        // On desktop, open in modal or side panel
                        router.push(`/service/${service.id}`);
                      } else {
                        // On mobile, navigate to service page
                        router.push(`/service/${service.id}`);
                      }
                    }}
                  />
                </GridCard>
              ))}
            </ResponsiveGrid>
          ) : (
            isGridLayout ? (
              <View style={styles.servicesGrid}>
                {digitalServices.map((service) => (
                  <View key={service.id} style={styles.serviceCardContainer}>
                    <ServiceCard 
                      service={service}
                      layout="vertical"
                      onPress={() => router.push(`/service/${service.id}`)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.servicesList}>
                {digitalServices.map((service) => (
                  <View key={service.id} style={styles.serviceListItem}>
                    <ServiceCard 
                      service={service}
                      layout="horizontal"
                      onPress={() => router.push(`/service/${service.id}`)}
                    />
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </DesktopWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCardContainer: {
    width: isDesktop ? '23%' : '48%',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesList: {
    flex: 1,
    width: '100%',
  },
  serviceListItem: {
    marginBottom: 12,
    width: '100%',
  },
});