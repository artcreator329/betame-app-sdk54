import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export interface Category {
  id: string;
  name: string;
}

interface CategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const allCategories: Category[] = [
  { id: 'all', name: 'All' },
  { id: 'accounting', name: 'Accounting & Finance Services' },
  { id: 'administration', name: 'Administration & Business' },
  { id: 'advertising', name: 'Advertising & Media' },
  { id: 'agriculture', name: 'Agriculture & Farming' },
  { id: 'architecture', name: 'Architecture & Design' },
  { id: 'arts', name: 'Arts & Entertainment' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'banking', name: 'Banking & Financial Services' },
  { id: 'beauty', name: 'Beauty & Cosmetics' },
  { id: 'childcare', name: 'Childcare & Babysitting' },
  { id: 'cleaning', name: 'Cleaning & Maintenance' },
  { id: 'consulting', name: 'Consulting & Strategy' },
  { id: 'construction', name: 'Construction & Renovation' },
  { id: 'cooking', name: 'Cooking & Catering' },
  { id: 'customer', name: 'Customer Service' },
  { id: 'delivery', name: 'Delivery & Logistics' },
  { id: 'digital', name: 'Digital & IT' },
  { id: 'education', name: 'Education & Training' },
  { id: 'elderly', name: 'Elderly Care Services' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'event', name: 'Event Planning & Management' },
  { id: 'fashion', name: 'Fashion & Styling' },
  { id: 'fitness', name: 'Fitness & Personal Training' },
  { id: 'fnb', name: 'F&B' },
  { id: 'gaming', name: 'Gaming & Streaming' },
  { id: 'gardening', name: 'Gardening & Landscaping' },
  { id: 'graphic', name: 'Graphic Design & Creative' },
  { id: 'healthcare', name: 'Healthcare & Medical Services' },
  { id: 'home', name: 'Home & Living' },
  { id: 'hospitality', name: 'Hospitality & Tourism' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'insurance', name: 'Insurance Services' },
  { id: 'interior', name: 'Interior Design' },
  { id: 'jewelry', name: 'Jewelry & Accessories' },
  { id: 'language', name: 'Language & Translation' },
  { id: 'legal', name: 'Legal Services' },
  { id: 'logistics', name: 'Logistics & Supply Chain' },
  { id: 'marketing', name: 'Marketing & Advertising' },
  { id: 'massage', name: 'Massage & Wellness' },
  { id: 'music', name: 'Music & Audio Production' },
  { id: 'photography', name: 'Photography & Videography' },
  { id: 'plumbing', name: 'Plumbing & Electrical' },
  { id: 'printing', name: 'Printing & Publishing' },
  { id: 'programming', name: 'Programming & Development' },
  { id: 'realestate', name: 'Real Estate Services' },
  { id: 'repair', name: 'Repair & Maintenance' },
  { id: 'research', name: 'Research & Analysis' },
  { id: 'retail', name: 'Retail & Sales' },
  { id: 'security', name: 'Security Services' },
  { id: 'social', name: 'Social Media Management' },
  { id: 'sports', name: 'Sports & Recreation' },
  { id: 'technology', name: 'Technology Support' },
  { id: 'transportation', name: 'Transportation Services' },
  { id: 'travel', name: 'Travel & Tour Services' },
  { id: 'tutoring', name: 'Tutoring & Academic Support' },
  { id: 'veterinary', name: 'Veterinary & Pet Care' },
  { id: 'wedding', name: 'Wedding Services' },
  { id: 'wellness', name: 'Wellness & Mental Health' },
  { id: 'writing', name: 'Writing & Content Creation' },
];

export default function CategorySelectionModal({
  visible,
  onClose,
  selectedCategories,
  onCategoriesChange,
}: CategorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(selectedCategories);

  const filteredCategories = allCategories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === 'all') {
      if (tempSelectedCategories.includes('all')) {
        setTempSelectedCategories([]);
      } else {
        setTempSelectedCategories(['all']);
      }
      return;
    }

    const newSelected = tempSelectedCategories.includes(categoryId)
      ? tempSelectedCategories.filter((id) => id !== categoryId && id !== 'all')
      : tempSelectedCategories.filter((id) => id !== 'all').concat(categoryId);

    // Limit to 5 categories (excluding 'all')
    if (newSelected.length <= 5) {
      setTempSelectedCategories(newSelected);
    }
  };

  const handleDone = () => {
    onCategoriesChange(tempSelectedCategories);
    onClose();
  };

  const handleClose = () => {
    setTempSelectedCategories(selectedCategories);
    setSearchQuery('');
    onClose();
  };

  const isSelected = (categoryId: string) => tempSelectedCategories.includes(categoryId);
  const nonAllSelected = tempSelectedCategories.filter((id) => id !== 'all');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Select Categories</Text>
            <Text style={styles.subtitle}>Up to 5 categories</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for category"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategoryToggle(category.id)}
            >
              <View style={styles.checkbox}>
                {isSelected(category.id) && (
                  <Check size={16} color="#007AFF" strokeWidth={3} />
                )}
              </View>
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>
              Done {nonAllSelected.length > 0 && `(${nonAllSelected.length}/5)`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  categoriesContainer: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 4,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  doneButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});