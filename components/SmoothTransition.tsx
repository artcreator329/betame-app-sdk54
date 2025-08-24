import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

interface SmoothTransitionProps {
  children: React.ReactNode;
  visible: boolean;
  duration?: number;
  delay?: number;
  animationType?: 'fade' | 'slide' | 'scale';
  direction?: 'up' | 'down' | 'left' | 'right';
  onAnimationComplete?: () => void;
  style?: any;
}

export function SmoothTransition({
  children,
  visible,
  duration = 300,
  delay = 0,
  animationType = 'fade',
  direction = 'up',
  onAnimationComplete,
  style,
}: SmoothTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 50)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.9)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (visible) {
      // Entrance animations
      if (animationType === 'fade') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }
    } else {
      // Exit animations
      if (animationType === 'fade') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 50,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }
  }, [visible, duration, delay, animationType, fadeAnim, slideAnim, scaleAnim, onAnimationComplete]);

  const getTransformStyle = () => {
    const transforms: any[] = [];

    if (animationType === 'slide') {
      switch (direction) {
        case 'up':
          transforms.push({ translateY: slideAnim });
          break;
        case 'down':
          transforms.push({ translateY: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, -50],
          }) });
          break;
        case 'left':
          transforms.push({ translateX: slideAnim });
          break;
        case 'right':
          transforms.push({ translateX: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, -50],
          }) });
          break;
      }
    }

    if (animationType === 'scale') {
      transforms.push({ scale: scaleAnim });
    }

    return transforms;
  };

  const animatedStyle = {
    opacity: animationType === 'fade' ? fadeAnim : 1,
    transform: getTransformStyle(),
  };

  if (!visible && animationType === 'fade') {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
});

// Hook for easy use of smooth transitions
export function useSmoothTransition(visible: boolean, options?: {
  duration?: number;
  delay?: number;
  animationType?: 'fade' | 'slide' | 'scale';
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 50)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.9)).current;

  const {
    duration = 300,
    delay = 0,
    animationType = 'fade',
    direction = 'up',
  } = options || {};

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    if (visible) {
      if (animationType === 'fade') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }
    } else {
      if (animationType === 'fade') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 50,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }

      if (animationType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
      }
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [visible, duration, delay, animationType, fadeAnim, slideAnim, scaleAnim]);

  const getTransformStyle = () => {
    const transforms: any[] = [];

    if (animationType === 'slide') {
      switch (direction) {
        case 'up':
          transforms.push({ translateY: slideAnim });
          break;
        case 'down':
          transforms.push({ translateY: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, -50],
          }) });
          break;
        case 'left':
          transforms.push({ translateX: slideAnim });
          break;
        case 'right':
          transforms.push({ translateX: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, -50],
          }) });
          break;
      }
    }

    if (animationType === 'scale') {
      transforms.push({ scale: scaleAnim });
    }

    return transforms;
  };

  return {
    opacity: animationType === 'fade' ? fadeAnim : 1,
    transform: getTransformStyle(),
  };
}
