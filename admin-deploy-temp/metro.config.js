const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for web platform
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// More robust module resolution override for react-native-maps on web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Set condition names to prioritize web-compatible package exports
config.resolver.unstable_conditionNames = ['browser', 'web', 'react-native', 'default'];

// Custom resolver to intercept native module imports on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only apply custom resolution for web platform
  if (platform === 'web') {
    // Redirect react-native-maps to web shim
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'metro-shims/react-native-maps.js'),
        type: 'sourceFile',
      };
    }
    
    // Redirect codegenNativeCommands to web shim
    if (moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands') {
      return {
        filePath: path.resolve(__dirname, 'metro-shims/codegenNativeCommands.js'),
        type: 'sourceFile',
      };
    }
  }
  
  // Use default resolution for all other cases
  return context.resolveRequest(context, moduleName, platform);
};

// Use extraNodeModules to alias problematic modules to web shims
config.resolver.extraNodeModules = {
  'react-native-maps': path.resolve(__dirname, 'metro-shims/react-native-maps.js'),
  'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, 'metro-shims/codegenNativeCommands.js'),
  // Add crypto polyfills for web
  'crypto': require.resolve('crypto-browserify'),
  'stream': require.resolve('readable-stream'),
  'buffer': require.resolve('buffer'),
};

module.exports = config;