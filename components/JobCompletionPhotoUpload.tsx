import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Camera, Image as ImageIcon, X, Plus } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { JobCompletionService } from '../lib/job-completion-service';

interface JobCompletionPhoto {
  photo_url: string;
  photo_description?: string;
}

interface JobCompletionPhotoUploadProps {
  userId: string;
  onPhotosChange: (photos: JobCompletionPhoto[]) => void;
  photos: JobCompletionPhoto[];
  maxPhotos?: number;
}

export default function JobCompletionPhotoUpload({
  userId,
  onPhotosChange,
  photos,
  maxPhotos = 5,
}: JobCompletionPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleAddPhoto = () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos Reached', `You can upload up to ${maxPhotos} photos.`);
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => takePhoto() },
        { text: 'Choose from Gallery', onPress: () => pickFromGallery() },
      ]
    );
  };

  const takePhoto = async () => {
    setIsUploading(true);
    try {
      const result = await JobCompletionService.takePhotoWithCamera(userId);
      
      if (result.success && result.url) {
        const newPhoto: JobCompletionPhoto = {
          photo_url: result.url,
          photo_description: '',
        };
        onPhotosChange([...photos, newPhoto]);
      } else {
        Alert.alert('Error', result.error || 'Failed to take photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    setIsUploading(true);
    try {
      const result = await JobCompletionService.uploadPhotoFromDevice(userId);
      
      if (result.success && result.url) {
        const newPhoto: JobCompletionPhoto = {
          photo_url: result.url,
          photo_description: '',
        };
        onPhotosChange([...photos, newPhoto]);
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const updatePhotoDescription = (index: number, description: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], photo_description: description };
    onPhotosChange(newPhotos);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Completion Photos</Text>
      <Text style={styles.subtitle}>
        Upload photos showing the completed work ({photos.length}/{maxPhotos})
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo.photo_url }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add description..."
              placeholderTextColor={Colors.text.tertiary}
              value={photo.photo_description}
              onChangeText={(text) => updatePhotoDescription(index, text)}
              multiline
              maxLength={100}
            />
          </View>
        ))}

        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={[styles.photoContainer, styles.addPhotoButton]}
            onPress={handleAddPhoto}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="large" color={Colors.primary.main} />
            ) : (
              <>
                <Plus size={32} color={Colors.primary.main} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <ImageIcon size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyStateText}>No photos uploaded yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add photos to show the completed work
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  photoList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  photoContainer: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionInput: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: 12,
    padding: 4,
    textAlign: 'center',
  },
  addPhotoButton: {
    borderWidth: 2,
    borderColor: Colors.primary.main,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.primary.main,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
