import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Service } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface NearbyServiceIconProps {
  service: Service;
}

export default function NearbyServiceIcon({ service }: NearbyServiceIconProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);

  // Fetch user's cover photo when service has no image
  useEffect(() => {
    const fetchUserCoverPhoto = async () => {
      if (!service.image_url && service.user_id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('cover_photo_url')
            .eq('id', service.user_id)
            .single();

          if (!error && data?.cover_photo_url) {
            setUserCoverPhoto(data.cover_photo_url);
          }
        } catch (error) {
          console.error('Error fetching user cover photo:', error);
        }
      }
    };

    fetchUserCoverPhoto();
  }, [service.image_url, service.user_id]);

  const getServiceImage = () => {
    if (service.image_url) {
      return service.image_url;
    }
    if (userCoverPhoto) {
      return userCoverPhoto;
    }
    return null;
  };

  const handlePress = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to view service details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    router.push(`/service/${service.id}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: getServiceImage() }} style={styles.image} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {service.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 70,
    marginRight: 16,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 11,
    color: '#1D1D1F',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
});