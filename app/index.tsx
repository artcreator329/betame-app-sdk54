import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure the Root Layout is mounted before navigation
    const timer = setTimeout(() => {
      // Always redirect to homepage, regardless of authentication status
      router.replace('/(tabs)');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [router]);

  // Show loading spinner while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}