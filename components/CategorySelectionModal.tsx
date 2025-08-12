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
import { Search, X, Check, ChevronLeft } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

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

const serviceCategories: ServiceCategory[] = [
  {
    id: 'personal-care',
    name: 'Personal Care & Wellness',
    services: [
      { id: 'beauty-cosmetics', name: 'Beauty & Cosmetics' },
      { id: 'fitness-training', name: 'Fitness & Personal Training' },
      { id: 'massage-wellness', name: 'Massage & Wellness' },
      { id: 'healthcare-medical', name: 'Healthcare & Medical Services' },
      { id: 'wellness-mental-health', name: 'Wellness & Mental Health' },
    ]
  },
  {
    id: 'home-living',
    name: 'Home & Living',
    services: [
      { id: 'cleaning-maintenance', name: 'Cleaning & Maintenance' },
      { id: 'repair-maintenance', name: 'Repair & Maintenance' },
      { id: 'gardening-landscaping', name: 'Gardening & Landscaping' },
      { id: 'interior-design', name: 'Interior Design' },
      { id: 'plumbing-electrical', name: 'Plumbing & Electrical' },
      { id: 'home-living', name: 'Home & Living' },
    ]
  },
  {
    id: 'professional',
    name: 'Professional Services',
    services: [
      { id: 'consulting-strategy', name: 'Consulting & Strategy' },
      { id: 'legal-services', name: 'Legal Services' },
      { id: 'accounting-finance', name: 'Accounting & Finance Services' },
      { id: 'marketing-advertising', name: 'Marketing & Advertising' },
      { id: 'hr', name: 'Human Resources' },
      { id: 'research-analysis', name: 'Research & Analysis' },
      { id: 'insurance-services', name: 'Insurance Services' },
    ]
  },
  {
    id: 'creative-media',
    name: 'Creative & Media',
    services: [
      { id: 'photography-videography', name: 'Photography & Videography' },
      { id: 'graphic-design', name: 'Graphic Design & Creative' },
      { id: 'music-audio', name: 'Music & Audio Production' },
      { id: 'social-media', name: 'Social Media Management' },
      { id: 'writing-content', name: 'Writing & Content Creation' },
      { id: 'arts-entertainment', name: 'Arts & Entertainment' },
    ]
  },
  {
    id: 'technology',
    name: 'Technology',
    services: [
      { id: 'digital-it', name: 'Digital & IT' },
      { id: 'programming-development', name: 'Programming & Development' },
      { id: 'technology-support', name: 'Technology Support' },
    ]
  },
  {
    id: 'events-entertainment',
    name: 'Events & Entertainment',
    services: [
      { id: 'event-planning', name: 'Event Planning & Management' },
      { id: 'cooking-catering', name: 'Cooking & Catering' },
      { id: 'gaming-streaming', name: 'Gaming & Streaming' },
      { id: 'wedding-services', name: 'Wedding Services' },
      { id: 'fnb', name: 'F&B' },
    ]
  },
  {
    id: 'education-training',
    name: 'Education & Training',
    services: [
      { id: 'education-training', name: 'Education & Training' },
      { id: 'tutoring-academic', name: 'Tutoring & Academic Support' },
      { id: 'language-translation', name: 'Language & Translation' },
    ]
  },
  {
    id: 'transportation-delivery',
    name: 'Transportation & Delivery',
    services: [
      { id: 'delivery-logistics', name: 'Delivery & Logistics' },
      { id: 'logistics-supply-chain', name: 'Logistics & Supply Chain' },
      { id: 'transportation-services', name: 'Transportation Services' },
    ]
  },
  {
    id: 'care-services',
    name: 'Care Services',
    services: [
      { id: 'childcare-babysitting', name: 'Childcare & Babysitting' },
      { id: 'elderly-care', name: 'Elderly Care Services' },
      { id: 'veterinary-pet-care', name: 'Veterinary & Pet Care' },
    ]
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    services: [
      { id: 'fashion-styling', name: 'Fashion & Styling' },
      { id: 'sports-recreation', name: 'Sports & Recreation' },
      { id: 'jewelry-accessories', name: 'Jewelry & Accessories' },
      { id: 'travel-tour', name: 'Travel & Tour Services' },
    ]
  },
  {
    id: 'business-services',
    name: 'Business Services',
    services: [
      { id: 'administration-business', name: 'Administration & Business' },
      { id: 'customer-service', name: 'Customer Service' },
      { id: 'realestate-services', name: 'Real Estate Services' },
      { id: 'banking-financial', name: 'Banking & Financial Services' },
      { id: 'printing-publishing', name: 'Printing & Publishing' },
      { id: 'hospitality-tourism', name: 'Hospitality & Tourism' },
    ]
  },
  {
    id: 'specialized',
    name: 'Specialized Services',
    services: [
      { id: 'architecture-design', name: 'Architecture & Design' },
      { id: 'engineering', name: 'Engineering' },
      { id: 'construction-renovation', name: 'Construction & Renovation' },
      { id: 'automotive', name: 'Automotive' },
      { id: 'security-services', name: 'Security Services' },
      { id: 'agriculture-farming', name: 'Agriculture & Farming' },
      { id: 'advertising-media', name: 'Advertising & Media' },
    ]
  }
];

