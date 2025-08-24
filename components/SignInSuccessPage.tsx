import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Import Android Video Background Component
const AndroidVideoBackground = Platform.OS === 'android' 
  ? require('@/components/AndroidVideoBackground').AndroidVideoBackground 
  : null;

interface SignInSuccessPageProps {
  onComplete: () => void;
  delay?: number;
}

export default function SignInSuccessPage({ onComplete, delay = 2000 }: SignInSuccessPageProps) {
  // Page transition animations
  const pageOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  
  // Element animations
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  const successIconScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start entrance animations sequence
    const startEntranceAnimations = () => {
      // 1. Fade in the entire page and slide content up
      Animated.parallel([
        Animated.timing(pageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Success icon appears with spring animation (delayed)
      setTimeout(() => {
        Animated.spring(successIconScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 200);

      // 3. Logo fades in and scales up (staggered)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);

      // 4. Title slides up and fades in
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);

      // 5. Subtitle slides up and fades in
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 800);

      // 6. Start loading dots animation
      setTimeout(() => {
        animateDots();
      }, 1000);
    };

    // Animate loading dots
    const animateDots = () => {
      const createDotAnimation = (opacity: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 600,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createDotAnimation(dot1Opacity, 0),
        createDotAnimation(dot2Opacity, 200),
        createDotAnimation(dot3Opacity, 400),
      ]).start();
    };

    // Start the entrance animation sequence
    startEntranceAnimations();

    const timer = setTimeout(() => {
      onComplete();
    }, delay);

    return () => clearTimeout(timer);
  }, [onComplete, delay, pageOpacity, contentTranslateY, dot1Opacity, dot2Opacity, dot3Opacity, successIconScale, logoOpacity, logoScale, titleOpacity, titleTranslateY, subtitleOpacity, subtitleTranslateY]);

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && AndroidVideoBackground && (
        <AndroidVideoBackground
          onVideoError={(error: any) => console.log('Android video error:', error)}
        />
      )}
      {Platform.OS === 'ios' && (
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.iosGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      
      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: pageOpacity,
            transform: [{ translateY: contentTranslateY }]
          }
        ]}
      >
        <View style={styles.successContainer}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Animated.View style={[styles.successIcon, { transform: [{ scale: successIconScale }] }]}>
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Animated.View
              style={{
                opacity: logoOpacity,
                transform: [{ scale: logoScale }]
              }}
            >
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {/* Success Message */}
          <View style={styles.messageContainer}>
            <Animated.View
              style={{
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }]
              }}
            >
              <Text style={styles.successTitle}>Sign In Successful!</Text>
            </Animated.View>
            <Animated.View
              style={{
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }]
              }}
            >
              <Text style={styles.successSubtitle}>
                Welcome back! Taking you to your dashboard...
              </Text>
            </Animated.View>
          </View>

          {/* Loading Animation */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
              <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
              <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
            </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  iosGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconContainer: {
    marginBottom: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkmark: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  successSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 4,
  },
});