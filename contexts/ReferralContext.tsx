import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ReferralContextType {
  referralCode: string | null;
  setReferralCode: (code: string | null) => void;
  clearReferralCode: () => void;
  hasReferralCode: boolean;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const REFERRAL_CODE_KEY = 'pending_referral_code';

export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const [referralCode, setReferralCodeState] = useState<string | null>(null);

  // Load referral code from storage on app start
  useEffect(() => {
    loadReferralCode();
  }, []);

  const loadReferralCode = async () => {
    try {
      const storedCode = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
      if (storedCode) {
        setReferralCodeState(storedCode);
      }
    } catch (error) {
      console.error('Error loading referral code:', error);
    }
  };

  const setReferralCode = async (code: string | null) => {
    try {
      if (code) {
        await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
        setReferralCodeState(code);
        console.log('📱 Referral code stored:', code);
      } else {
        await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
        setReferralCodeState(null);
      }
    } catch (error) {
      console.error('Error storing referral code:', error);
    }
  };

  const clearReferralCode = async () => {
    try {
      await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
      setReferralCodeState(null);
      console.log('📱 Referral code cleared');
    } catch (error) {
      console.error('Error clearing referral code:', error);
    }
  };

  const value: ReferralContextType = {
    referralCode,
    setReferralCode,
    clearReferralCode,
    hasReferralCode: !!referralCode,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}