// Legacy support - keep the old flat structure for backward compatibility
const allCategories: Category[] = [
  { id: 'all', name: 'All' },
  ...serviceCategories.flatMap(category => category.services)
];

export default function CategorySelectionModal({
  visible,
  onClose,
  selectedCategories,
  onCategoriesChange,
}: CategorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(selectedCategories);

  // Flatten all services for search
  const allServices = serviceCategories.flatMap(category => category.services);

  const filteredCategories = serviceCategories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.services.some(service => service.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredServices = selectedCategory?.services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  const handleServiceToggle = (serviceId: string) => {
    if (serviceId === 'all') {
      if (tempSelectedCategories.includes('all')) {
        setTempSelectedCategories([]);
      } else {
        setTempSelectedCategories(['all']);
      }
      return;
    }

    const newSelected = tempSelectedCategories.includes(serviceId)
      ? tempSelectedCategories.filter((id) => id !== serviceId && id !== 'all')
      : tempSelectedCategories.filter((id) => id !== 'all').concat(serviceId);

    // Limit to 5 services (excluding 'all')
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
    setSelectedCategory(null);
    onClose();
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const isSelected = (serviceId: string) => tempSelectedCategories.includes(serviceId);
  const nonAllSelected = tempSelectedCategories.filter((id) => id !== 'all');

  const renderCategories = () => (
    <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
      {filteredCategories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryItem}
          onPress={() => handleCategorySelect(category)}
        >
          <View style={styles.categoryContent}>
            <Text style={styles.categoryText}>{category.name}</Text>
            <Text style={styles.serviceCount}>{category.services.length} services</Text>
          </View>
          <ChevronLeft size={20} color={Colors.text.secondary} style={styles.chevron} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderServices = () => (
    <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
      {filteredServices.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={styles.categoryItem}
          onPress={() => handleServiceToggle(service.id)}
        >
          <View style={styles.checkbox}>
            {isSelected(service.id) && (
              <Check size={16} color="#007AFF" strokeWidth={3} />
            )}
          </View>
          <Text style={styles.categoryText}>{service.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {selectedCategory ? (
            <TouchableOpacity onPress={handleBack}>
              <ChevronLeft size={24} color="#1D1D1F" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#1D1D1F" />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {selectedCategory ? selectedCategory.name : 'Select Service Type'}
            </Text>
            <Text style={styles.subtitle}>
              {selectedCategory ? 'Choose specific services' : 'Choose a service category'}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedCategory ? "Search services..." : "Search categories..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        {selectedCategory ? renderServices() : renderCategories()}

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
  categoryContent: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  serviceCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
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