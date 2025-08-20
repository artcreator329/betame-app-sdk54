import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width >= 1024;

interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export default function AdsManagement() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const [imageErrorStates, setImageErrorStates] = useState<Record<string, boolean>>({});
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [orderInput, setOrderInput] = useState('');
  const [showReorderModal, setShowReorderModal] = useState(false);

  useEffect(() => {
    fetchBanners();
    cleanupCorruptedFiles();
  }, []);

  // Add a refresh function
  const refreshBanners = () => {
    console.log('Refreshing banners...');
    fetchBanners();
  };

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching banners:', error);
        Alert.alert('Error', 'Failed to load banners');
        return;
      }

      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      Alert.alert('Error', 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library (only needed on mobile)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to select images.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1200, 425], // Banner aspect ratio (1200x425)
        quality: 1.0, // Use maximum quality
        base64: false, // Don't use base64, use file URI instead
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Selected image asset:', result.assets[0]);
        await uploadBanner(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadBanner = async (imageUri: string, existingBannerId?: string, existingImageUrl?: string) => {
    if (!user) return;

    setUploading(true);
    try {
      console.log('Starting banner upload for user:', user.id);
      console.log('Image URI:', imageUri);
      console.log('Platform:', Platform.OS);
      
      // Generate unique filename with proper extension detection
      let fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Handle WebP format - React Native has better support for PNG/JPEG
      if (fileExt === 'webp') {
        fileExt = 'png'; // Convert WebP to PNG for better compatibility
      }
      
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Convert image URI to blob for upload
      console.log('Converting image to blob...');
      
      let blob: Blob;
      
      // Handle upload based on platform
      console.log('Preparing upload...');
      console.log('File extension:', fileExt);
      
      if (Platform.OS === 'web') {
        // For web, use standard blob approach
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        blob = await response.blob();
        
        console.log('Web blob created, size:', blob.size);
      } else {
        // For React Native, use the image URI directly
        console.log('Using React Native direct upload approach...');
        
        // Skip blob creation for React Native and upload directly
        blob = null as any;
      }
      
      if (Platform.OS === 'web') {
        console.log('Blob size:', blob.size, 'bytes');
        console.log('Blob type:', blob.type);
        
        // Verify blob is not empty (only for web)
        if (blob.size === 0) {
          throw new Error('Image blob is empty. Please try selecting a different image.');
        }
        
        // Additional verification (only for web)
        console.log('Blob constructor:', blob.constructor.name);
        console.log('Blob stream available:', typeof blob.stream === 'function');
        console.log('Blob arrayBuffer available:', typeof blob.arrayBuffer === 'function');
      } else {
        console.log('React Native: Using file URI directly');
      }
      
      // Upload to Supabase Storage
      console.log('Uploading to Supabase storage...');
      console.log('File path:', filePath);
      // Handle content type properly for different formats
      let contentType: string;
      if (Platform.OS === 'web') {
        contentType = blob.type || `image/${fileExt}`;
      } else {
        // For React Native, ensure proper content type
        if (fileExt === 'webp') {
          contentType = 'image/webp';
        } else if (fileExt === 'png') {
          contentType = 'image/png';
        } else if (fileExt === 'jpg' || fileExt === 'jpeg') {
          contentType = 'image/jpeg';
        } else {
          contentType = `image/${fileExt}`;
        }
      }
      console.log('Content type:', contentType);
      
      // Upload based on platform
      let uploadError: any = null;
      let uploadData: any = null;
      
      if (Platform.OS === 'web') {
        // Web upload using blob
        console.log('Uploading blob to Supabase storage (web)...');
        
                 const result = await supabase.storage
           .from('homepage-banners')
           .upload(filePath, blob, {
             contentType: contentType,
             upsert: false,
           });
        
        uploadError = result.error;
        uploadData = result.data;
            } else {
        // React Native upload using base64
        console.log('Uploading base64 to Supabase storage (React Native)...');
        
        try {
          // For React Native, use fetch to get the file data
          console.log('Using React Native fetch approach...');
          
          const response = await fetch(imageUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          
          console.log('Created binary array from fetch, size:', bytes.length);
          
          // Upload the binary data
          const { data, error } = await supabase.storage
            .from('homepage-banners')
            .upload(filePath, bytes, {
              contentType: contentType,
              upsert: false,
            });
          
          uploadError = error;
          uploadData = data;
          
          if (!uploadError) {
            console.log('React Native upload successful!');
          } else {
            console.log('React Native upload error:', uploadError);
          }
        } catch (error) {
          console.error('React Native upload exception:', error);
          uploadError = error;
        }
      }

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload successful!');
      console.log('Upload data:', uploadData);
      
      console.log('Upload successful!');
      console.log('Upload data:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('homepage-banners')
        .getPublicUrl(filePath);

      console.log('Uploaded file URL:', publicUrl);

      // Verify the uploaded file is accessible
      try {
        const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (!verifyResponse.ok) {
          throw new Error(`Uploaded file not accessible: ${verifyResponse.status}`);
        }
        console.log('File verification successful');
      } catch (verifyError) {
        console.error('File verification failed:', verifyError);
        // Continue anyway, as the file might still be processing
      }

      // Save banner record to database
      let dbError;
      
      if (existingBannerId) {
        // Update existing banner
        console.log('Updating existing banner:', existingBannerId);
        
        // Delete old image from storage if it exists
        if (existingImageUrl) {
          const oldFileName = existingImageUrl.split('/').pop();
          if (oldFileName) {
            const { error: storageError } = await supabase.storage
              .from('homepage-banners')
              .remove([`banners/${oldFileName}`]);
            
            if (storageError) {
              console.error('Error deleting old image:', storageError);
            } else {
              console.log('Old image deleted successfully');
            }
          }
        }
        
        // Update the banner record
        const { error } = await supabase
          .from('homepage_banners')
          .update({
            image_url: publicUrl,
          })
          .eq('id', existingBannerId);
        
        dbError = error;
        
        if (!dbError) {
          Alert.alert('Success', 'Banner image updated successfully');
        }
      } else {
        // Create new banner
        console.log('Creating new banner');
        
        const { error } = await supabase
          .from('homepage_banners')
          .insert({
            title: `Banner ${banners.length + 1}`,
            image_url: publicUrl,
            is_active: true,
            order_index: banners.length,
          });
        
        dbError = error;
        
        if (!dbError) {
          Alert.alert('Success', 'Banner uploaded successfully');
        }
      }

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
      fetchBanners();
    } catch (error) {
      console.error('Error uploading banner:', error);
      Alert.alert('Error', `Failed to upload banner: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleBannerStatus = async (bannerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ is_active: !isActive })
        .eq('id', bannerId);

      if (error) {
        throw error;
      }

      fetchBanners();
    } catch (error) {
      console.error('Error updating banner status:', error);
      Alert.alert('Error', 'Failed to update banner status');
    }
  };

  const startEditing = (banner: Banner) => {
    setEditingBanner(banner.id);
    setEditTitle(banner.title);
    setEditDescription(banner.description || '');
  };

  const cancelEditing = () => {
    setEditingBanner(null);
    setEditTitle('');
    setEditDescription('');
  };

  const saveBannerEdit = async (bannerId: string) => {
    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ 
          title: editTitle.trim(),
          description: editDescription.trim() || null
        })
        .eq('id', bannerId);

      if (error) {
        throw error;
      }

      setEditingBanner(null);
      setEditTitle('');
      setEditDescription('');
      fetchBanners();
    } catch (error) {
      console.error('Error updating banner:', error);
      Alert.alert('Error', 'Failed to update banner');
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    console.log('Delete banner called for:', bannerId, imageUrl);
    
    Alert.alert(
      'Delete Banner',
      'Are you sure you want to delete this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting banner deletion for:', bannerId);
              
              // Delete from database
              const { error: dbError } = await supabase
                .from('homepage_banners')
                .delete()
                .eq('id', bannerId);

              if (dbError) {
                console.error('Database deletion error:', dbError);
                throw dbError;
              }

              console.log('Database deletion successful');

              // Delete from storage (extract filename from URL)
              const fileName = imageUrl.split('/').pop();
              console.log('Extracted filename:', fileName);
              
              if (fileName) {
                const { error: storageError } = await supabase.storage
                  .from('homepage-banners')
                  .remove([`banners/${fileName}`]);
                
                if (storageError) {
                  console.error('Storage deletion error:', storageError);
                } else {
                  console.log('Storage deletion successful');
                }
              }

              console.log('Banner deletion completed successfully');
              fetchBanners();
            } catch (error) {
              console.error('Error deleting banner:', error);
              Alert.alert('Error', 'Failed to delete banner');
            }
          },
        },
      ]
    );
  };

  // Function to reupload banner image
  const reuploadBannerImage = async (bannerId: string, currentImageUrl: string) => {
    try {
      // Request permission to access media library (only needed on mobile)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to select images.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1200, 425], // Banner aspect ratio (1200x425)
        quality: 1.0, // Use maximum quality
        base64: false, // Don't use base64, use file URI instead
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Reuploading image for banner:', bannerId);
        console.log('New image URI:', asset.uri);
        
        // Upload the new image
        await uploadBanner(asset.uri, bannerId, currentImageUrl);
      }
    } catch (error) {
      console.error('Error reuploading banner image:', error);
      Alert.alert('Error', 'Failed to reupload banner image');
    }
  };

  // Function to toggle banner visibility
  const toggleBannerVisibility = async (bannerId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      console.log('Toggling banner visibility:', bannerId, 'from', currentStatus, 'to', newStatus);
      
      const { error } = await supabase
        .from('homepage_banners')
        .update({ is_active: newStatus })
        .eq('id', bannerId);

      if (error) {
        console.error('Error toggling banner visibility:', error);
        Alert.alert('Error', 'Failed to update banner visibility');
        return;
      }

      console.log('Banner visibility updated successfully');
      fetchBanners();
    } catch (error) {
      console.error('Error toggling banner visibility:', error);
      Alert.alert('Error', 'Failed to update banner visibility');
    }
  };

  // Function to start editing order
  const startOrderEditing = (bannerId: string, currentOrder: number) => {
    setEditingOrder(bannerId);
    setOrderInput((currentOrder + 1).toString());
  };

  // Function to cancel order editing
  const cancelOrderEditing = () => {
    setEditingOrder(null);
    setOrderInput('');
  };

  // Function to save manual order
  const saveOrderEdit = async (bannerId: string) => {
    try {
      const newOrder = parseInt(orderInput) - 1; // Convert to 0-based index
      
      if (isNaN(newOrder) || newOrder < 0 || newOrder >= banners.length) {
        Alert.alert('Invalid Order', `Please enter a number between 1 and ${banners.length}`);
        return;
      }

      console.log('Updating banner order:', bannerId, 'to position:', newOrder);
      
      // Get current banner
      const currentBanner = banners.find(b => b.id === bannerId);
      if (!currentBanner) return;

      // Update the order
      const { error } = await supabase
        .from('homepage_banners')
        .update({ order_index: newOrder })
        .eq('id', bannerId);

      if (error) {
        console.error('Error updating banner order:', error);
        Alert.alert('Error', 'Failed to update banner order');
        return;
      }

      console.log('Banner order updated successfully');
      setEditingOrder(null);
      setOrderInput('');
      fetchBanners();
    } catch (error) {
      console.error('Error updating banner order:', error);
      Alert.alert('Error', 'Failed to update banner order');
    }
  };

  // Function to clean up corrupted files
  const cleanupCorruptedFiles = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from('homepage-banners')
        .list('banners');

      if (error) {
        console.error('Error listing files:', error);
        return;
      }

      const corruptedFiles = files.filter(file => file.metadata?.size === 0);
      
      if (corruptedFiles.length > 0) {
        console.log('Found corrupted files:', corruptedFiles);
        
        const filePaths = corruptedFiles.map(file => `banners/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('homepage-banners')
          .remove(filePaths);
        
        if (deleteError) {
          console.error('Error deleting corrupted files:', deleteError);
        } else {
          console.log('Cleaned up corrupted files');
        }
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  };

  const reorderBanner = async (bannerId: string, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === bannerId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    try {
      // Swap order_index values
      const currentBanner = banners[currentIndex];
      const targetBanner = banners[newIndex];

      await supabase
        .from('homepage_banners')
        .update({ order_index: targetBanner.order_index })
        .eq('id', currentBanner.id);

      await supabase
        .from('homepage_banners')
        .update({ order_index: currentBanner.order_index })
        .eq('id', targetBanner.id);

      fetchBanners();
    } catch (error) {
      console.error('Error reordering banner:', error);
      Alert.alert('Error', 'Failed to reorder banner');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading banners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ads Management</Text>
          <Text style={styles.subtitle}>Manage homepage banners and advertisements</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Homepage Banners</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshBanners}
              >
                <Ionicons name="refresh" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => setShowReorderModal(true)}
              >
                <Ionicons name="list" size={20} color="#fff" />
                <Text style={styles.reorderButtonText}>Reorder All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={uploading}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Add Banner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Image Requirements Note */}
          <View style={styles.imageRequirementsNote}>
            <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
            <Text style={styles.imageRequirementsText}>
              Recommended image size: 1200x425 pixels for optimal display
            </Text>
          </View>

          {banners.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No banners uploaded yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Upload banner images to display on the homepage
              </Text>
            </View>
          ) : (
            <View style={styles.bannersList}>
              {banners.map((banner, index) => (
                <View key={banner.id} style={styles.bannerCard}>
                  <View style={styles.bannerImageContainer}>
                    {imageLoadingStates[banner.id] && (
                      <View style={styles.imageLoadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.imageLoadingText}>Loading image...</Text>
                      </View>
                    )}
                    {imageErrorStates[banner.id] && (
                      <View style={styles.imageErrorContainer}>
                        <Ionicons name="image-outline" size={48} color="#ccc" />
                        <Text style={styles.imageErrorText}>Failed to load image</Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setImageErrorStates(prev => ({ ...prev, [banner.id]: false }));
                            setImageLoadingStates(prev => ({ ...prev, [banner.id]: true }));
                          }}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                                        <Image 
                      source={{ uri: banner.image_url }} 
                      style={[
                        styles.bannerImage,
                        (imageLoadingStates[banner.id] || imageErrorStates[banner.id]) && styles.hiddenImage
                      ]}
                      onLoadStart={() => {
                        console.log('Image load started for:', banner.id, banner.image_url);
                        setImageLoadingStates(prev => ({ ...prev, [banner.id]: true }));
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully for:', banner.id);
                        setImageLoadingStates(prev => ({ ...prev, [banner.id]: false }));
                      }}
                      onError={(error) => {
                        console.log('Image load error for:', banner.id, error);
                        setImageLoadingStates(prev => ({ ...prev, [banner.id]: false }));
                        setImageErrorStates(prev => ({ ...prev, [banner.id]: true }));
                        console.error('Failed to load image:', banner.image_url, error);
                      }}
                      resizeMode="cover"
                    />
                    {/* Removed redundant overlay buttons - using action buttons below instead */}
                  </View>

                  <View style={styles.bannerInfo}>
                    {editingBanner === banner.id ? (
                      <View style={styles.editForm}>
                        <TextInput
                          style={styles.editInput}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          placeholder="Banner Title"
                          placeholderTextColor="#999"
                        />
                        <TextInput
                          style={[styles.editInput, styles.editTextArea]}
                          value={editDescription}
                          onChangeText={setEditDescription}
                          placeholder="Banner Description (optional)"
                          placeholderTextColor="#999"
                          multiline
                          numberOfLines={3}
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={[styles.editButton, styles.saveButton]}
                            onPress={() => saveBannerEdit(banner.id)}
                          >
                            <Text style={styles.saveButtonText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editButton, styles.cancelButton]}
                            onPress={cancelEditing}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.bannerHeader}>
                          <Text style={styles.bannerTitle}>{banner.title}</Text>
                          <TouchableOpacity
                            style={styles.editIconButton}
                            onPress={() => startEditing(banner)}
                          >
                            <Ionicons name="pencil" size={16} color="#666" />
                          </TouchableOpacity>
                        </View>
                        {banner.description && (
                          <Text style={styles.bannerDescription}>{banner.description}</Text>
                        )}
                        <View style={styles.bannerMeta}>
                          <Text style={styles.bannerStatus}>
                            Status: {banner.is_active ? 'Active' : 'Inactive'}
                          </Text>
                          <Text style={styles.bannerOrder}>Order: {banner.order_index + 1}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.bannerControls}>
                    <TouchableOpacity
                      style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                      onPress={() => reorderBanner(banner.id, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up" size={16} color={index === 0 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                    
                    {/* Order Display/Edit */}
                    {editingOrder === banner.id ? (
                      <View style={styles.orderEditContainer}>
                        <TextInput
                          style={styles.orderInput}
                          value={orderInput}
                          onChangeText={setOrderInput}
                          keyboardType="numeric"
                          placeholder="Order"
                          placeholderTextColor="#999"
                        />
                        <TouchableOpacity
                          style={styles.orderSaveButton}
                          onPress={() => saveOrderEdit(banner.id)}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.orderCancelButton}
                          onPress={cancelOrderEditing}
                        >
                          <Ionicons name="close" size={14} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.orderDisplay}
                        onPress={() => startOrderEditing(banner.id, banner.order_index)}
                      >
                        <Text style={styles.orderText}>#{banner.order_index + 1}</Text>
                        <Ionicons name="pencil" size={12} color="#666" />
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.controlButton, index === banners.length - 1 && styles.controlButtonDisabled]}
                      onPress={() => reorderBanner(banner.id, 'down')}
                      disabled={index === banners.length - 1}
                    >
                      <Ionicons name="arrow-down" size={16} color={index === banners.length - 1 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButtonLarge, styles.editButtonLarge]}
                      onPress={() => reuploadBannerImage(banner.id, banner.image_url)}
                    >
                      <Ionicons name="image-outline" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButtonLarge, styles.visibilityButtonLarge, banner.is_active && styles.visibilityButtonActive]}
                      onPress={() => toggleBannerVisibility(banner.id, banner.is_active)}
                    >
                      <Ionicons 
                        name={banner.is_active ? 'eye' : 'eye-off'} 
                        size={14} 
                        color="#fff" 
                      />
                      <Text style={styles.actionButtonText}>
                        {banner.is_active ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButtonLarge, styles.deleteButtonLarge]}
                      onPress={() => deleteBanner(banner.id, banner.image_url)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reorder Modal */}
      {showReorderModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.reorderModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reorder Banners</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReorderModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Drag and drop or use the arrows to reorder banners. The order will be applied immediately.
              </Text>
              
              {banners.map((banner, index) => (
                <View key={banner.id} style={styles.reorderItem}>
                  <View style={styles.reorderItemContent}>
                    <Image 
                      source={{ uri: banner.image_url }} 
                      style={styles.reorderItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.reorderItemInfo}>
                      <Text style={styles.reorderItemTitle}>{banner.title}</Text>
                      <Text style={styles.reorderItemOrder}>Current: #{banner.order_index + 1}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.reorderItemControls}>
                    <TouchableOpacity
                      style={[styles.reorderControlButton, index === 0 && styles.reorderControlButtonDisabled]}
                      onPress={() => reorderBanner(banner.id, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up" size={16} color={index === 0 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reorderControlButton, index === banners.length - 1 && styles.reorderControlButtonDisabled]}
                      onPress={() => reorderBanner(banner.id, 'down')}
                      disabled={index === banners.length - 1}
                    >
                      <Ionicons name="arrow-down" size={16} color={index === banners.length - 1 ? "#ccc" : "#666"} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowReorderModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  bannersList: {
    gap: 16,
  },
  bannerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerImageContainer: {
    position: 'relative',
    height: 160, // Adjusted for 1200x425 aspect ratio preview
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Removed bannerOverlay, bannerActions, actionButton, and deleteButton styles
  // since we're using the action buttons below instead
  bannerInfo: {
    padding: 16,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bannerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerStatus: {
    fontSize: 14,
    color: '#666',
  },
  bannerOrder: {
    fontSize: 14,
    color: '#666',
  },
  bannerControls: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  controlButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  controlButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  // Order editing styles
  orderDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 3,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  orderEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    gap: 4,
  },
  orderInput: {
    width: 50,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  orderSaveButton: {
    backgroundColor: '#28a745',
    padding: 6,
    borderRadius: 4,
  },
  orderCancelButton: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  // Action buttons container
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  editButtonLarge: {
    backgroundColor: '#007AFF',
  },
  visibilityButtonLarge: {
    backgroundColor: '#6c757d',
  },
  visibilityButtonActive: {
    backgroundColor: '#28a745',
  },
  deleteButtonLarge: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Image requirements note
  imageRequirementsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  imageRequirementsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  reorderModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reorderItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderItemImage: {
    width: 60,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  reorderItemInfo: {
    flex: 1,
  },
  reorderItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reorderItemOrder: {
    fontSize: 12,
    color: '#666',
  },
  reorderItemControls: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderControlButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
  },
  reorderControlButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Edit form styles
  editForm: {
    gap: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editIconButton: {
    padding: 4,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  // Image loading and error states
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    zIndex: 1,
  },
  imageLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    zIndex: 1,
  },
  imageErrorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hiddenImage: {
    opacity: 0,
  },
});
