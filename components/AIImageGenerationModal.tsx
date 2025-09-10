import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Sparkles, Download, RefreshCw, Check, Coins } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { GeminiImageService, GeminiImageGenerationOptions } from '@/lib/gemini-image-service';
import { AIPaymentService } from '@/lib/ai-payment-service';
import { useAuth } from '@/contexts/AuthContext';

interface AIImageGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string) => void;
  serviceTitle: string;
  serviceDescription: string;
  serviceCategory?: string;
}

export default function AIImageGenerationModal({
  visible,
  onClose,
  onImageGenerated,
  serviceTitle,
  serviceDescription,
  serviceCategory,
}: AIImageGenerationModalProps) {
  const { user } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<'professional' | 'creative' | 'minimalist' | 'vibrant'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  const [betaCoinBalance, setBetaCoinBalance] = useState<number>(0);
  const [hasEnoughBetaCoins, setHasEnoughBetaCoins] = useState<boolean>(false);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  const styles = getStyles();

  // Check BetaCoin balance when modal opens
  useEffect(() => {
    if (visible && user?.id) {
      checkBetaCoinBalance();
    }
  }, [visible, user?.id]);

  const checkBetaCoinBalance = async () => {
    if (!user?.id) return;

    setLoadingBalance(true);
    try {
      const balanceCheck = await AIPaymentService.checkBalance(user.id);
      setBetaCoinBalance(balanceCheck.currentBalance);
      setHasEnoughBetaCoins(balanceCheck.hasEnough);
    } catch (error) {
      console.error('Error checking BetaCoin balance:', error);
      setBetaCoinBalance(0);
      setHasEnoughBetaCoins(false);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!serviceTitle.trim() || !serviceDescription.trim()) {
      Alert.alert('Error', 'Service title and description are required to generate an image.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to generate AI images.');
      return;
    }

    // Check BetaCoin balance before proceeding
    if (!hasEnoughBetaCoins) {
      Alert.alert(
        'Insufficient BetaCoins',
        `You need ${AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin to generate an AI image. You currently have ${betaCoinBalance} BetaCoins.\n\nPlease purchase more BetaCoins to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy BetaCoins', onPress: () => {
            onClose();
            // Navigation to wallet/purchase screen would go here
          }}
        ]
      );
      return;
    }

    // Show payment confirmation
    Alert.alert(
      'Generate AI Image',
      `This will cost ${AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin. Your current balance is ${betaCoinBalance} BetaCoins.\n\nProceed with image generation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate Image', onPress: () => processPaymentAndGenerate() }
      ]
    );
  };

  const processPaymentAndGenerate = async () => {
    if (!user?.id) return;

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setGeneratedImageData(null);

    try {
      // Process BetaCoin payment first
      const paymentResult = await AIPaymentService.processAIImagePayment(
        user.id,
        serviceTitle,
        serviceDescription
      );

      if (!paymentResult.success) {
        Alert.alert('Payment Error', paymentResult.error || 'Failed to process payment');
        setIsGenerating(false);
        return;
      }

      // Update local balance after successful payment
      setBetaCoinBalance(prev => prev - AIPaymentService.AI_IMAGE_GENERATION_COST);
      setHasEnoughBetaCoins(betaCoinBalance - AIPaymentService.AI_IMAGE_GENERATION_COST >= AIPaymentService.AI_IMAGE_GENERATION_COST);

      // Now proceed with image generation
      const options: GeminiImageGenerationOptions = {
        serviceTitle: serviceTitle.trim(),
        serviceDescription: serviceDescription.trim(),
        serviceCategory,
        style: selectedStyle,
      };

      const result = await GeminiImageService.generateServiceImage(options);

      if (result.success && result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
        setGeneratedImageData(result.imageData || null);
      } else {
        // If image generation fails after payment, refund the BetaCoin
        console.log('🔄 Image generation failed, processing refund...');
        
        const refundResult = await AIPaymentService.refundAIImagePayment(
          user.id,
          serviceTitle,
          serviceDescription
        );

        if (refundResult.success) {
          // Update local balance after successful refund
          setBetaCoinBalance(prev => prev + AIPaymentService.AI_IMAGE_GENERATION_COST);
          setHasEnoughBetaCoins(true);
          
          Alert.alert(
            'Generation Failed - Refunded',
            `Image generation failed: ${result.error || 'Unknown error'}\n\nYour ${AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin has been refunded to your wallet.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Generation Failed - Refund Issue',
            `Image generation failed: ${result.error || 'Unknown error'}\n\nRefund failed: ${refundResult.error}. Please contact support.`,
            [{ text: 'OK' }]
          );
        }
      }

    } catch (error) {
      console.error('Error in payment and generation process:', error);
      
      // If we get here, payment was successful but something else failed
      // Attempt to refund the BetaCoin
      console.log('🔄 Unexpected error occurred, attempting refund...');
      
      try {
        const refundResult = await AIPaymentService.refundAIImagePayment(
          user.id,
          serviceTitle,
          serviceDescription
        );

        if (refundResult.success) {
          // Update local balance after successful refund
          setBetaCoinBalance(prev => prev + AIPaymentService.AI_IMAGE_GENERATION_COST);
          setHasEnoughBetaCoins(true);
          
          Alert.alert(
            'Error - Refunded',
            `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nYour ${AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin has been refunded to your wallet.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error - Refund Issue',
            `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nRefund failed: ${refundResult.error}. Please contact support.`,
            [{ text: 'OK' }]
          );
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        Alert.alert(
          'Error - Refund Failed',
          `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nRefund processing also failed. Please contact support.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseImage = () => {
    if (generatedImageUrl) {
      onImageGenerated(generatedImageUrl);
      onClose();
    }
  };

  const handleRegenerate = () => {
    setGeneratedImageUrl(null);
    setGeneratedImageData(null);
    handleGenerateImage();
  };

  const availableStyles = GeminiImageService.getAvailableStyles();


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
            <Sparkles size={24} color={Colors.primary.main} />
            <Text style={styles.headerTitle}>AI Image Generation</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.balanceContainer}>
              <Coins size={16} color={Colors.primary.main} />
              <Text style={styles.balanceText}>
                {loadingBalance ? '...' : betaCoinBalance}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Service Info */}
          <View style={styles.serviceInfoSection}>
            <Text style={styles.sectionTitle}>Service Information</Text>
            <View style={styles.serviceInfoCard}>
              <Text style={styles.serviceTitle}>{serviceTitle}</Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {serviceDescription}
              </Text>
              {serviceCategory && (
                <Text style={styles.serviceCategory}>Category: {serviceCategory}</Text>
              )}
            </View>
          </View>

          {/* Style Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Style</Text>
            <View style={styles.optionsGrid}>
              {availableStyles.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  style={[
                    styles.optionCard,
                    selectedStyle === style.value && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedStyle(style.value as any)}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionTitle,
                        selectedStyle === style.value && styles.optionTitleSelected,
                      ]}>
                        {style.label}
                      </Text>
                      <Text style={[
                        styles.optionDescription,
                        selectedStyle === style.value && styles.optionDescriptionSelected,
                      ]}>
                        {style.description}
                      </Text>
                    </View>
                    {selectedStyle === style.value && (
                      <View style={styles.checkmarkContainer}>
                        <Check size={20} color={Colors.primary.main} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* Generated Image Preview */}
          {generatedImageUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Generated Image</Text>
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: generatedImageUrl }}
                  style={styles.generatedImage}
                  resizeMode="cover"
                />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw size={16} color={Colors.primary.main} />
                    <Text style={styles.regenerateButtonText}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Insufficient Balance Warning */}
          {!hasEnoughBetaCoins && !loadingBalance && (
            <View style={styles.warningContainer}>
              <Coins size={20} color={Colors.status.warning} />
              <Text style={styles.warningText}>
                Insufficient BetaCoins! You need {AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin but have {betaCoinBalance} BetaCoins.
              </Text>
            </View>
          )}

          {/* Generation Status */}
          {isGenerating && (
            <View style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={Colors.primary.main} />
              <Text style={styles.generatingText}>
                Processing payment and generating your AI image...
              </Text>
              <Text style={styles.generatingSubtext}>
                This may take a few moments
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (isGenerating || !hasEnoughBetaCoins) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateImage}
            disabled={isGenerating || !hasEnoughBetaCoins}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Sparkles size={20} color="#FFFFFF" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : `Generate Image (${AIPaymentService.AI_IMAGE_GENERATION_COST} BetaCoin)`}
            </Text>
          </TouchableOpacity>
          
          {generatedImageUrl && (
            <TouchableOpacity
              style={styles.useImageButton}
              onPress={handleUseImage}
            >
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.useImageButtonText}>Use This Image</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
      paddingTop: 50, // Add top padding to avoid status bar
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.light,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: Colors.primary.main + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    balanceText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.primary.main,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: Colors.text.primary,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: Colors.text.primary,
      marginBottom: 12,
    },
    serviceInfoSection: {
      marginTop: 8,
    },
    serviceInfoCard: {
      backgroundColor: Colors.background.secondary,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border.light,
    },
    serviceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.text.primary,
      marginBottom: 8,
    },
    serviceDescription: {
      fontSize: 14,
      color: Colors.text.secondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    serviceCategory: {
      fontSize: 12,
      color: Colors.primary.main,
      fontWeight: '500',
    },
    optionsGrid: {
      gap: 8,
    },
    optionCard: {
      backgroundColor: Colors.background.secondary,
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors.border.light,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionTextContainer: {
      flex: 1,
    },
    checkmarkContainer: {
      marginLeft: 12,
    },
    optionCardSelected: {
      borderColor: Colors.primary.main,
      backgroundColor: Colors.primary.main + '10',
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.text.primary,
      marginBottom: 4,
    },
    optionTitleSelected: {
      color: Colors.primary.main,
    },
    optionDescription: {
      fontSize: 14,
      color: Colors.text.secondary,
      lineHeight: 18,
    },
    optionDescriptionSelected: {
      color: Colors.primary.main + 'CC',
    },
    imagePreviewContainer: {
      backgroundColor: Colors.background.secondary,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: Colors.border.light,
    },
    generatedImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 12,
    },
    imageActions: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    regenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: Colors.primary.main + '20',
      borderRadius: 8,
    },
    regenerateButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: Colors.primary.main,
    },
    generatingContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    generatingText: {
      fontSize: 16,
      fontWeight: '500',
      color: Colors.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    generatingSubtext: {
      fontSize: 14,
      color: Colors.text.secondary,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: Colors.status.warning + '20',
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: Colors.status.warning,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40, // Increased bottom padding for safe area
      borderTopWidth: 1,
      borderTopColor: Colors.border.light,
      backgroundColor: Colors.background.primary,
      gap: 8,
    },
    generateButton: {
      backgroundColor: Colors.primary.main,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    generateButtonDisabled: {
      backgroundColor: Colors.primary.main + '60',
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    useImageButton: {
      backgroundColor: Colors.status.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    useImageButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
