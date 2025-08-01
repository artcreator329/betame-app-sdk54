import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, MapPin, Users, Shield, Zap } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();

  const features = [
    {
      icon: <Users size={24} color="#007AFF" />,
      title: 'Trusted Community',
      description: 'Connect with verified service providers in your area',
    },
    {
      icon: <Shield size={24} color="#007AFF" />,
      title: 'Secure Payments',
      description: 'Safe and secure payment processing for all transactions',
    },
    {
      icon: <Star size={24} color="#007AFF" />,
      title: 'Quality Assured',
      description: 'All services are rated and reviewed by real customers',
    },
    {
      icon: <Zap size={24} color="#007AFF" />,
      title: 'Instant Booking',
      description: 'Book services instantly and get connected with providers',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      rating: 5,
      comment: 'Found an amazing yoga instructor through BetaMe. The booking process was so smooth!',
      service: 'Yoga Training',
    },
    {
      name: 'Ahmad Rahman',
      rating: 5,
      comment: 'Great platform for finding reliable home cleaning services. Highly recommended!',
      service: 'House Cleaning',
    },
    {
      name: 'Jessica Wong',
      rating: 5,
      comment: 'The English tutoring I found here helped me pass my IELTS exam. Thank you BetaMe!',
      service: 'English Tutoring',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
            <Text style={styles.brandName}>BetaMe</Text>
          </View>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Find Local Services{' \n'}
            <Text style={styles.heroTitleAccent}>You Can Trust</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Connect with skilled professionals in your area for all your service needs
          </Text>
          
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Preview Services */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {[
              { title: 'House Cleaning', price: 'From RM80', image: 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400' },
              { title: 'Yoga Training', price: 'From RM60', image: 'https://images.pexels.com/photos/3822587/pexels-photo-3822587.jpeg?auto=compress&cs=tinysrgb&w=400' },
              { title: 'English Tutoring', price: 'From RM68', image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400' },
              { title: 'Pet Care', price: 'From RM55', image: 'https://images.pexels.com/photos/4498778/pexels-photo-4498778.jpeg?auto=compress&cs=tinysrgb&w=400' },
            ].map((service, index) => (
              <View key={index} style={styles.serviceCard}>
                <Image source={{ uri: service.image }} style={styles.serviceImage} />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Choose BetaMe?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  {feature.icon}
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>What Our Users Say</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsScroll}
          >
            {testimonials.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <View style={styles.testimonialHeader}>
                  <Text style={styles.testimonialName}>{testimonial.name}</Text>
                  <View style={styles.ratingContainer}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={12} color="#FFD700" fill="#FFD700" />
                    ))}
                  </View>
                </View>
                <Text style={styles.testimonialComment}>{testimonial.comment}</Text>
                <Text style={styles.testimonialService}>{testimonial.service}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5K+</Text>
            <Text style={styles.statLabel}>Service Providers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>50K+</Text>
            <Text style={styles.statLabel}>Services Completed</Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of users who trust BetaMe for their service needs
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.ctaButtonText}>Sign Up Now</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 BetaMe. All rights reserved.</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 16,
    color: 'white',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroTitleAccent: {
    color: '#007AFF',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    paddingVertical: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  servicesScroll: {
    paddingHorizontal: 24,
  },
  serviceCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  serviceInfo: {
    padding: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#F8F9FA',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
  testimonialsSection: {
    paddingVertical: 32,
  },
  testimonialsScroll: {
    paddingHorizontal: 24,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  testimonialComment: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
    marginBottom: 8,
  },
  testimonialService: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#1D1D1F',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});