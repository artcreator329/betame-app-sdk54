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
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react-native';


export interface Category {
  id: string;
  name: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  services: Category[];
}

interface SingleCategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
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

export default function SingleCategorySelectionModal({
  visible,
  onClose,
  selectedCategory,
  onCategoryChange,
}: SingleCategorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<ServiceCategory | null>(null);

  const filteredCategories = serviceCategories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.services.some(service => service.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredServices = selectedCategoryGroup?.services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategoryGroup(category);
    setSearchQuery('');
  };

  const handleServiceSelect = (serviceId: string) => {
    onCategoryChange(serviceId);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategoryGroup(null);
    onClose();
  };

  const handleBack = () => {
    setSelectedCategoryGroup(null);
    setSearchQuery('');
  };

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
          <ChevronRight size={20} color="#8E8E93" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderServices = () => (
    <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
      {filteredServices.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={[
            styles.categoryItem,
            selectedCategory === service.id && styles.selectedServiceItem
          ]}
          onPress={() => handleServiceSelect(service.id)}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === service.id && styles.selectedServiceText
          ]}>
            {service.name}
          </Text>
          {selectedCategory === service.id && (
            <View style={styles.selectedIndicator} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {selectedCategoryGroup ? (
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
              {selectedCategoryGroup ? selectedCategoryGroup.name : 'Select Service Type'}
            </Text>
            <Text style={styles.subtitle}>
              {selectedCategoryGroup ? 'Choose a specific service' : 'Choose a service category'}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedCategoryGroup ? "Search services..." : "Search categories..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        {selectedCategoryGroup ? renderServices() : renderCategories()}
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
  placeholder: {
    width: 24,
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
  categoriesContainer: {
    flex: 1,
    backgroundColor: 'white',
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
    borderBottomColor: '#F2F2F7',
  },
  categoryContent: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    color: '#1D1D1F',
    flex: 1,
  },
  serviceCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  selectedServiceItem: {
    backgroundColor: '#007AFF10',
  },
  selectedServiceText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});