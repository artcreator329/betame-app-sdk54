import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  ScrollView,
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

// Simplified version to isolate the issue
export default function SearchBarWithAutoComplete(props: SearchBarWithAutoCompleteProps) {
  try {
    const colors = useColors();
    const [query, setQuery] = useState('');
    
    const handleSearch = () => {
      if (query.trim() && props.onSearch) {
        props.onSearch(query.trim());
      }
    };
    
    return (
      <View style={[styles.container, props.style]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary }]}>
          <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={String(props.placeholder || "Search...")}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={colors.text.secondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  } catch (error) {
    console.error('SearchBarWithAutoComplete error:', error);
    
    // Ultimate fallback
    return (
      <View style={[styles.container, props.style]}>
        <View style={[styles.searchContainer, { backgroundColor: '#f5f5f5' }]}>
          <Search size={20} color="#666666" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: '#000000' }]}
            placeholder="Search..."
            placeholderTextColor="#666666"
            onSubmitEditing={(event) => {
              if (props.onSearch) {
                props.onSearch(event.nativeEvent.text);
              }
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>
    );
  }
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
});