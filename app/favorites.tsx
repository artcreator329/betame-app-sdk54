import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Grid3X3, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FavoritesService, FavoriteService } from '@/lib/favorites-service';
import ServiceCard from '@/components/ServiceCard';

export default function FavoritesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false); // false = 1 column, true = 2 columns

  const loadFavorites = async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const userFavorites = await FavoritesService.getUserFavorites(user.id);
      setFavorites(userFavorites);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError('Failed to load favorites. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Favorites</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loginPrompt}>
          <Heart size={64} color={colors.text.secondary} />
          <Text style={[styles.loginTitle, { color: colors.text.primary }]}>Sign in to view favorites</Text>
          <Text style={[styles.loginSubtitle, { color: colors.text.secondary }]}>
            Save your favorite services and access them anytime
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginButtonText, { color: colors.text.white }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Favorites</Text>
        <TouchableOpacity 
          onPress={() => setIsGridView(!isGridView)}
          style={[styles.toggleButton, { backgroundColor: colors.background.secondary }]}
        >
          {isGridView ? (
            <List size={20} color={colors.text.primary} />
          ) : (
            <Grid3X3 size={20} color={colors.text.primary} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading favorites...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Heart size={64} color={colors.text.secondary} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Error loading favorites</Text>
          <Text style={[styles.errorSubtitle, { color: colors.text.secondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary.main }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: colors.text.white }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={64} color={colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No favorites yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            Start exploring services and tap the heart icon to save your favorites
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: colors.primary.main }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.exploreButtonText, { color: colors.text.white }]}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          key={isGridView ? 'grid' : 'list'} // Force re-render when layout changes
          numColumns={isGridView ? 2 : 1}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.favoritesContainer,
            isGridView && styles.gridContainer
          ]}
          columnWrapperStyle={isGridView ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
          renderItem={({ item }) => (
            <View style={[
              styles.favoriteItem,
              isGridView && styles.gridItem
            ]}>
              <ServiceCard
                service={item.service!}
                onPress={() => router.push(`/service/${item.service_id}`)}
                viewSource="favorites"
                layout={isGridView ? 'vertical' : 'vertical'}
                style={isGridView ? styles.gridCard : undefined}
              />
            </View>
          )}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  favoritesContainer: {
    padding: 16,
  },
  gridContainer: {
    paddingHorizontal: 8,
  },
  favoriteItem: {
    flex: 1,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    marginBottom: 0,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});