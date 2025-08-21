import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Filter, SlidersHorizontal } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SearchService, SearchResult, SearchFilters } from '@/lib/search-service';
import SearchBarWithAutoComplete from '@/components/SearchBarWithAutoComplete';
import ServiceCard from '@/components/ServiceCard';
import { Service } from '@/types/service';

export default function SearchScreen() {
  const { q, category, location } = useLocalSearchParams<{
    q?: string;
    category?: string;
    location?: string;
  }>();
  
  const [searchQuery, setSearchQuery] = useState(q || '');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: category,
    location: location
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'jobs' | 'users'>('all');

  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    console.log('🔍 SearchScreen: useEffect for searchQuery, searchQuery:', searchQuery, 'filters:', filters);
    if (searchQuery.trim()) {
      console.log('🔍 SearchScreen: Triggering performSearch with:', searchQuery);
      performSearch(searchQuery, filters);
    }
  }, [searchQuery, filters, performSearch]);

  useEffect(() => {
    console.log('🔍 SearchScreen: useEffect for q parameter, q:', q);
    if (q) {
      console.log('🔍 SearchScreen: Setting searchQuery to:', q);
      setSearchQuery(q);
      // Also trigger the search immediately when we have a query parameter
      performSearch(q, filters);
    }
  }, [q, performSearch, filters]);

  const performSearch = useCallback(async (query: string, searchFilters?: SearchFilters) => {
    console.log('🔍 SearchScreen.performSearch called with query:', query, 'filters:', searchFilters);
    if (!query.trim()) {
      console.log('🔍 SearchScreen.performSearch: Empty query, returning early');
      return;
    }

    setIsLoading(true);
    try {
      const results = await SearchService.search(query, searchFilters);
      console.log('🔍 SearchScreen.performSearch: Got results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('🔍 SearchScreen.performSearch: Error performing search:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (query: string) => {
    console.log('🔍 SearchScreen.handleSearch called with query:', query);
    setSearchQuery(query);
    performSearch(query, filters);
  };

  const convertSearchResultToService = (result: any): Service => {
    return {
      id: result.id,
      title: result.title,
      description: result.subtitle || '',
      price: result.price || 0,
      currency: result.currency || 'RM',
      category_name: result.category || 'General',
      image_url: result.image_url,
      location: result.location || '',
      rating: result.rating || 0,
      review_count: 0,
      user_id: result.user_id || '',
      is_nearby: false,
      is_trending: false,
      created_at: '',
      updated_at: '',
      provider_name: 'Service Provider',
      provider_avatar: undefined,
    };
  };

  const getTabCount = (tab: string) => {
    if (!searchResults) return 0;
    switch (tab) {
      case 'services':
        return searchResults.services.length;
      case 'jobs':
        return searchResults.jobs.length;
      case 'users':
        return searchResults.users.length;
      default:
        return searchResults.total;
    }
  };

  const renderTabContent = () => {
    if (!searchResults) {
      console.log('🔍 SearchScreen.renderTabContent: searchResults is null');
      return null;
    }
    
    console.log('🔍 SearchScreen.renderTabContent: Rendering with searchResults:', {
      services: searchResults.services.length,
      jobs: searchResults.jobs.length,
      users: searchResults.users.length,
      total: searchResults.total
    });

    const renderServiceItem = (item: any) => (
      <View key={item.id} style={styles.resultItem}>
        <ServiceCard service={convertSearchResultToService(item)} />
      </View>
    );

    const renderJobItem = (item: any) => (
      <TouchableOpacity
        key={item.id}
        style={[styles.jobItem, { backgroundColor: colors.background.secondary }]}
        onPress={() => {
          if (!user) {
            Alert.alert(
              'Sign In Required',
              'Please sign in to view job details.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: () => router.push('/auth/login') }
              ]
            );
            return;
          }
          router.push(`/job/${item.id}`);
        }}
      >
        <Text style={[styles.jobTitle, { color: colors.text.primary }]}>{item.title}</Text>
        <Text style={[styles.jobSubtitle, { color: colors.text.secondary }]}>{item.subtitle}</Text>
        {item.location && (
          <Text style={[styles.jobLocation, { color: colors.text.secondary }]}>{item.location}</Text>
        )}
      </TouchableOpacity>
    );

    const renderUserItem = (item: any) => (
      <TouchableOpacity
        key={item.id}
        style={[styles.userItem, { backgroundColor: colors.background.secondary }]}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <Text style={[styles.userTitle, { color: colors.text.primary }]}>{item.title}</Text>
        <Text style={[styles.userSubtitle, { color: colors.text.secondary }]}>{item.subtitle}</Text>
      </TouchableOpacity>
    );

    switch (activeTab) {
      case 'services':
        return (
          <View style={styles.tabContent}>
            {searchResults.services.map(renderServiceItem)}
          </View>
        );
      case 'jobs':
        return (
          <View style={styles.tabContent}>
            {searchResults.jobs.map(renderJobItem)}
          </View>
        );
      case 'users':
        return (
          <View style={styles.tabContent}>
            {searchResults.users.map(renderUserItem)}
          </View>
        );
      default:
        return (
          <View style={styles.tabContent}>
            {searchResults.services.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Services ({searchResults.services.length})
                </Text>
                {searchResults.services.slice(0, 3).map(renderServiceItem)}
                {searchResults.services.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => setActiveTab('services')}
                  >
                    <Text style={[styles.viewMoreText, { color: colors.primary.main }]}>
                      View all {searchResults.services.length} services
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {searchResults.jobs.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Jobs ({searchResults.jobs.length})
                </Text>
                {searchResults.jobs.slice(0, 3).map(renderJobItem)}
                {searchResults.jobs.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => setActiveTab('jobs')}
                  >
                    <Text style={[styles.viewMoreText, { color: colors.primary.main }]}>
                      View all {searchResults.jobs.length} jobs
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {searchResults.users.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  People ({searchResults.users.length})
                </Text>
                {searchResults.users.slice(0, 3).map(renderUserItem)}
                {searchResults.users.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => setActiveTab('users')}
                  >
                    <Text style={[styles.viewMoreText, { color: colors.primary.main }]}>
                      View all {searchResults.users.length} people
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <SearchBarWithAutoComplete
            initialValue={searchQuery}
            onSearch={handleSearch}
            placeholder="Search..."
            style={styles.searchBar}
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <SlidersHorizontal size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Info */}
        {searchQuery && (
          <View style={styles.searchInfo}>
            <Text style={[styles.searchInfoText, { color: colors.text.secondary }]}>
              {isLoading ? 'Searching...' : 
                searchResults ? `${searchResults.total} results for "${searchQuery}"` : 
                'No results found'
              }
            </Text>
            <Text style={[styles.searchInfoText, { color: colors.text.secondary, fontSize: 12 }]}>
              Debug: searchQuery="{searchQuery}", searchResults={searchResults ? 'exists' : 'null'}, isLoading={isLoading.toString()}
            </Text>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Searching...
            </Text>
          </View>
        )}

        {/* Tabs */}
        {searchResults && searchResults.total > 0 && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'all', label: 'All' },
                { key: 'services', label: 'Services' },
                { key: 'jobs', label: 'Jobs' },
                { key: 'users', label: 'People' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: activeTab === tab.key ? colors.primary.main : colors.background.secondary,
                    }
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === tab.key ? colors.text.white : colors.text.primary,
                      }
                    ]}
                  >
                    {tab.label} ({getTabCount(tab.key)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results */}
        {!isLoading && renderTabContent()}

        {/* No Results */}
        {!isLoading && searchResults && searchResults.total === 0 && searchQuery && (
          <View style={styles.noResults}>
            <Text style={[styles.noResultsTitle, { color: colors.text.primary }]}>
              No results found
            </Text>
            <Text style={[styles.noResultsText, { color: colors.text.secondary }]}>
              Try adjusting your search terms or filters
            </Text>
          </View>
        )}

        {/* Initial State - No Search Query */}
        {!isLoading && !searchQuery && !searchResults && (
          <View style={styles.initialState}>
            <Text style={[styles.initialStateTitle, { color: colors.text.primary }]}>
              Search for services, jobs, or people
            </Text>
            <Text style={[styles.initialStateText, { color: colors.text.secondary }]}>
              Enter a search term to get started
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    marginHorizontal: 0,
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  searchInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInfoText: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 16,
  },
  jobItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: 12,
  },
  userItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userSubtitle: {
    fontSize: 14,
  },
  viewMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  initialStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  initialStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});