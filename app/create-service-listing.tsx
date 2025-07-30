import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CreateServiceListingScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const router = useRouter();

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

  const handleList = () => {
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
    
    Alert.alert('Success', 'Service listing created successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
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
            <TouchableOpacity style={styles.photoUploadContainer}>
              <View style={styles.uploadPlaceholder}>
                <Upload size={24} color="#8E8E93" />
                <Text style={styles.uploadText}>Upload your service cover photo</Text>
                <Text style={styles.uploadSubtext}>Max. 10MB</Text>
              </View>
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
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="Start from... You may decide price for sub-plan later"
              placeholderTextColor="#8E8E93"
            />
          </View>

          {/* List Button */}
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