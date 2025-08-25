import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

interface SmartBackButtonProps {
  color?: string;
  size?: number;
  style?: any;
  onPress?: () => void;
}

export function SmartBackButton({ 
  color = '#1D1D1F', 
  size = 24, 
  style,
  onPress 
}: SmartBackButtonProps) {
  const { smartBack } = useSmartNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      smartBack();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <ArrowLeft size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
