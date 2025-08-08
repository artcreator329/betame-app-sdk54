import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import CalendarPicker from './CalendarPicker';
import TimePicker from './TimePicker';
import { X, DollarSign, Clock, FileText, Calendar, MapPin, Briefcase, ChevronDown, Zap, Target, Star, AlertCircle, Search } from 'lucide-react-native';
import { Service } from '../lib/service-service';
import { GOOGLE_PLACES_API_KEY } from '../config/maps';
import Colors from '../constants/Colors';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Conditional import for MapView to handle native module availability
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const MapsModule = require('react-native-maps');
  MapView = MapsModule.default || MapsModule.MapView;
  Marker = MapsModule.Marker;
  PROVIDER_GOOGLE = MapsModule.PROVIDER_GOOGLE;
} catch (error) {
  console.warn('react-native-maps not available:', error);
  // Fallback components
  MapView = ({ children, style, ...props }: any) => (
    <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]} {...props}>
      <Text>Map not available</Text>
      {children}
    </View>
  );
  Marker = ({ children }: any) => <View>{children}</View>;
  PROVIDER_GOOGLE = 'google';
}

interface ServiceOfferModalProps {
  visible: boolean;
  onClose: () => void;
  service: Service | null;
  onSendOffer: (offerData: {
    serviceId: string;
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
    startDate?: string;
    endDate?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    locationAddress?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: 'remote' | 'on_site' | 'hybrid';
    estimatedHours?: number;
    requirements?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  isEditing?: boolean;
  editingOfferId?: string;
  existingOfferData?: {
    customPrice?: number;
    customDescription?: string;
    customDeliveryTime?: number;
    startDate?: string;
    endDate?: string;
    preferredStartTime?: string;
    preferredEndTime?: string;
    locationAddress?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: 'remote' | 'on_site' | 'hybrid';
    estimatedHours?: number;
    requirements?: string;
  };
}

export function ServiceOfferModal({
  visible,
  onClose,
  service,
  onSendOffer,
  isLoading = false,
  isEditing = false,
  editingOfferId,
  existingOfferData,
}: ServiceOfferModalProps) {
  // All useState hooks must be declared before any conditional returns
  const [customPrice, setCustomPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDeliveryTime, setCustomDeliveryTime] = useState('');
  
  // Hustle job attributes
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [preferredStartTime, setPreferredStartTime] = useState<Date | undefined>(undefined);
  const [preferredEndTime, setPreferredEndTime] = useState<Date | undefined>(undefined);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [isLocationButtonPressed, setIsLocationButtonPressed] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 3.139, // Kuala Lumpur center
    longitude: 101.6869,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [workType, setWorkType] = useState<'remote' | 'on_site' | 'hybrid'>('remote');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [requirements, setRequirements] = useState('');

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditing && existingOfferData) {
      setCustomPrice(existingOfferData.customPrice?.toString() || '');
      setCustomDescription(existingOfferData.customDescription || '');
      setCustomDeliveryTime(existingOfferData.customDeliveryTime?.toString() || '');
      
      if (existingOfferData.startDate) {
        setStartDate(new Date(existingOfferData.startDate));
      }
      if (existingOfferData.endDate) {
        setEndDate(new Date(existingOfferData.endDate));
      }
      if (existingOfferData.preferredStartTime) {
        setPreferredStartTime(new Date(`2000-01-01T${existingOfferData.preferredStartTime}`));
      }
      if (existingOfferData.preferredEndTime) {
        setPreferredEndTime(new Date(`2000-01-01T${existingOfferData.preferredEndTime}`));
      }
      
      setLocationAddress(existingOfferData.locationAddress || '');
      setUrgencyLevel(existingOfferData.urgencyLevel || 'medium');
      setWorkType(existingOfferData.workType || 'remote');
      setEstimatedHours(existingOfferData.estimatedHours?.toString() || '');
      setRequirements(existingOfferData.requirements || '');
    }
  }, [isEditing, existingOfferData, visible]);

  // Enhanced null safety checks - moved after hooks to comply with Rules of Hooks
  if (!service || !visible) return null;
  
  // Additional safety checks for service properties
  const safeService = {
    id: service.id || '',
    title: service.title || 'Untitled Service',
    price: service.price || 0,
    currency: service.currency || 'USD',
    image_url: service.image_url || '',
    description: service.description || '',
    service_variants: service.service_variants || []
  };

  const handleSendOffer = () => {
    if (!service) return;

    const price = customPrice ? parseFloat(customPrice) : undefined;
    const deliveryTime = customDeliveryTime ? parseInt(customDeliveryTime) : undefined;

    if (customPrice && (isNaN(price!) || price! <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    if (customDeliveryTime && (isNaN(deliveryTime!) || deliveryTime! <= 0)) {
      Alert.alert('Invalid Delivery Time', 'Please enter a valid delivery time in days.');
      return;
    }

    if (!safeService.id) {
      Alert.alert('Error', 'Invalid service selected.');
      return;
    }

    const hours = estimatedHours ? parseFloat(estimatedHours) : undefined;

    onSendOffer({
      serviceId: safeService.id,
      customPrice: price,
      customDescription: customDescription.trim() || undefined,
      customDeliveryTime: deliveryTime,
      startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
      endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
      preferredStartTime: preferredStartTime ? preferredStartTime.toTimeString().slice(0, 5) : undefined,
      preferredEndTime: preferredEndTime ? preferredEndTime.toTimeString().slice(0, 5) : undefined,
      locationAddress: locationAddress.trim() || undefined,
      urgencyLevel,
      workType,
      estimatedHours: hours,
      requirements: requirements.trim() || undefined,
    });

    // Reset form
    setCustomPrice('');
    setCustomDescription('');
    setCustomDeliveryTime('');
    setStartDate(undefined);
    setEndDate(undefined);
    setPreferredStartTime(undefined);
    setPreferredEndTime(undefined);
    setLocationAddress('');
    setSelectedLocation(null);
    setUrgencyLevel('medium');
    setWorkType('remote');
    setEstimatedHours('');
    setRequirements('');
  };

  const handleClose = () => {
    setCustomPrice('');
    setCustomDescription('');
    setCustomDeliveryTime('');
    setStartDate(undefined);
    setEndDate(undefined);
    setPreferredStartTime(undefined);
    setPreferredEndTime(undefined);
    setLocationAddress('');
    setSelectedLocation(null);
    setUrgencyLevel('medium');
    setWorkType('remote');
    setEstimatedHours('');
    setRequirements('');
    onClose();
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      {showMapModal ? (
        // Map View
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={styles.mapModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Select Work Location</Text>
            <TouchableOpacity 
              onPress={() => {
                if (selectedLocation) {
                  setLocationAddress(selectedLocation.address);
                  setShowMapModal(false);
                }
              }}
              disabled={!selectedLocation}
            >
              <Text style={[
                styles.mapModalDoneText,
                !selectedLocation && styles.mapModalDoneTextDisabled
              ]}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
              <GooglePlacesAutocomplete
                placeholder="Search for a location..."
                onPress={(data: any, details: any) => {
                  try {
                    
                    if (data && details?.geometry?.location) {
                      const locationData = {
                        latitude: details.geometry.location.lat,
                        longitude: details.geometry.location.lng,
                        address: data.description || data.structured_formatting?.main_text || 'Unknown location',
                      };
                      setSelectedLocation(locationData);
                      setMapRegion({
                        latitude: details.geometry.location.lat,
                        longitude: details.geometry.location.lng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      });
                    } else {
                      console.warn('ServiceOfferModal - Invalid location data received');
                    }
                  } catch (error) {
                    console.error('ServiceOfferModal - Error selecting location:', error);
                  }
                }}
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
                onFail={(error: any) => {
                  console.error('ServiceOfferModal - GooglePlacesAutocomplete error:', error);
                }}
                onNotFound={() => {
                  console.warn('ServiceOfferModal - GooglePlacesAutocomplete: No results found');
                }}
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
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              onPress={(event: any) => {
                try {
                  const coordinate = event.nativeEvent.coordinate;
                  
                  const locationData = {
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
                  };
                  setSelectedLocation(locationData);
                  setMapRegion({
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  });
                } catch (error) {
                  console.error('ServiceOfferModal - Error in map press:', error);
                }
              }}
            >
              {selectedLocation && (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title="Selected Location"
                  description={selectedLocation.address}
                />
              )}
            </MapView>
          </View>
        </SafeAreaView>
      ) : (
        // Normal Service Offer View
        <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Service Offer' : 'Customize Service Offer'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Service Preview */}
          <View style={styles.servicePreview}>
            {safeService.image_url && (
              <Image source={{ uri: safeService.image_url }} style={styles.serviceImage} />
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{safeService.title}</Text>
              <Text style={styles.originalPrice}>
                Original Price: ${safeService.price} {safeService.currency}
              </Text>
            </View>
          </View>

          {/* Custom Price */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <DollarSign size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Price (Optional)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={`Original: $${safeService.price} ${safeService.currency}`}
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Custom Delivery Time */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Delivery Time (Days)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Enter delivery time in days"
              value={customDeliveryTime}
              onChangeText={setCustomDeliveryTime}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Custom Description */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <FileText size={20} color="#007AFF" />
              <Text style={styles.inputLabel}>Custom Description (Optional)</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add any custom details or modifications for this offer..."
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Hustle Job Attributes Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Star size={24} color="#FF6B35" />
              <Text style={styles.sectionTitle}>Customize Your Offer</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Make your proposal stand out to win this job</Text>
          </View>

          {/* Project Timeline Card */}
          <View style={styles.timelineCard}>
            <View style={styles.cardHeader}>
              <Calendar size={22} color="#4CAF50" />
              <Text style={styles.cardTitle}>Project Timeline</Text>
            </View>
            
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                    {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                  </Text>
                  <Calendar size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                    {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                  </Text>
                  <Calendar size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Calendar Picker */}
            <CalendarPicker
              visible={showStartDatePicker || showEndDatePicker}
              onClose={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }}
              onDateSelect={(selectedStartDate, selectedEndDate) => {
                if (showStartDatePicker) {
                  setStartDate(selectedStartDate);
                  setShowStartDatePicker(false);
                } else if (showEndDatePicker) {
                  setEndDate(selectedStartDate);
                  setShowEndDatePicker(false);
                }
              }}
              allowRange={false}
              minDate={new Date()}
            />
          </View>

          {/* Preferred Working Hours Card */}
          <View style={styles.workingHoursCard}>
            <View style={styles.cardHeader}>
              <Clock size={22} color="#2196F3" />
              <Text style={styles.cardTitle}>Preferred Working Hours</Text>
            </View>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={[styles.timeText, !preferredStartTime && styles.placeholderText]}>
                    {preferredStartTime ? preferredStartTime.toTimeString().slice(0, 5) : 'Select start time'}
                  </Text>
                  <Clock size={18} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <View style={styles.timeSeparator}>
                <Text style={styles.timeSeparatorText}>to</Text>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={[styles.timeText, !preferredEndTime && styles.placeholderText]}>
                    {preferredEndTime ? preferredEndTime.toTimeString().slice(0, 5) : 'Select end time'}
                  </Text>
                  <Clock size={18} color="#2196F3" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Pickers */}
            <TimePicker
              visible={showStartTimePicker}
              onClose={() => setShowStartTimePicker(false)}
              onTimeSelect={(time) => {
                setPreferredStartTime(time);
                setShowStartTimePicker(false);
              }}
              initialTime={preferredStartTime || new Date()}
            />
            <TimePicker
              visible={showEndTimePicker}
              onClose={() => setShowEndTimePicker(false)}
              onTimeSelect={(time) => {
                setPreferredEndTime(time);
                setShowEndTimePicker(false);
              }}
              initialTime={preferredEndTime || new Date()}
            />
          </View>

          {/* Location Card */}


          {/* Work Details Card */}
          <View style={styles.workDetailsCard}>
            <View style={styles.cardHeader}>
              <Briefcase size={22} color="#FF9800" />
              <Text style={styles.cardTitle}>Work Details</Text>
            </View>
            
            <View style={styles.workDetailsRow}>
              <View style={styles.workDetailItem}>
                <Text style={styles.workDetailLabel}>Work Type</Text>
                <TouchableOpacity
                  style={styles.workTypeButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Work Type',
                      '',
                      [
                        { text: 'Remote', onPress: () => {
                          setWorkType('remote');
                          setLocationAddress(''); // Clear location for remote work
                          setSelectedLocation(null); // Clear selected location
                        }},
                        { text: 'On-site', onPress: () => setWorkType('on_site') },
                        { text: 'Hybrid', onPress: () => setWorkType('hybrid') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Text style={styles.workTypeButtonText}>
                    {workType === 'on_site' ? 'On-site' : workType.charAt(0).toUpperCase() + workType.slice(1)}
                  </Text>
                  <ChevronDown size={18} color="#FF9800" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.workDetailItem}>
                <Text style={styles.workDetailLabel}>Urgency</Text>
                <TouchableOpacity
                  style={[styles.urgencyButton, urgencyLevel === 'urgent' && styles.urgentButton]}
                  onPress={() => {
                    Alert.alert(
                      'Select Urgency Level',
                      '',
                      [
                        { text: 'Low', onPress: () => setUrgencyLevel('low') },
                        { text: 'Medium', onPress: () => setUrgencyLevel('medium') },
                        { text: 'High', onPress: () => setUrgencyLevel('high') },
                        { text: 'Urgent', onPress: () => setUrgencyLevel('urgent') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Zap size={16} color={urgencyLevel === 'urgent' ? '#fff' : '#FF5722'} />
                  <Text style={[styles.urgencyButtonText, urgencyLevel === 'urgent' && styles.urgentButtonText]}>
                    {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                  </Text>
                  <ChevronDown size={16} color={urgencyLevel === 'urgent' ? '#fff' : '#FF5722'} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Work Location Section */}
            <View style={styles.workLocationSection}>
              <Text style={styles.workDetailLabel}>Work Location</Text>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  workType === 'remote' && styles.locationButtonDisabled
                ]}
                onPress={() => {
                  // For testing, allow map to open regardless of work type
                  if (!showMapModal && !isLocationButtonPressed) {
                    setIsLocationButtonPressed(true);
                    setShowMapModal(true);
                    // Reset the button state after a short delay
                    setTimeout(() => {
                      setIsLocationButtonPressed(false);
                    }, 500);
                  }
                }}
                disabled={false} // Allow button to work regardless of work type for testing
              >
                <MapPin size={20} color={workType === 'remote' ? '#ccc' : '#9C27B0'} />
                <Text style={[
                  styles.locationButtonText,
                  workType === 'remote' && styles.locationButtonTextDisabled
                ]}>
                  {locationAddress || (workType === 'remote' ? 'Not required for remote work' : 'Select work location on map')}
                </Text>
                {workType !== 'remote' && (
                  <Text style={styles.locationButtonHint}>Tap to open map</Text>
                )}
              </TouchableOpacity>
              
              {/* Debug: Test button to force open map */}
              {workType === 'remote' && (
                <View style={styles.remoteWorkOverlay}>
                  <Text style={styles.remoteWorkText}>Location not required for remote work</Text>
                </View>
              )}
            </View>
          </View>

          {/* Project Specifications Card */}
          <View style={styles.specificationsCard}>
            <View style={styles.cardHeader}>
              <Target size={22} color="#00BCD4" />
              <Text style={styles.cardTitle}>Project Specifications</Text>
            </View>
            
            <View style={styles.specificationItem}>
              <View style={styles.specHeader}>
                <Clock size={18} color="#00ACC1" />
                <Text style={styles.specLabel}>Estimated Hours</Text>
              </View>
              <TextInput
                style={styles.hoursInput}
                placeholder="e.g., 40 hours"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>



            <View style={styles.specificationItem}>
              <View style={styles.specHeader}>
                <FileText size={18} color="#00ACC1" />
                <Text style={styles.specLabel}>Additional Requirements</Text>
              </View>
              <TextInput
                style={styles.requirementsInput}
                placeholder="Share any specific requirements, preferences, or notes that will help you deliver the best results..."
                value={requirements}
                onChangeText={setRequirements}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSendOffer}
            disabled={isLoading}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? 'Saving...' : (isEditing ? 'Update Offer' : 'Send Offer')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  servicePreview: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 16,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  originalDelivery: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 32,
  },
  timelineCard: {
    backgroundColor: '#F0F8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    color: '#999',
  },
  workingHoursCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
    marginBottom: 6,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  timeText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  timeSeparator: {
    paddingBottom: 10,
    alignItems: 'center',
  },
  timeSeparatorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2196F3',
  },
  locationCard: {
    backgroundColor: '#F8F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#CE93D8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  locationInputContainer: {
    marginTop: 8,
  },
  locationListView: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationDescription: {
    fontSize: 16,
    color: '#333',
  },
  workLocationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  locationContainer: {
    marginTop: 8,
    position: 'relative',
  },
  locationContainerDisabled: {
    opacity: 0.5,
  },
  locationTextInput: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  locationTextInputDisabled: {
    color: '#ccc',
  },
  locationInputContainerDisabled: {
    opacity: 0.6,
  },
  locationInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#ccc',
  },
  remoteWorkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 1,
  },
  remoteWorkText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  
  // Location Button Styles
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CE93D8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  locationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  locationButtonTextDisabled: {
    color: '#ccc',
  },
  locationButtonHint: {
    fontSize: 12,
    color: '#9C27B0',
    fontStyle: 'italic',
  },
  
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: 400,
    margin: 16,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  mapModalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  mapModalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  mapModalDoneTextDisabled: {
    color: '#ccc',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  selectedLocationInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  selectedLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  mapInstructions: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapInstructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  workDetailsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  workDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  workDetailItem: {
    flex: 1,
  },
  workDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F57C00',
    marginBottom: 8,
  },
  workTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  workTypeButtonText: {
    fontSize: 15,
    color: '#E65100',
    fontWeight: '500',
  },
  urgencyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8A65',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 4,
  },
  urgentButton: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  urgencyButtonText: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: '600',
  },
  urgentButtonText: {
    color: '#fff',
  },
  specificationsCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  specificationItem: {
    marginBottom: 16,
  },
  specHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00838F',
    marginLeft: 6,
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: '#4DD0E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    textAlign: 'center',
  },

  requirementsInput: {
    borderWidth: 1,
    borderColor: '#4DD0E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fff',
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});