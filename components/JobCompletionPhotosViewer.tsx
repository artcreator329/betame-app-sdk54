import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface JobCompletionPhoto {
  id?: string;
  photo_url: string;
  photo_description?: string;
  uploaded_at?: string;
}

interface JobCompletionPhotosViewerProps {
  photos: JobCompletionPhoto[];
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function JobCompletionPhotosViewer({
  photos,
  title = 'Completion Photos',
}: JobCompletionPhotosViewerProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closePhotoModal = () => {
    setSelectedPhotoIndex(null);
  };

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const goToNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ImageIcon size={48} color={Colors.text.tertiary} />
        <Text style={styles.emptyText}>No completion photos available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id || index}
            style={styles.photoContainer}
            onPress={() => openPhotoModal(index)}
          >
            <Image source={{ uri: photo.photo_url }} style={styles.photo} />
            {photo.photo_description && (
              <View style={styles.descriptionOverlay}>
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {photo.photo_description}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full Screen Photo Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePhotoModal} style={styles.closeButton}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedPhotoIndex !== null ? `${selectedPhotoIndex + 1} of ${photos.length}` : ''}
            </Text>
          </View>

          <View style={styles.modalContent}>
            {selectedPhotoIndex !== null && (
              <Image
                source={{ uri: photos[selectedPhotoIndex].photo_url }}
                style={styles.fullScreenPhoto}
                resizeMode="contain"
              />
            )}

            {/* Navigation buttons */}
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={goToPreviousPhoto}
              disabled={selectedPhotoIndex === 0}
            >
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={goToNextPhoto}
              disabled={selectedPhotoIndex === photos.length - 1}
            >
              <ChevronRight size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Photo description */}
          {selectedPhotoIndex !== null && photos[selectedPhotoIndex].photo_description && (
            <View style={styles.modalFooter}>
              <Text style={styles.modalDescription}>
                {photos[selectedPhotoIndex].photo_description}
              </Text>
            </View>
          )}
        </View>
      </Modal>
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
  descriptionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  descriptionText: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalDescription: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default JobCompletionPhotosViewer;
export { JobCompletionPhotosViewer };
