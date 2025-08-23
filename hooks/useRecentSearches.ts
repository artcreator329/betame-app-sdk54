import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const searches = JSON.parse(stored);
        // Validate that searches is an array of strings
        if (Array.isArray(searches)) {
          const validSearches = searches.filter(term => 
            term && typeof term === 'string' && term.trim().length > 0
          );
          setRecentSearches(validSearches);
          
          // If we filtered out invalid data, save the cleaned version
          if (validSearches.length !== searches.length) {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(validSearches));
          }
        } else {
          // Invalid data format, clear it
          await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
          setRecentSearches([]);
        }
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      // Clear corrupted data
      try {
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
        setRecentSearches([]);
      } catch (clearError) {
        console.error('Error clearing corrupted recent searches:', clearError);
      }
    }
  };

  const addRecentSearch = async (searchTerm: string) => {
    try {
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      const updated = [
        trimmed,
        ...recentSearches.filter(term => term !== trimmed)
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const removeRecentSearch = async (searchTerm: string) => {
    try {
      const updated = recentSearches.filter(term => term !== searchTerm);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches
  };
}