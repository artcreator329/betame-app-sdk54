import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Heart, Wallet, Trophy, Camera, Star } from 'lucide-react-native';
import { sellerServices } from '@/data/mockData';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Services');
  const router = useRouter();

  const handleShareProfile = async () => {
    try {
      const result = await Share.share({
        message: "Check out Anvenia Tan's profile on BetaMe!\n\nBelieve in God ❤️\n\nDownload the app to connect with amazing service providers!",
        title: "Anvenia Tan's Profile",
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share profile. Please try again.');
    }
  };

  const mockReviews = [
    {
      id: '1',
      reviewerName: 'Syafiqah',
      reviewerImage: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Great teacher, always love to attend her class',
    },
    {
      id: '2',
      reviewerName: 'Rosli Yahya',
      reviewerImage: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Your dedication to your students and your hard work do not go unnoticed. Thank you for going the extra mile to ensure we succeed.',
    },
    {
      id: '3',
      reviewerName: 'Kimberly Yap',
      reviewerImage: 'https://images.pexels.com/photos/3807738/pexels-photo-3807738.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Thank you very much for the effort you have put into teaching me, I have enjoyed and learned from every lesson you have taught me',
    },
    {
      id: '4',
      reviewerName: 'Anvenia Tan',
      reviewerImage: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=200',
      rating: 5.0,
      reviewText: 'Thank you Ms. Jeslina! It was wonderful to attend your class',
    },
  ];

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            color="#FFD700"
            fill={star <= rating ? "#FFD700" : "transparent"}
          />
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Jobs (Hiring)':
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>You do not have any job postings</Text>
            <Text style={styles.emptyStateSuggestion}>Why don't you post your first job?</Text>
          </View>
        );
      case 'Services':
        return (
          <View style={styles.servicesContent}>
            <Text style={styles.availableListings}>Available Listings (4)</Text>
            {sellerServices.map((service) => (
              <View key={service.id} style={styles.serviceItem}>
                <Image source={{ uri: service.image }} style={styles.serviceImage} />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceDescription} numberOfLines={3}>
                    {service.description}
                  </Text>
                  <View style={styles.servicePricing}>
                    <Text style={styles.servicePrice}>From {service.currency}{service.price}</Text>
                    <TouchableOpacity style={styles.seeOfferButton}>
                      <Text style={styles.seeOfferText}>See Offer!</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );
      case 'Reviews':
        return (
          <View style={styles.reviewsContainer}>
            {mockReviews.map((review) => (
              <TouchableOpacity key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image
                    source={{ uri: review.reviewerImage }}
                    style={styles.reviewerImage}
                  />
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.reviewText}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerIcon}>
              <Wallet size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Trophy size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Heart size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => router.push('/settings')}
            >
              <Settings size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.sellerBadge}>
            <Text style={styles.sellerBadgeText}>CELTA & DELTA Holders</Text>
            <Text style={styles.sellerBadgeSubtext}>IELTS Tests Expert</Text>
            <Text style={styles.sellerBadgeSubtext}>More than 1,000 D-Level Students</Text>
          </View>
          
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>Anvenia Tan</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>4.9</Text>
            {renderStars(4.9)}
            <Text style={styles.reviewText}>(219 reviews)</Text>
          </View>
          <Text style={styles.userTagline}>Believe in God ❤️</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => router.push('/chat/jeslina-kong')}
          >
            <Text style={styles.chatButtonText}>Chat to enquire</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareProfile}
          >
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {['Jobs (Hiring)', 'Services', 'Reviews'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginHorizontal: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1D1D1F',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  userTagline: {
    fontSize: 16,
    color: '#8E8E93',
  },
  sellerBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  sellerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  sellerBadgeSubtext: {
    fontSize: 12,
    color: '#1976D2',
  },
  actionButtons: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    gap: 8,
  },
  chatButton: {
    backgroundColor: '#1D1D1F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editShareContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1D1D1F',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: 'white',
    minHeight: 400,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSuggestion: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  reviewsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  reviewCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
  },
  servicesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  availableListings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
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
  serviceImage: {
    width: 80,
    height: 80,
    margin: 12,
    borderRadius: 8,
  },
  serviceInfo: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 8,
  },
  servicePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  seeOfferButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  seeOfferText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});