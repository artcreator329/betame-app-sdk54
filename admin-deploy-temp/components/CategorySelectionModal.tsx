import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { AIServiceTypeService } from '@/lib/ai-service-type-service';

export interface Category {
  id: string;
  name: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  services: Category[];
}

interface CategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export default function CategorySelectionModal({
  visible,
  onClose,
  selectedCategories,
  onCategoriesChange,
}: CategorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();

  // Load available service types when modal opens
  useEffect(() => {
    if (visible) {
      loadServiceTypes();
    }
  }, [visible]);

  const loadServiceTypes = async () => {
    setIsLoading(true);
    try {
      const serviceTypes = await AIServiceTypeService.getServiceTypeSuggestions();
      setAvailableCategories(serviceTypes);
    } catch (error) {
      console.error('Error loading service types:', error);
      setAvailableCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = availableCategories.filter(category =>
    category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      onCategoriesChange([]);
    } else {
      onCategoriesChange(filteredCategories);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Filter by Categories</Text>
            <Text style={styles.subtitle}>Select service categories to filter</Text>
          </View>
          <TouchableOpacity onPress={handleSelectAll}>
            <Text style={[styles.selectAllText, { color: colors.primary }]}>
              {selectedCategories.length === filteredCategories.length ? 'Clear' : 'All'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading categories...</Text>
          </View>
        ) : (
          <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching categories found' : 'No categories available'}
                </Text>
              </View>
            ) : (
              filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => handleCategoryToggle(category)}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                  <View style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    selectedCategories.includes(category) && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {selectedCategories.includes(category) && (
                      <Check size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  categoriesContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // checkboxSelected styles are now applied inline with dynamic colors
});