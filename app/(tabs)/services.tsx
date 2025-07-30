import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import ServiceCard from '@/components/ServiceCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { allServices } from '@/data/mockData';

export default function ServicesScreen() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryDisplayText = () => {
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
      return 'All Categories';
    }
    if (selectedCategories.length === 1) {
      // Map category IDs to display names
      const categoryMap: { [key: string]: string } = {
        'fitness': 'Fitness',
        'digital': 'Digital Marketing',
        'education': 'Education',
        'sports': 'Sports',
        'beauty': 'Beauty',
        'healthcare': 'Healthcare',
        // Add more mappings as needed
      };
      return categoryMap[selectedCategories[0]] || selectedCategories[0];
    }
    return `${selectedCategories.length} Categories`;
  };

  const filteredServices = allServices.filter((service) => {
    const matchesCategory = selectedCategories.includes('all') || 
                           selectedCategories.length === 0 ||
                           selectedCategories.some(cat => 
                             service.category.toLowerCase().includes(cat.toLowerCase())
                           );
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity>
          <Search size={24} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.categoryDropdown}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.categoryText}>{getCategoryDisplayText()}</Text>
          <ChevronDown size={20} color="#1D1D1F" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <SlidersHorizontal size={20} color="#1D1D1F" />
        </TouchableOpacity>
      </View>

      {/* Services Grid */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.servicesGrid}>
          {filteredServices.map((service) => (
            <View key={service.id} style={styles.serviceCardContainer}>
              <ServiceCard service={service} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <CategorySelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />
    </SafeAreaView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
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
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginTop: 1,
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  serviceCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
});