import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ServiceFeatureApplication, FeatureService } from '@/lib/feature-service';

interface FeatureIconsProps {
  features: ServiceFeatureApplication[];
  size?: number;
  style?: any;
}

// Static mapping for feature icons
const featureIconImages = {
  boost_instant: require('@/assets/images/boost-banner/boost-icon.png'),
  showcase_max: require('@/assets/images/boost-banner/showcase-icon.png'),
  feature_2x: require('@/assets/images/boost-banner/feature-icon.png'),
  boost_feature_max: require('@/assets/images/boost-banner/boostFeature-icon.png'),
};

export default function FeatureIcons({ features, size = 20, style }: FeatureIconsProps) {
  if (!features || features.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {features.map((feature, index) => {
        const featureIcon = FeatureService.getFeatureIcon(feature.feature_type);
        if (!featureIcon) return null;

        const iconSource = featureIconImages[feature.feature_type];
        if (!iconSource) return null;

        return (
          <View key={`${feature.id}-${index}`} style={styles.iconContainer}>
            <Image
              source={iconSource}
              style={[
                styles.icon,
                {
                  width: size,
                  height: size,
                }
              ]}
              resizeMode="contain"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    // Size will be set dynamically via props
  },
});
