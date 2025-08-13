import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { X, Sparkles, RefreshCw, Check, Square, CheckSquare } from 'lucide-react-native';
import { AIService } from '@/lib/ai-service';

interface AIDescriptionModalProps {
  visible: boolean;
  onClose: () => void;
  serviceTitle: string;
  onSelectDescription: (description: string) => void;
}

export default function AIDescriptionModal({
  visible,
  onClose,
  serviceTitle,
  onSelectDescription,
}: AIDescriptionModalProps) {
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [keypoints, setKeypoints] = useState<string>('');
  const [keypointsList, setKeypointsList] = useState<string[]>([]);
  const [includeKeypoints, setIncludeKeypoints] = useState(true);

  const generateDescriptions = async () => {
    if (!serviceTitle.trim()) {
      Alert.alert('Error', 'Please enter a service title first');
      return;
    }

    setIsGenerating(true);
    setDescriptions([]);
    setSelectedIndex(null);

    try {
      const result = await AIService.generateDescriptionVariations(
        serviceTitle, 
        (includeKeypoints && keypointsList.length > 0) ? keypointsList : undefined, 
        3
      );
      
      if (result.success && result.descriptions) {
        setDescriptions(result.descriptions);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate descriptions');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate descriptions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDescription = (description: string, index: number) => {
    setSelectedIndex(index);
    onSelectDescription(description);
    onClose();
  };

  const handleRegenerateAll = () => {
    generateDescriptions();
  };

  const handleKeypointsChange = (text: string) => {
    setKeypoints(text);
    // Split by newlines and filter out empty lines
    const points = text.split('\n').map(point => point.trim()).filter(point => point.length > 0);
    setKeypointsList(points);
  };

  // Remove auto-generation on modal open

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Sparkles size={24} color="#007AFF" />
            <Text style={styles.headerTitle}>AI Description Generator</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceLabel}>Service Title:</Text>
            <Text style={styles.serviceTitle}>{serviceTitle}</Text>
          </View>

          <View style={styles.keypointsContainer}>
            <Text style={styles.keypointsLabel}>Key Points (Optional)</Text>
            <Text style={styles.keypointsHint}>
              Add specific details you want to highlight (one per line)
            </Text>
            <TextInput
              style={styles.keypointsInput}
              value={keypoints}
              onChangeText={handleKeypointsChange}
              placeholder="e.g.&#10;5+ years experience&#10;Available weekends&#10;Free consultation"
              placeholderTextColor="#8E8E93"
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
            {keypointsList.length > 0 && (
              <>
                <View style={styles.keypointsPreview}>
                  <Text style={styles.keypointsPreviewTitle}>Key points entered:</Text>
                  {keypointsList.map((point, index) => (
                    <Text key={index} style={styles.keypointsPreviewItem}>
                      • {point}
                    </Text>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setIncludeKeypoints(!includeKeypoints)}
                >
                  {includeKeypoints ? (
                    <CheckSquare size={20} color="#007AFF" />
                  ) : (
                    <Square size={20} color="#8E8E93" />
                  )}
                  <Text style={[
                    styles.checkboxLabel,
                    includeKeypoints && styles.checkboxLabelActive
                  ]}>
                    Include these key points in generated descriptions
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Generate Button */}
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={generateDescriptions}
            disabled={isGenerating}
          >
            <Sparkles size={20} color="white" />
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : 'Generate Descriptions'}
            </Text>
          </TouchableOpacity>

          {isGenerating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Generating descriptions...</Text>
            </View>
          )}

          {descriptions.length > 0 && !isGenerating && (
            <>
              <View style={styles.descriptionsHeader}>
                <Text style={styles.descriptionsTitle}>Generated Descriptions</Text>
                <TouchableOpacity 
                  onPress={handleRegenerateAll}
                  style={styles.regenerateButton}
                >
                  <RefreshCw size={16} color="#007AFF" />
                  <Text style={styles.regenerateText}>Regenerate</Text>
                </TouchableOpacity>
              </View>

              {descriptions.map((description, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.descriptionCard,
                    selectedIndex === index && styles.descriptionCardSelected
                  ]}
                  onPress={() => handleSelectDescription(description, index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.descriptionHeader}>
                    <Text style={styles.descriptionNumber}>Option {index + 1}</Text>
                    {selectedIndex === index && (
                      <View style={styles.selectedBadge}>
                        <Check size={16} color="white" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.descriptionText}>{description}</Text>
                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>
                      {selectedIndex === index ? 'Selected' : 'Use This Description'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {descriptions.length === 0 && !isGenerating && (
            <View style={styles.emptyState}>
              <Sparkles size={48} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>Ready to Generate</Text>
              <Text style={styles.emptyStateText}>
                Add key points (optional) and click "Generate Descriptions" to create professional descriptions for your service
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by AI • Review and edit as needed
          </Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  serviceInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  descriptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF10',
    borderRadius: 8,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  descriptionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  descriptionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF05',
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1D1D1F',
    marginBottom: 12,
  },
  selectButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // Keypoints styles
  keypointsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  keypointsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  keypointsHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
  },
  keypointsInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  keypointsPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  keypointsPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 6,
  },
  keypointsPreviewItem: {
    fontSize: 13,
    color: '#1D1D1F',
    marginBottom: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
  },
  checkboxLabelActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});