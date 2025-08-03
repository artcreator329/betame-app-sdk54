import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, Camera, ImageIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceService } from '@/lib/service-service';
import { ImageService } from '@/lib/image-service';

export default function CreateServiceListingScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'starting'>('starting');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const formatPrice = (value: string): string => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return numericValue;
  };

  const handlePriceChange = (text: string) => {
    const formattedPrice = formatPrice(text);
    setPrice(formattedPrice);
  };

  const getDisplayPrice = (): string => {
    if (!price) return '';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return price;
    return numPrice.toFixed(2);
  };

  const handleTitleChange = (text: string) => {
    if (text.length <= 100) {
      setTitle(text);
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      setDescription(text);
    }
  };

  const handlePhotoUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    if (!user) return;
    
    setIsUploading(true);
    try {
      const result = await ImageService.takePhoto();
      if (result && !result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const uploadResult = await ImageService.uploadImage(
            asset.uri,
            asset.base64,
            user.id,
            'service-images'
          );
          
          if (uploadResult.success && uploadResult.url) {
            setImageUri(uploadResult.url);
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload image');
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    if (!user) return;
    
    setIsUploading(true);
    try {
      const result = await ImageService.pickImage();
      if (result && !result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const uploadResult = await ImageService.uploadImage(
            asset.uri,
            asset.base64,
            user.id,
            'service-images'
          );
          
          if (uploadResult.success && uploadResult.url) {
            setImageUri(uploadResult.url);
          } else {
            Alert.alert('Error', uploadResult.error || 'Failed to upload image');
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleList = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a service');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a service title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a service description');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Error', 'Please enter a price');
      return;
    }
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid price amount');
      return;
    }
    
    if (numPrice > 999999.99) {
      Alert.alert('Error', 'Price cannot exceed RM 999,999.99');
      return;
    }

    setIsCreating(true);
    try {
      const serviceData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        currency: 'RM',
        image_url: imageUri || undefined,
        category_name: 'General', // Default category, can be enhanced later
        rating: 0,
        review_count: 0,
      };

      const createdService = await ServiceService.createService(serviceData);
      
      if (createdService) {
        Alert.alert('Success', 'Service listing created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create service listing. Please try again.');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Error', 'Failed to create service listing. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Service Details</Text>

          {/* Cover Photo */}
          <View style={styles.fieldContainer}>
            <TouchableOpacity 
              style={styles.photoUploadContainer} 
              onPress={handlePhotoUpload}
              disabled={isUploading}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  {isUploading ? (
                    <Text style={styles.uploadText}>Uploading...</Text>
                  ) : (
                    <>
                      <Upload size={24} color="#8E8E93" />
                      <Text style={styles.uploadText}>Upload your service cover photo</Text>
                      <Text style={styles.uploadSubtext}>Max. 10MB</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Title (Required)</Text>
              <Text style={styles.characterCount}>{title.length}/100</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Add a title to describe your service"
              placeholderTextColor="#8E8E93"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.characterCount}>{description.length}/1000</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Simple brief about your service"
              placeholderTextColor="#8E8E93"
              multiline={true}
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Price</Text>
            
            {/* Price Type Selection */}
            <View style={styles.priceTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  priceType === 'starting' && styles.priceTypeButtonActive
                ]}
                onPress={() => setPriceType('starting')}
              >
                <Text style={[
                  styles.priceTypeText,
                  priceType === 'starting' && styles.priceTypeTextActive
                ]}>Starting from</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  priceType === 'fixed' && styles.priceTypeButtonActive
                ]}
                onPress={() => setPriceType('fixed')}
              >
                <Text style={[
                  styles.priceTypeText,
                  priceType === 'fixed' && styles.priceTypeTextActive
                ]}>Fixed price</Text>
              </TouchableOpacity>
            </View>
            
            {/* Price Input */}
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencyPrefix}>RM</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={handlePriceChange}
                placeholder="0.00"
                placeholderTextColor="#8E8E93"
                keyboardType="decimal-pad"
              />
            </View>
            
            {/* Price Display */}
            {price && (
              <View style={styles.priceDisplayContainer}>
                <Text style={styles.priceDisplayText}>
                  {priceType === 'starting' ? 'Starting from ' : ''}
                  <Text style={styles.priceDisplayAmount}>RM {getDisplayPrice()}</Text>
                </Text>
              </View>
            )}
            
            {/* Price Helper Text */}
            <Text style={styles.priceHelperText}>
              {priceType === 'starting' 
                ? 'Set your base price. You can create different pricing tiers later.'
                : 'Set a fixed price for your service.'}
            </Text>
          </View>

          {/* List Button */}
          <TouchableOpacity 
            style={[
              styles.listButton, 
              (title.trim() && description.trim() && price.trim() && !isCreating) 
                ? styles.listButtonActive 
                : styles.listButtonDisabled
            ]} 
            onPress={handleList}
            disabled={isCreating || !title.trim() || !description.trim() || !price.trim()}
          >
            <Text style={[
              styles.listButtonText,
              (title.trim() && description.trim() && price.trim() && !isCreating) 
                ? styles.listButtonTextActive 
                : {}
            ]}>
              {isCreating ? 'Creating...' : 'List'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  characterCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  photoUploadContainer: {
    height: 150,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: '#1D1D1F',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  listButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  listButtonActive: {
    backgroundColor: '#007AFF',
  },
  listButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  listButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listButtonTextActive: {
    color: 'white',
  },
  priceTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  priceTypeTextActive: {
    color: '#1D1D1F',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
    padding: 0,
  },
  priceDisplayContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 6,
  },
  priceDisplayText: {
    fontSize: 14,
    color: '#2D7D32',
  },
  priceDisplayAmount: {
    fontWeight: '600',
  },
  priceHelperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 16,
  },
});