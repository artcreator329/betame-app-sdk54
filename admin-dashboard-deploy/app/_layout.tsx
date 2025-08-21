import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin dashboard on app load
    router.replace('/admin-dashboard');
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
