import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Dimensions
} from 'react-native';
import { Search, X, Clock, TrendingUp, MapPin, User, Briefcase, Tag } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { SearchService, SearchSuggestion } from '@/lib/search-service';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SearchBarWithAutoCompleteProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  initialValue?: string;
  showPopularTerms?: boolean;
  style?: any;
}

export default function SearchBarWithAutoComplete({
  placeholder = "Search for Talents/Services...",
  onSearch,
  onSuggestionSelect,
  initialValue = '',
  showPopularTerms = true,
  style
}: SearchBarWithAutoCompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const colors = useColors();
  const router = useRouter();
  const { recentSearches, addRecentSearch } = useRecentSearches();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<TextInput>(null);

  // Load popular terms on mount
  useEffect(() => {
    loadPopularTerms();
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const loadPopularTerms = async () => {
    try {
      const popular = await SearchService.getPopularSearchTerms();
      setPopularTerms(popular);
    } catch (error) {
      console.error('Error loading popular terms:', error);
    }
  };

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const results = await SearchService.getAutoCompleteSuggestions(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (text.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      addRecentSearch(finalQuery.trim());
      setShowSuggestions(false);
      Keyboard.dismiss();
      
      if (onSearch) {
        onSearch(finalQuery.trim());
      } else {
        // Default navigation to search results
        router.push(`/search?q=${encodeURIComponent(finalQuery.trim())}`);
      }
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else {
      // Default navigation based on suggestion type
      switch (suggestion.type) {
        case 'service':
          router.push(`/service/${suggestion.id}`);
          break;
        case 'job':
          router.push(`/job/${suggestion.id}`);
          break;
        case 'user':
          router.push(`/profile/${suggestion.id}`);
          break;
        case 'category':
          router.push(`/search?category=${encodeURIComponent(suggestion.title)}`);
          break;
        case 'location':
          router.push(`/search?location=${encodeURIComponent(suggestion.title)}`);
          break;
        default:
          handleSearch(suggestion.title);
      }
    }
  };

  const handlePopularTermPress = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  const handleRecentSearchPress = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.trim().length >= 2) {
      setShowSuggestions(true);
    } else if (showPopularTerms && (popularTerms.length > 0 || recentSearches.length > 0)) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for suggestion tap
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const getIconForSuggestionType = (type: string) => {
    switch (type) {
      case 'service':
        return <Tag size={16} color={colors.primary.main} />;
      case 'job':
        return <Briefcase size={16} color={colors.primary.main} />;
      case 'user':
        return <User size={16} color={colors.primary.main} />;
      case 'category':
        return <Tag size={16} color={colors.text.secondary} />;
      case 'location':
        return <MapPin size={16} color={colors.text.secondary} />;
      default:
        return <Search size={16} color={colors.text.secondary} />;
    }
  };

  const renderSuggestionItem = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: colors.background.primary }]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionIcon}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.suggestionImage} />
        ) : (
          getIconForSuggestionType(item.type)
        )}
      </View>
      <View style={styles.suggestionContent}>
        <Text style={[styles.suggestionTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={[styles.suggestionSubtitle, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      {item.rating && item.rating > 0 && (
        <View style={styles.suggestionRating}>
          <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
            ⭐ {item.rating.toFixed(1)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPopularTerm = (term: string, index: number) => (
    <TouchableOpacity
      key={`popular-${index}`}
      style={[styles.popularTermChip, { backgroundColor: colors.background.secondary }]}
      onPress={() => handlePopularTermPress(term)}
    >
      <TrendingUp size={14} color={colors.primary.main} />
      <Text style={[styles.popularTermText, { color: colors.text.primary }]}>{term}</Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = (term: string, index: number) => (
    <TouchableOpacity
      key={`recent-${index}`}
      style={[styles.recentSearchItem, { backgroundColor: colors.background.primary }]}
      onPress={() => handleRecentSearchPress(term)}
    >
      <Clock size={16} color={colors.text.secondary} />
      <Text style={[styles.recentSearchText, { color: colors.text.primary }]}>{term}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={[
        styles.searchContainer, 
        { 
          backgroundColor: colors.background.secondary,
          borderColor: isFocused ? colors.primary.main : 'transparent',
          borderWidth: isFocused ? 1 : 0
        }
      ]}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder={placeholder}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => handleSearch()}
          placeholderTextColor={colors.text.secondary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearQuery} style={styles.clearButton}>
            <X size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary.main} style={styles.loadingIndicator} />
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || (query.length < 2 && (popularTerms.length > 0 || recentSearches.length > 0))) && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.background.primary }]}>
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            />
          )}

          {/* Popular Terms and Recent Searches (when no query) */}
          {query.length < 2 && (
            <View style={styles.defaultContent}>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Recent Searches
                  </Text>
                  {recentSearches.slice(0, 5).map(renderRecentSearch)}
                </View>
              )}

              {/* Popular Terms */}
              {popularTerms.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Popular Searches
                  </Text>
                  <View style={styles.popularTermsContainer}>
                    {popularTerms.map(renderPopularTerm)}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    maxHeight: 300,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1001,
    marginTop: 4,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 14,
  },
  suggestionRating: {
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  defaultContent: {
    padding: 16,
    maxHeight: 250,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  recentSearchText: {
    fontSize: 15,
    marginLeft: 12,
  },
  popularTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularTermChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  popularTermText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
});