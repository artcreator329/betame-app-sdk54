import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Grid3X3, List } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';

interface LayoutToggleProps {
  isGridLayout: boolean;
  onToggle: () => void;
}

export default function LayoutToggle({ isGridLayout, onToggle }: LayoutToggleProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: '#F2F2F7' }]}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          isGridLayout && { backgroundColor: '#007AFF' }
        ]}
        onPress={onToggle}
      >
        <Grid3X3 
          size={16} 
          color={isGridLayout ? '#FFFFFF' : '#1D1D1F'} 
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          !isGridLayout && { backgroundColor: '#007AFF' }
        ]}
        onPress={onToggle}
      >
        <List 
          size={16} 
          color={!isGridLayout ? '#FFFFFF' : '#1D1D1F'} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 