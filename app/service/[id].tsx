import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { allServices } from '@/data/mockData';
import { findChatByParticipant } from '@/data/mockChatData';

interface SubPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  details: string[];
}

const mockSubPlans: { [key: string]: SubPlan[] } = {
  '10': [ // Pet grooming service
    {
      id: '1',
      name: 'Basic Care',
      price: 45,
      description: 'Leave your pet with us!',
      details: [
        'Check in time to check out time is not exceeding 24 hours',
        'Meals price is excluded'
      ]
    },
    {
      id: '2',
      name: 'Extended Care',
      price: 185,
      description: 'Complete pet care package',
      details: [
        'Up to 7 days pet care',
        'Meals included',
        'Daily exercise and playtime',
        'Photo updates twice daily'
      ]
    },
    {
      id: '3',
      name: 'Premium Care',
      price: 990,
      description: 'Luxury pet care experience',
      details: [
        'Up to 1 month pet care',
        'Premium meals included',
        'Daily grooming',
        'Veterinary checkups',
        'Video calls with pet owner'
      ]
    }
  ],
  '6': [ // Fitness training
    {
      id: '1',
      name: 'Basic Training',
      price: 88,
      description: 'Individual training session',
      details: [
        '1 hour personal training',
        'Basic workout plan',
        'Nutrition guidelines'
      ]
    },
    {
      id: '2',
      name: 'Weekly Package',
      price: 300,
      description: 'Weekly training program',
      details: [
        '4 training sessions per week',
        'Customized meal plan',
        'Progress tracking',
        'WhatsApp support'
      ]
    },
    {
      id: '3',
      name: 'Monthly Transformation',
      price: 1200,
      description: 'Complete body transformation',
      details: [
        'Daily training sessions',
        'Meal prep service',
        'Body composition analysis',
        '24/7 coach support',
        'Supplement recommendations'
      ]
    }
  ]
};

export default function ServiceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const service = allServices.find(s => s.id === id);
  
  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Service not found</Text>
      </SafeAreaView>
    );
  }

  const getParticipantId = () => {
    // Map service providers to chat participant IDs
    const providerMap: { [key: string]: string } = {
      'Jeslina Kong': 'jeslina-kong',
      'Abang Joe': 'abang-joe',
      'Raj Kumar': 'raj-kumar',
      'Abdul Khalib': 'abdul-khalib',
      'Mike Chen': 'mike-chen',
      'David Wong': 'david-wong',
    };
    return providerMap[service.provider] || service.provider.toLowerCase().replace(' ', '-');
  };

  const handleChatWithSeller = () => {
    const participantId = getParticipantId();
    router.push(`/chat/${participantId}`);
  };

  const subPlans = mockSubPlans[service.id] || [];
  const selectedSubPlan = subPlans.find(plan => plan.id === selectedPlan);

  // Enhanced service details for pet grooming
  const serviceDetails = service.id === '10' ? {
    title: 'Pawer Puff',
    subtitle: 'Take care your pet for short-term',
    duration: 'From 1 hour, up to 1 month',
    location: 'We are located @ Bandar Puteri Puchong, a corner landed landed house with max capacity 16 pets',
    feeding: 'We will feed your pet according to your requirement',
    socializing: 'We will ensure your pet can enjoy making friends with others'
  } : {
    title: service.title,
    subtitle: service.description,
    duration: 'Flexible scheduling available',
    location: 'Location can be discussed',
    feeding: '',
    socializing: ''
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ 
              uri: service.id === '10' 
                ? 'https://images.pexels.com/photos/4498778/pexels-photo-4498778.jpeg?auto=compress&cs=tinysrgb&w=800' 
                : service.image 
            }}
            style={styles.heroImage}
          />
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Provider Info */}
          <View style={styles.providerSection}>
            <View style={styles.providerInfo}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=200' }}
                style={styles.providerImage}
              />
              <View style={styles.providerDetails}>
                <Text style={styles.listedBy}>Listed by</Text>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName}>
                    {service.id === '10' ? 'Abang Joe' : service.provider}
                  </Text>
                  <Text style={styles.checkProfile}>Check Abang Joe's profile!</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.rating}>
                    {service.rating} ({service.reviewCount})
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.serviceSection}>
            <Text style={styles.serviceTitle}>{serviceDetails.title}</Text>
            <Text style={styles.serviceSubtitle}>{serviceDetails.subtitle}</Text>
            <Text style={styles.serviceDuration}>{serviceDetails.duration}</Text>
            
            {serviceDetails.location ? (
              <Text style={styles.serviceDetail}>{serviceDetails.location}</Text>
            ) : null}
            {serviceDetails.feeding ? (
              <Text style={styles.serviceDetail}>{serviceDetails.feeding}</Text>
            ) : null}
            {serviceDetails.socializing ? (
              <Text style={styles.serviceDetail}>{serviceDetails.socializing}</Text>
            ) : null}
          </View>

          {/* Pricing Plans */}
          {subPlans.length > 0 && (
            <View style={styles.pricingSection}>
              <View style={styles.pricingTabs}>
                {subPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.pricingTab,
                      selectedPlan === plan.id && styles.selectedPricingTab
                    ]}
                    onPress={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                  >
                    <Text style={[
                      styles.pricingTabText,
                      selectedPlan === plan.id && styles.selectedPricingTabText
                    ]}>
                      RM{plan.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sub-plan Details */}
              {selectedSubPlan && (
                <View style={styles.subPlanDetails}>
                  <Text style={styles.subPlanTitle}>{selectedSubPlan.description}</Text>
                  {selectedSubPlan.details.map((detail, index) => (
                    <Text key={index} style={styles.subPlanDetail}>{detail}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Chat Button */}
          <View style={styles.chatSection}>
            <TouchableOpacity style={styles.chatButton} onPress={handleChatWithSeller}>
              <MessageCircle size={20} color="white" />
              <Text style={styles.chatButtonText}>Chat with seller</Text>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100' }}
                style={styles.chatProviderImage}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  heroContainer: {
    position: 'relative',
    height: 250,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  providerSection: {
    marginBottom: 20,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  listedBy: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 8,
  },
  checkProfile: {
    fontSize: 12,
    color: '#007AFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#1D1D1F',
    marginLeft: 4,
  },
  serviceSection: {
    marginBottom: 24,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  serviceSubtitle: {
    fontSize: 16,
    color: '#1D1D1F',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 16,
    color: '#1D1D1F',
    marginBottom: 8,
  },
  serviceDetail: {
    fontSize: 16,
    color: '#1D1D1F',
    marginBottom: 4,
    lineHeight: 22,
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pricingTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedPricingTab: {
    backgroundColor: '#1D1D1F',
    borderColor: '#1D1D1F',
  },
  pricingTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  selectedPricingTabText: {
    color: 'white',
  },
  subPlanDetails: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
  },
  subPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  subPlanDetail: {
    fontSize: 14,
    color: '#1D1D1F',
    marginBottom: 4,
    lineHeight: 20,
  },
  chatSection: {
    marginTop: 20,
  },
  chatButton: {
    backgroundColor: '#1D1D1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    position: 'relative',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatProviderImage: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});