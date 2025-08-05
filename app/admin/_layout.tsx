import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    // Redirect non-admin users
    if (!user || !isAdmin) {
      router.replace('/(tabs)');
      return;
    }
  }, [user, isAdmin, loading]);

  // Show loading or redirect while checking auth
  if (loading || !user || !isAdmin) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="services" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="chats" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}