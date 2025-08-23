#!/usr/bin/env node

/**
 * Script to clear potentially corrupted search-related cache data
 * This can help resolve text rendering issues caused by invalid stored data
 */

console.log('🧹 Search Cache Cleaner');
console.log('This script helps clear potentially corrupted search data that might cause rendering issues.');
console.log('');

console.log('To clear search cache in your React Native app:');
console.log('');
console.log('1. Add this code to your app temporarily (e.g., in a debug screen):');
console.log('');
console.log('```javascript');
console.log('import AsyncStorage from "@react-native-async-storage/async-storage";');
console.log('');
console.log('const clearSearchCache = async () => {');
console.log('  try {');
console.log('    await AsyncStorage.removeItem("recent_searches");');
console.log('    console.log("✅ Recent searches cleared");');
console.log('  } catch (error) {');
console.log('    console.error("❌ Error clearing recent searches:", error);');
console.log('  }');
console.log('};');
console.log('');
console.log('// Call this function');
console.log('clearSearchCache();');
console.log('```');
console.log('');
console.log('2. Or restart your app completely to reset all state');
console.log('');
console.log('3. The updated useRecentSearches hook will now automatically');
console.log('   validate and clean any corrupted data on load');
console.log('');
console.log('✅ Search cache clearing instructions provided!');