import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, CreditCard as Edit3, MapPin, X, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';
import { JobService } from '../lib/job-service';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

const locations = [
  'Kuala Lumpur',
  'Cheras', 
  'Ampang',
  'Desa Petaling',
  'Bangsar',
  'Jalan Ipoh',
  'Brickfields',
  'Jinjang',
  'Bukit Jalil',
  'Puchong',
];

interface LocationData {
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export default function CreateJobListingScreen() {
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 3.1478,
    longitude: 101.6953,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  // Budget/Payment state
  const [paymentType, setPaymentType] = useState<'fixed' | 'hourly' | 'daily' | 'negotiable'>('fixed');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [currency, setCurrency] = useState('RM');
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();

  const handleTitleChange = (text: string) => {
    if (text.length <= 25) {
      setTitle(text);
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      setDescription(text);
    }
  };

  const handleLocationSelect = (data: any, details: any) => {
    try {
      if (data && details?.geometry?.location) {
        const locationData: LocationData = {
          address: data.description || data.structured_formatting?.main_text || 'Unknown location',
          coordinate: {
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
          },
        };
        setSelectedLocation(locationData);
        setMapRegion({
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.warn('Error selecting location:', error);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    // For map press, we'll use reverse geocoding or just coordinates
    const locationData: LocationData = {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      coordinate: { latitude, longitude },
    };
    setSelectedLocation(locationData);
  };

  const handleUploadPhoto = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Show action sheet to choose between camera and gallery
      Alert.alert(
        'Select Photo',
        'Choose how you want to select a photo',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(),
          },
          {
            text: 'Gallery',
            onPress: () => openGallery(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleList = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a job listing');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please describe what you need done');
      return;
    }
    if (paymentType !== 'negotiable' && !budgetAmount.trim()) {
      Alert.alert('Required Field', 'Please specify your budget amount');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const jobData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        cover_photo: coverPhoto || undefined,
        payment_type: paymentType,
        budget_amount: paymentType !== 'negotiable' ? budgetAmount.trim() : undefined,
        currency,
        location_address: selectedLocation?.address,
        location_latitude: selectedLocation?.coordinate.latitude,
        location_longitude: selectedLocation?.coordinate.longitude,
        status: 'active' as const,
      };

      const createdJob = await JobService.createJob(jobData);
      
      if (createdJob) {
        Alert.alert('Success', 'Job listing created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create job listing. Please try again.');
      }
    } catch (error) {
      console.error('Error creating job:', error);
      Alert.alert('Error', 'Failed to create job listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBudgetDisplayText = () => {
    if (paymentType === 'negotiable') {
      return 'Negotiable';
    }
    if (!budgetAmount) {
      return `Enter amount in ${currency}`;
    }
    const rateText = paymentType === 'fixed' ? '' : `/${paymentType}`;
    return `${currency}${budgetAmount}${rateText}`;
  };

  const handleBudgetAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    const numericText = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericText.split('.');
    if (parts.length > 2) {
      return;
    }
    setBudgetAmount(numericText);
  };

  const getLocationDisplayText = () => {
    if (!selectedLocation) return 'Where should the work be done?';
    return selectedLocation.address;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Job Posting Details</Text>
          <Text style={styles.guidanceText}>Fill in the details below to find the right person for your job</Text>

          <View style={styles.fieldContainer}>
            <TouchableOpacity style={styles.photoUploadContainer} onPress={handleUploadPhoto}>
              {coverPhoto ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: coverPhoto }} style={styles.coverPhoto} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoLabel}>Cover photo</Text>
                    <View style={styles.photoActions}>
                      <TouchableOpacity style={styles.photoAction} onPress={handleUploadPhoto}>
                        <Upload size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoAction} onPress={handleUploadPhoto}>
                        <Edit3 size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={24} color={Colors.text.secondary} />
                  <Text style={styles.uploadText}>Upload job cover photo</Text>
                  <Text style={styles.uploadSubtext}>Max 10MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Job Title (Required)</Text>
              <Text style={styles.characterCount}>{title.length}/25</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Job title (e.g., Graphic Designer, Cleaner, Tutor)"
              placeholderTextColor={Colors.text.secondary}
              maxLength={25}
            />
            {coverPhoto && (
              <TouchableOpacity style={styles.editIcon}>
                <Edit3 size={16} color={Colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Job Description</Text>
              <Text style={styles.characterCount}>{description.length}/1000</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Describe what you need done, requirements, and expectations"
              placeholderTextColor={Colors.text.secondary}
              multiline={true}
              textAlignVertical="top"
              maxLength={1000}
            />
            {coverPhoto && (
              <TouchableOpacity style={styles.editIcon}>
                <Edit3 size={16} color={Colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Budget/Payment</Text>
            
            {/* Payment Type Toggles */}
            <View style={styles.paymentTypeContainer}>
              <TouchableOpacity
                style={[styles.paymentTypeButton, paymentType === 'fixed' && styles.paymentTypeButtonActive]}
                onPress={() => setPaymentType('fixed')}
              >
                <Text style={[styles.paymentTypeText, paymentType === 'fixed' && styles.paymentTypeTextActive]}>Fixed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentTypeButton, paymentType === 'hourly' && styles.paymentTypeButtonActive]}
                onPress={() => setPaymentType('hourly')}
              >
                <Text style={[styles.paymentTypeText, paymentType === 'hourly' && styles.paymentTypeTextActive]}>Hourly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentTypeButton, paymentType === 'daily' && styles.paymentTypeButtonActive]}
                onPress={() => setPaymentType('daily')}
              >
                <Text style={[styles.paymentTypeText, paymentType === 'daily' && styles.paymentTypeTextActive]}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentTypeButton, paymentType === 'negotiable' && styles.paymentTypeButtonActive]}
                onPress={() => setPaymentType('negotiable')}
              >
                <Text style={[styles.paymentTypeText, paymentType === 'negotiable' && styles.paymentTypeTextActive]}>Negotiable</Text>
              </TouchableOpacity>
            </View>

            {/* Budget Amount Input (hidden for negotiable) */}
            {paymentType !== 'negotiable' && (
              <View style={styles.budgetInputContainer}>
                <View style={styles.currencySelector}>
                  <TouchableOpacity
                    style={[styles.currencyButton, currency === 'RM' && styles.currencyButtonActive]}
                    onPress={() => setCurrency('RM')}
                  >
                    <Text style={[styles.currencyText, currency === 'RM' && styles.currencyTextActive]}>RM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
                    onPress={() => setCurrency('USD')}
                  >
                    <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>USD</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.budgetInput}
                  value={budgetAmount}
                  onChangeText={handleBudgetAmountChange}
                  placeholder={`Amount${paymentType === 'fixed' ? '' : ` per ${paymentType}`}`}
                  placeholderTextColor="#8E8E93"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Budget Summary */}
            <View style={styles.budgetSummary}>
              <Text style={styles.budgetSummaryLabel}>Budget Summary:</Text>
              <Text style={styles.budgetSummaryText}>{getBudgetDisplayText()}</Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Work Location</Text>
            <TouchableOpacity 
              style={styles.locationSelector}
              onPress={() => setShowLocationPicker(true)}
            >
              <MapPin size={20} color={Colors.text.secondary} style={styles.locationIcon} />
              <Text style={[
                styles.locationText,
                !selectedLocation && styles.placeholderText
              ]}>
                {getLocationDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.listButton} onPress={handleList}>
            <Text style={styles.listButtonText}>Post Job</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <X size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Work Location</Text>
            <TouchableOpacity 
              onPress={() => setShowLocationPicker(false)}
              disabled={!selectedLocation}
            >
              <Text style={[
                styles.doneButton,
                !selectedLocation && styles.doneButtonDisabled
              ]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
              <GooglePlacesAutocomplete
                placeholder="Search for a location..."
                onPress={handleLocationSelect}
                query={{
                   key: GOOGLE_PLACES_API_KEY,
                   language: 'en',
                   components: 'country:my', // Restrict to Malaysia
                 }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                predefinedPlaces={[]}
                predefinedPlacesAlwaysVisible={false}
                listViewDisplayed={true}
                minLength={2}
                debounce={200}
                textInputProps={{
                  onFocus: () => {},
                  onBlur: () => {},
                  autoCorrect: false,
                  autoCapitalize: 'none',
                  placeholder: "Search for a location...",
                  placeholderTextColor: Colors.text.secondary,
                }}
                styles={{
                  textInputContainer: styles.searchInputContainer,
                  textInput: styles.searchInput,
                  listView: styles.searchResults,
                  row: {
                    backgroundColor: Colors.background.tertiary,
                    padding: 13,
                    height: 44,
                    flexDirection: 'row',
                  },
                  separator: {
                    height: 0.5,
                    backgroundColor: Colors.border.light,
                  },
                  description: {
                    fontWeight: 'normal',
                    color: Colors.text.primary,
                    fontSize: 15,
                  },
                }}
              />
            </View>
          </View>

          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation.coordinate}
                title="Selected Location"
                description={selectedLocation.address}
              >
                <View style={styles.customMarker}>
                  <MapPin size={24} color={Colors.primary.main} />
                </View>
              </Marker>
            )}
          </MapView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  guidanceText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
    position: 'relative',
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
    color: Colors.text.primary,
  },
  characterCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  textInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editIcon: {
    position: 'absolute',
    right: 12,
    top: 40,
  },
  photoUploadContainer: {
    height: 150,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    left: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoAction: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSelector: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  locationText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.secondary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  locationOptions: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    maxHeight: 200,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: Colors.status.success,
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  listButton: {
    backgroundColor: Colors.text.secondary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  listButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Payment Type Styles
  paymentTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 4,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  paymentTypeButtonActive: {
    backgroundColor: Colors.background.tertiary,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  paymentTypeTextActive: {
    color: Colors.text.primary,
  },
  // Budget Input Styles
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  currencySelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: 6,
    padding: 2,
  },
  currencyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  currencyButtonActive: {
    backgroundColor: Colors.background.tertiary,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  currencyTextActive: {
    color: Colors.text.primary,
  },
  budgetInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  // Budget Summary Styles
  budgetSummary: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  budgetSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  budgetSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.main,
  },
  doneButtonDisabled: {
    color: Colors.text.secondary,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchInputContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.text.primary,
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: 12,
  },
  searchResults: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    maxHeight: 200,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    backgroundColor: Colors.background.tertiary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    shadowColor: Colors.shadow.medium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationIcon: {
    marginRight: 8,
  },
  searchWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
});