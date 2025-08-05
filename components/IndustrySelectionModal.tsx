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

export interface Industry {
  id: string;
  name: string;
}

interface IndustrySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIndustries: string[];
  onIndustriesChange: (industries: string[]) => void;
}

const allIndustries: Industry[] = [
  { id: 'all', name: 'All Industries' },
  { id: 'professional-services', name: 'Professional Services' },
  { id: 'construction-maintenance', name: 'Construction & Maintenance' },
  { id: 'technology', name: 'Technology & IT' },
  { id: 'healthcare', name: 'Healthcare & Medical' },
  { id: 'education', name: 'Education & Training' },
  { id: 'finance', name: 'Finance & Banking' },
  { id: 'retail', name: 'Retail & E-commerce' },
  { id: 'hospitality', name: 'Hospitality & Tourism' },
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'transportation', name: 'Transportation & Logistics' },
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'media-entertainment', name: 'Media & Entertainment' },
  { id: 'agriculture', name: 'Agriculture & Farming' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'food-beverage', name: 'Food & Beverage' },
  { id: 'sports-recreation', name: 'Sports & Recreation' },
  { id: 'non-profit', name: 'Non-Profit & Social Services' },
  { id: 'government', name: 'Government & Public Sector' },
];

export default function IndustrySelectionModal({
  visible,
  onClose,
  selectedIndustries,
  onIndustriesChange,
}: IndustrySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedIndustries, setTempSelectedIndustries] = useState<string[]>(selectedIndustries);

  const filteredIndustries = allIndustries.filter((industry) =>
    industry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIndustryToggle = (industryId: string) => {
    if (industryId === 'all') {
      if (tempSelectedIndustries.includes('all')) {
        setTempSelectedIndustries([]);
      } else {
        setTempSelectedIndustries(['all']);
      }
      return;
    }

    const newSelected = tempSelectedIndustries.includes(industryId)
      ? tempSelectedIndustries.filter((id) => id !== industryId && id !== 'all')
      : tempSelectedIndustries.filter((id) => id !== 'all').concat(industryId);

    // Limit to 5 industries (excluding 'all')
    if (newSelected.length <= 5) {
      setTempSelectedIndustries(newSelected);
    }
  };

  const handleDone = () => {
    onIndustriesChange(tempSelectedIndustries);
    onClose();
  };

  const handleClose = () => {
    setTempSelectedIndustries(selectedIndustries);
    setSearchQuery('');
    onClose();
  };

  const isSelected = (industryId: string) => tempSelectedIndustries.includes(industryId);
  const nonAllSelected = tempSelectedIndustries.filter((id) => id !== 'all');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Select Industries</Text>
            <Text style={styles.subtitle}>Up to 5 industries</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for industry"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        <ScrollView style={styles.industriesContainer} showsVerticalScrollIndicator={false}>
          {filteredIndustries.map((industry) => (
            <TouchableOpacity
              key={industry.id}
              style={styles.industryItem}
              onPress={() => handleIndustryToggle(industry.id)}
            >
              <View style={styles.checkbox}>
                {isSelected(industry.id) && (
                  <Check size={16} color="#007AFF" strokeWidth={3} />
                )}
              </View>
              <Text style={styles.industryText}>{industry.name}</Text>
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
    backgroundColor: Colors.background.secondary,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  industriesContainer: {
    flex: 1,
    paddingTop: 16,
  },
  industryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});