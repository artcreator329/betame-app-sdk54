import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Sparkles, TrendingUp, DollarSign } from 'lucide-react-native';
import { AIService } from '@/lib/ai-service';

interface AIPricingSuggestionsProps {
  serviceTitle: string;
  serviceDescription: string;
  priceUnit: string;
  industry?: string;
  onPriceSelect: (price: number) => void;
  currentPrice?: number;
}

interface PricingSuggestion {
  low: number;
  medium: number;
  high: number;
  reasoning: string;
}

export default function AIPricingSuggestions({
  serviceTitle,
  serviceDescription,
  priceUnit,
  industry,
  onPriceSelect,
  currentPrice,
}: AIPricingSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<PricingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const getPriceUnitLabel = (unit: string): string => {
    const unitLabels: { [key: string]: string } = {
      'per_hour': 'per hour',
      'per_day': 'per day',
      'per_week': 'per week',
      'per_month': 'per month',
      'per_year': 'per year',
      'per_item': 'per item',
      'per_project': 'per project',
      'per_session': 'per session',
      'one_time': '',
    };
    return unitLabels[unit] || '';
  };

  const generateSuggestions = async () => {
    if (!serviceTitle.trim() || !serviceDescription.trim()) {
      Alert.alert('AI Pricing', 'Please enter service title and description first');
      return;
    }

    console.log('Generating pricing suggestions with params:', {
      serviceTitle,
      serviceDescription: serviceDescription.substring(0, 50) + '...',
      priceUnit,
      industry
    });

    setIsLoading(true);
    try {
      const result = await AIService.generatePricingSuggestions(
        serviceTitle,
        serviceDescription,
        priceUnit,
        industry
      );

      console.log('Pricing suggestions result:', result);

      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        setIsVisible(true);
      } else {
        console.error('Pricing suggestions failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to generate pricing suggestions');
      }
    } catch (error) {
      console.error('Pricing suggestions error:', error);
      Alert.alert('Error', 'Failed to generate pricing suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceSelect = (price: number, level: string) => {
    onPriceSelect(price);
    setIsVisible(false);
    // Optional: Show confirmation
    // Alert.alert('Price Selected', `${level} price of RM ${price.toFixed(2)} selected`);
  };

  const getPriceLevelColor = (level: 'low' | 'medium' | 'high') => {
    const colors = {
      low: '#28a745',
      medium: '#007AFF', 
      high: '#6f42c1'
    };
    return colors[level];
  };

  const getPriceLevelLabel = (level: 'low' | 'medium' | 'high') => {
    const labels = {
      low: 'Budget-Friendly',
      medium: 'Market Average',
      high: 'Premium'
    };
    return labels[level];
  };

  if (!serviceTitle.trim() || !serviceDescription.trim()) {
    return (
      <View style={styles.disabledContainer}>
        <Text style={styles.disabledText}>
          Enter service title and description to get AI pricing suggestions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isVisible && !isLoading && (
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generateSuggestions}
        >
          <Sparkles size={16} color="#007AFF" />
          <Text style={styles.generateButtonText}>Get AI Price Suggestions</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Analyzing market rates...</Text>
        </View>
      )}

      {isVisible && suggestions && (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <View style={styles.headerLeft}>
              <TrendingUp size={16} color="#007AFF" />
              <Text style={styles.suggestionsTitle}>AI Price Suggestions</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.reasoning}>{suggestions.reasoning}</Text>

          <View style={styles.priceOptions}>
            {(['low', 'medium', 'high'] as const).map((level) => {
              const price = suggestions[level];
              const isSelected = currentPrice === price;
              
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.priceOption,
                    isSelected && styles.priceOptionSelected,
                    { borderColor: getPriceLevelColor(level) }
                  ]}
                  onPress={() => handlePriceSelect(price, getPriceLevelLabel(level))}
                >
                  <View style={styles.priceOptionHeader}>
                    <Text style={[
                      styles.priceLevel,
                      { color: getPriceLevelColor(level) }
                    ]}>
                      {getPriceLevelLabel(level)}
                    </Text>
                    {isSelected && (
                      <View style={[
                        styles.selectedBadge,
                        { backgroundColor: getPriceLevelColor(level) }
                      ]}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.priceValue}>
                    RM {price.toFixed(2)}
                  </Text>
                  <Text style={styles.priceUnit}>
                    {getPriceUnitLabel(priceUnit)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity 
            style={styles.regenerateButton}
            onPress={generateSuggestions}
          >
            <Sparkles size={14} color="#8E8E93" />
            <Text style={styles.regenerateButtonText}>Regenerate Suggestions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  disabledContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  disabledText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 6,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '500',
  },
  reasoning: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
    marginBottom: 18,
    fontStyle: 'italic',
    textAlign: 'left',
  },
  priceOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  priceOption: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  priceOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  priceOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    minHeight: 20,
  },
  priceLevel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'left',
    flex: 1,
    lineHeight: 14,
  },
  selectedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
  },
  priceUnit: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 2,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  regenerateButtonText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
});