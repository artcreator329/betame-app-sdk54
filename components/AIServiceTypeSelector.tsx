import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Search, X, Check, Sparkles, AlertCircle } from 'lucide-react-native';
import { AIServiceTypeService, ServiceTypeSuggestion } from '@/lib/ai-service-type-service';
import { useColors } from '@/contexts/ThemeContext';

interface AIServiceTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedServiceType: string;
  onServiceTypeChange: (serviceType: string) => void;
  serviceTitle?: string;
  serviceDescription?: string;
}

export default function AIServiceTypeSelector({
  visible,
  onClose,
  selectedServiceType,
  onServiceTypeChange,
  serviceTitle,
  serviceDescription,
}: AIServiceTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<ServiceTypeSuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customServiceType, setCustomServiceType] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const colors = useColors();

  // Get AI suggestion when service title changes
  useEffect(() => {
    if (serviceTitle && serviceTitle.trim().length > 2) {
      getAISuggestion();
    }
  }, [serviceTitle, serviceDescription]);

  // Load suggestions when modal opens or search query changes
  useEffect(() => {
    if (visible) {
      loadSuggestions();
    }
  }, [visible, searchQuery]);

  const getAISuggestion = async () => {
    if (!serviceTitle) return;
    
    setIsLoadingAI(true);
    try {
      const suggestion = await AIServiceTypeService.suggestServiceType(
        serviceTitle,
        serviceDescription
      );
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await AIServiceTypeService.getServiceTypeSuggestions(searchQuery);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleServiceTypeSelect = (serviceType: string) => {
    const validation = AIServiceTypeService.validateServiceType(serviceType);
    if (validation.isValid && validation.cleanedType) {
      onServiceTypeChange(validation.cleanedType);
      onClose();
    } else {
      setValidationError(validation.error || 'Invalid service type');
    }
  };

  const handleCustomServiceTypeSubmit = () => {
    const validation = AIServiceTypeService.validateServiceType(customServiceType);
    if (validation.isValid && validation.cleanedType) {
      onServiceTypeChange(validation.cleanedType);
      setCustomServiceType('');
      setShowCustomInput(false);
      setValidationError(null);
      onClose();
    } else {
      setValidationError(validation.error || 'Invalid service type');
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCustomServiceType('');
    setShowCustomInput(false);
    setValidationError(null);
    onClose();
  };

  const renderAISuggestion = () => {
    if (!aiSuggestion && !isLoadingAI) return null;

    return (
      <View style={styles.aiSuggestionContainer}>
        <View style={styles.aiSuggestionHeader}>
          <Sparkles size={16} color={colors.primary.main} />
          <Text style={[styles.aiSuggestionTitle, { color: colors.text.primary }]}>
            AI Suggestion
          </Text>
        </View>
        
        {isLoadingAI ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.main} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Analyzing service...
            </Text>
          </View>
        ) : aiSuggestion ? (
          <TouchableOpacity
            style={[
              styles.aiSuggestionItem,
              { 
                backgroundColor: colors.background.tertiary,
                borderColor: aiSuggestion.isExisting ? colors.status.success : colors.primary.main
              }
            ]}
            onPress={() => handleServiceTypeSelect(aiSuggestion.suggestedType)}
          >
            <View style={styles.suggestionContent}>
              <Text style={[styles.suggestionText, { color: colors.text.primary }]}>
                {aiSuggestion.suggestedType}
              </Text>
              <View style={styles.suggestionMeta}>
                <Text style={[styles.confidenceText, { color: colors.text.secondary }]}>
                  {Math.round(aiSuggestion.confidence * 100)}% confidence
                </Text>
                {aiSuggestion.isExisting && (
                  <View style={[styles.existingBadge, { backgroundColor: colors.status.success }]}>
                    <Text style={styles.existingBadgeText}>Existing</Text>
                  </View>
                )}
              </View>
            </View>
            <Check size={20} color={colors.primary.main} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderSuggestionItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        { backgroundColor: colors.background.tertiary },
        selectedServiceType === item && { borderColor: colors.primary.main, borderWidth: 2 }
      ]}
      onPress={() => handleServiceTypeSelect(item)}
    >
      <Text style={[styles.suggestionItemText, { color: colors.text.primary }]}>
        {item}
      </Text>
      {selectedServiceType === item && (
        <Check size={20} color={colors.primary.main} />
      )}
    </TouchableOpacity>
  );

  const renderCustomInput = () => {
    if (!showCustomInput) return null;

    return (
      <View style={styles.customInputContainer}>
        <Text style={[styles.customInputLabel, { color: colors.text.primary }]}>
          Create Custom Service Type
        </Text>
        <TextInput
          style={[
            styles.customInput,
            { 
              backgroundColor: colors.background.tertiary,
              borderColor: validationError ? colors.status.error : colors.border.main,
              color: colors.text.primary
            }
          ]}
          placeholder="Enter service type name..."
          placeholderTextColor={colors.text.secondary}
          value={customServiceType}
          onChangeText={(text) => {
            setCustomServiceType(text);
            setValidationError(null);
          }}
          maxLength={100}
          autoFocus
        />
        {validationError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color={colors.status.error} />
            <Text style={[styles.errorText, { color: colors.status.error }]}>
              {validationError}
            </Text>
          </View>
        )}
        <View style={styles.customInputButtons}>
          <TouchableOpacity
            style={[styles.customButton, styles.cancelButton, { borderColor: colors.border.main }]}
            onPress={() => {
              setShowCustomInput(false);
              setCustomServiceType('');
              setValidationError(null);
            }}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.customButton, styles.submitButton, { backgroundColor: colors.primary.main }]}
            onPress={handleCustomServiceTypeSubmit}
            disabled={!customServiceType.trim()}
          >
            <Text style={styles.submitButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <View style={[styles.header, { backgroundColor: colors.background.tertiary, borderBottomColor: colors.border.main }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.background.secondary }]}
            >
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Select Service Type
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Choose or create a category for your service
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          {renderAISuggestion()}

          <View style={[styles.searchContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.main }]}>
            <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search existing service types..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.secondary}
            />
          </View>

          {isLoadingSuggestions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                Loading suggestions...
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={suggestions}
                renderItem={renderSuggestionItem}
                keyExtractor={(item) => item}
                style={styles.suggestionsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                      {searchQuery ? 'No matching service types found' : 'No existing service types'}
                    </Text>
                  </View>
                }
              />

              {renderCustomInput()}

              {!showCustomInput && (
                <TouchableOpacity
                  style={[styles.createCustomButton, { borderColor: colors.primary.main }]}
                  onPress={() => setShowCustomInput(true)}
                >
                  <Text style={[styles.createCustomButtonText, { color: colors.primary.main }]}>
                    Create Custom Service Type
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  aiSuggestionContainer: {
    marginBottom: 20,
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSuggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
  },
  aiSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 12,
    marginRight: 8,
  },
  existingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  suggestionItemText: {
    flex: 1,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  createCustomButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    borderStyle: 'dashed',
  },
  createCustomButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 14,
  },
  customInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
