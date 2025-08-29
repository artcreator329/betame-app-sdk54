import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Search, X, TrendingUp, MapPin, User, Briefcase, Tag } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { SearchService, SearchSuggestion } from '@/lib/search-service';
import { useRouter } from 'expo-router';



interface SearchBarWithAutoCompleteProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  initialValue?: string;
  showPopularTerms?: boolean;
  style?: any;
}

export default function SearchBarWithAutoComplete(props: SearchBarWithAutoCompleteProps) {
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState(props.initialValue || '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Fetch popular terms on mount
  useEffect(() => {
    const fetchPopularTerms = async () => {
      try {
        const terms = await SearchService.getPopularSearchTerms();
        setPopularTerms(terms);
      } catch (error) {
        console.error('Error fetching popular terms:', error);
      }
    };
    
    if (props.showPopularTerms !== false) {
      fetchPopularTerms();
    }
  }, [props.showPopularTerms]);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const results = await SearchService.getAutoCompleteSuggestions(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle query change with debouncing
  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Show suggestions dropdown when user starts typing
    setShowSuggestions(text.length > 0);

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSearch(text);
    }, 300);
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim() && props.onSearch) {
      props.onSearch(finalQuery.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    
    if (props.onSuggestionSelect) {
      props.onSuggestionSelect(suggestion);
    } else {
      // Default behavior: navigate based on suggestion type
      switch (suggestion.type) {
        case 'service':
          router.push(`/service/${suggestion.id}`);
          break;
        case 'job':
          router.push(`/job/${suggestion.id}`);
          break;
        case 'user':
          router.push(`/profile/${suggestion.user_id}`);
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
    
    inputRef.current?.blur();
  };

  // Handle popular term selection
  const handlePopularTermSelect = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'service':
        return <Briefcase size={16} color={colors.text.secondary} />;
      case 'job':
        return <Briefcase size={16} color={colors.text.secondary} />;
      case 'user':
        return <User size={16} color={colors.text.secondary} />;
      case 'category':
        return <Tag size={16} color={colors.text.secondary} />;
      case 'location':
        return <MapPin size={16} color={colors.text.secondary} />;
      default:
        return <Search size={16} color={colors.text.secondary} />;
    }
  };



  return (
    <View style={[styles.container, props.style]}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary }]}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder={String(props.placeholder || "Search...")}
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={() => handleSearch()}
          onFocus={() => setShowSuggestions(query.length > 0)}
          placeholderTextColor={colors.text.secondary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
            }} 
            style={styles.clearButton}
          >
            <X size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { 
          backgroundColor: colors.background.primary,
          borderColor: colors.border.light,
          shadowColor: colors.shadow.medium 
        }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                Searching...
              </Text>
            </View>
          ) : suggestions.length > 0 ? (
            <ScrollView
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={`${item.type}-${item.id}`}
                  style={[styles.suggestionItem, { backgroundColor: colors.background.primary }]}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <View style={styles.suggestionIcon}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.suggestionImage} />
                    ) : (
                      getSuggestionIcon(item.type)
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
                  <View style={styles.suggestionArrow}>
                    <Search size={14} color={colors.text.secondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : query.length >= 2 ? (
            <View style={styles.noSuggestionsContainer}>
              <Text style={[styles.noSuggestionsText, { color: colors.text.secondary }]}>
                No suggestions found
              </Text>
            </View>
          ) : popularTerms.length > 0 ? (
            <View style={styles.popularTermsContainer}>
              <View style={styles.popularTermsHeader}>
                <TrendingUp size={16} color={colors.text.secondary} />
                <Text style={[styles.popularTermsTitle, { color: colors.text.secondary }]}>
                  Popular searches
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.popularTermsRow}>
                  {popularTerms.slice(0, 6).map((term, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.popularTermChip, { 
                        backgroundColor: colors.background.secondary,
                        borderColor: colors.border.light 
                      }]}
                      onPress={() => handlePopularTermSelect(term)}
                    >
                      <Text style={[styles.popularTermText, { color: colors.text.primary }]}>
                        {term}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9998,
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
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 300,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    elevation: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 9999,
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  suggestionArrow: {
    marginLeft: 8,
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
  noSuggestionsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noSuggestionsText: {
    fontSize: 14,
  },
  popularTermsContainer: {
    padding: 16,
  },
  popularTermsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  popularTermsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  popularTermsRow: {
    flexDirection: 'row',
  },
  popularTermChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  popularTermText: {
    fontSize: 14,
    fontWeight: '500',
  },
});