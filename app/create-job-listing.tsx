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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, CreditCard as Edit3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

export default function CreateJobListingScreen() {
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const router = useRouter();

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

  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const handleUploadPhoto = () => {
    setCoverPhoto('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400');
  };

  const handleList = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return;
    }
    if (!salary.trim()) {
      Alert.alert('Error', 'Please enter a salary');
      return;
    }
    
    Alert.alert('Success', 'Job listing created successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const getLocationDisplayText = () => {
    if (selectedLocations.length === 0) return 'Choose location for work';
    if (selectedLocations.length === 1) return selectedLocations[0];
    return `${selectedLocations.length} locations selected`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Service Details</Text>

          <View style={styles.fieldContainer}>
            <TouchableOpacity style={styles.photoUploadContainer} onPress={handleUploadPhoto}>
              {coverPhoto ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: coverPhoto }} style={styles.coverPhoto} />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoLabel}>Cover photo</Text>
                    <View style={styles.photoActions}>
                      <TouchableOpacity style={styles.photoAction}>
                        <Upload size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoAction}>
                        <Edit3 size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={24} color="#8E8E93" />
                  <Text style={styles.uploadText}>Upload your service cover photo</Text>
                  <Text style={styles.uploadSubtext}>Max 10MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Title (Required)</Text>
              <Text style={styles.characterCount}>{title.length}/25</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Add a title to describe your service"
              placeholderTextColor="#8E8E93"
              maxLength={25}
            />
            {coverPhoto && (
              <TouchableOpacity style={styles.editIcon}>
                <Edit3 size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

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
            {coverPhoto && (
              <TouchableOpacity style={styles.editIcon}>
                <Edit3 size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Salary</Text>
            <TextInput
              style={styles.textInput}
              value={salary}
              onChangeText={setSalary}
              placeholder="Start from... You may decide price for sub-plan later"
              placeholderTextColor="#8E8E93"
            />
            {coverPhoto && (
              <TouchableOpacity style={styles.editIcon}>
                <Edit3 size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          {coverPhoto && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Location</Text>
              <TouchableOpacity 
                style={styles.locationSelector}
                onPress={() => setShowLocationSelector(!showLocationSelector)}
              >
                <Text style={[
                  styles.locationText,
                  selectedLocations.length === 0 && styles.placeholderText
                ]}>
                  {getLocationDisplayText()}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {showLocationSelector && (
                <View style={styles.locationOptions}>
                  {locations.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={styles.locationOption}
                      onPress={() => handleLocationToggle(location)}
                    >
                      <View style={styles.checkbox}>
                        {selectedLocations.includes(location) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.locationOptionText}>{location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.listButton} onPress={handleList}>
            <Text style={styles.listButtonText}>List</Text>
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
  editIcon: {
    position: 'absolute',
    right: 12,
    top: 40,
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
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  locationText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  locationOptions: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 200,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  listButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  listButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});