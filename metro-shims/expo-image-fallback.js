import React from 'react';
import { Image as RNImage } from 'react-native';

// Fallback Image component for when expo-image native module is not available
const Image = React.forwardRef((props, ref) => {
  const {
    source,
    style,
    contentFit = 'cover',
    transition,
    priority,
    cachePolicy,
    placeholder,
    onLoad,
    onError,
    onLoadStart,
    ...restProps
  } = props;

  // Convert expo-image contentFit to React Native resizeMode
  const getResizeMode = (contentFit) => {
    switch (contentFit) {
      case 'cover': return 'cover';
      case 'contain': return 'contain';
      case 'fill': return 'stretch';
      case 'none': return 'center';
      case 'scale-down': return 'contain';
      default: return 'cover';
    }
  };

  return (
    <RNImage
      ref={ref}
      source={source}
      style={style}
      resizeMode={getResizeMode(contentFit)}
      onLoad={onLoad}
      onError={onError}
      onLoadStart={onLoadStart}
      {...restProps}
    />
  );
});

// Add static methods that expo-image provides
Image.prefetch = async (url) => {
  // Simple prefetch implementation using React Native's Image.prefetch
  try {
    await RNImage.prefetch(url);
    return true;
  } catch (error) {
    console.warn('Failed to prefetch image:', url, error);
    return false;
  }
};

Image.clearMemoryCache = () => {
  // No-op for React Native Image
  console.log('Image.clearMemoryCache called (no-op in fallback)');
};

export { Image };
export default Image;
