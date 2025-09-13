// Crypto polyfill for React Native
// This ensures crypto functionality is available across the app

import { getRandomBytes } from 'expo-crypto';

// Polyfill for crypto.getRandomValues if needed
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array) => {
      const randomBytes = getRandomBytes(array.length);
      for (let i = 0; i < array.length; i++) {
        array[i] = randomBytes[i];
      }
      return array;
    }
  };
}

// Export for compatibility
export default global.crypto;
