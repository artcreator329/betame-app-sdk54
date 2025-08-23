import React from 'react';
import { useRouter } from 'expo-router';
import SignInSuccessPage from '@/components/SignInSuccessPage';

export default function SignInSuccessScreen() {
  const router = useRouter();

  const handleComplete = () => {
    // Navigate to the main tabs after the delay
    router.replace('/(tabs)');
  };

  return (
    <SignInSuccessPage 
      onComplete={handleComplete}
      delay={2500} // 2.5 seconds delay
    />
  );
}