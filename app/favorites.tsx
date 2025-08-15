import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Simulate loading favorites
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading favorites...</Text>
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
          <View style={styles.favoritesContainer}>
            {/* Favorites list would go here */}
            <Text style={[styles.comingSoon, { color: colors.text.secondary }]}>
              Your favorite services will appear here
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
    padding: 20,
  },
  comingSoon: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
  },
});