import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { securityService } from '../lib/security-service';
import { secureWalletService } from '../lib/secure-wallet-service';
import { secureReferralService } from '../lib/secure-referral-service';
import AntiReverseEngineering from './AntiReverseEngineering';

interface SecurityContextType {
  isSecurityInitialized: boolean;
  isSecure: boolean;
  securityViolations: string[];
  initializeSecurity: () => Promise<void>;
  performSecurityCheck: (checkName: string) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
  onSecurityViolation?: (violation: string) => void;
}

export default function SecurityProvider({ 
  children, 
  onSecurityViolation 
}: SecurityProviderProps) {
  const [isSecurityInitialized, setIsSecurityInitialized] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [securityViolations, setSecurityViolations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const initializeSecurity = async () => {
    try {
      console.log('🔒 Initializing security services...');
      
      // Initialize security service
      await securityService.initialize();
      console.log('✅ Security service initialized');

      // Perform initial security checks
      const securityChecks = [
        'debug',
        'emulator', 
        'root',
        'signature',
        'integrity',
        'runtime',
        'network'
      ];

      const checkResults = await Promise.all(
        securityChecks.map(async (check) => {
          const result = await performSecurityCheck(check);
          return { check, result };
        })
      );

      const failedChecks = checkResults.filter(({ result }) => !result);
      
      if (failedChecks.length > 0) {
        const violations = failedChecks.map(({ check }) => `Security check failed: ${check}`);
        setSecurityViolations(violations);
        setIsSecure(false);
        
        // Notify parent component
        if (onSecurityViolation) {
          violations.forEach(violation => onSecurityViolation(violation));
        }

        console.warn('⚠️ Security violations detected:', violations);
      } else {
        console.log('✅ All security checks passed');
      }

      setIsSecurityInitialized(true);
      setIsLoading(false);

    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      setSecurityViolations([`Security initialization failed: ${error.message}`]);
      setIsSecure(false);
      setIsSecurityInitialized(true);
      setIsLoading(false);
      
      // Notify parent component
      if (onSecurityViolation) {
        onSecurityViolation(`Security initialization failed: ${error.message}`);
      }
    }
  };

  const performSecurityCheck = async (checkName: string): Promise<boolean> => {
    try {
      // Import the security check function
      const { performSecurityCheck: checkFunction } = await import('./AntiReverseEngineering');
      return await checkFunction(checkName);
    } catch (error) {
      console.error(`Security check ${checkName} failed:`, error);
      return false;
    }
  };

  useEffect(() => {
    initializeSecurity();
  }, []);

  const handleSecurityViolation = (violation: string) => {
    setSecurityViolations(prev => [...prev, violation]);
    setIsSecure(false);
    
    if (onSecurityViolation) {
      onSecurityViolation(violation);
    }
  };

  const contextValue: SecurityContextType = {
    isSecurityInitialized,
    isSecure,
    securityViolations,
    initializeSecurity,
    performSecurityCheck,
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
      }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 16, 
          color: '#333',
          textAlign: 'center',
        }}>
          Initializing Security Systems...
        </Text>
        <Text style={{ 
          marginTop: 10, 
          fontSize: 12, 
          color: '#666',
          textAlign: 'center',
          paddingHorizontal: 40,
        }}>
          Please wait while we verify the security of your environment
        </Text>
      </View>
    );
  }

  // Show security violation screen
  if (!isSecure) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#ffebee',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          width: '100%',
          maxWidth: 400,
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: '#c62828',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            🔒 Security Alert
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#d32f2f',
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 20,
          }}>
            We've detected potential security risks in your environment. 
            For your safety, some features may be restricted.
          </Text>

          <View style={{ 
            backgroundColor: '#fff3e0',
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: 'bold',
              color: '#e65100',
              marginBottom: 12,
            }}>
              Security Issues Detected:
            </Text>
            {securityViolations.map((violation, index) => (
              <Text key={index} style={{ 
                fontSize: 11, 
                color: '#bf360c',
                marginBottom: 6,
                lineHeight: 16,
              }}>
                • {violation}
              </Text>
            ))}
          </View>

          <Text style={{ 
            fontSize: 12, 
            color: '#666',
            textAlign: 'center',
            lineHeight: 16,
          }}>
            Please ensure you're using the official BetaMe app from a trusted source. 
            If you believe this is an error, please contact support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SecurityContext.Provider value={contextValue}>
      <AntiReverseEngineering onSecurityViolation={handleSecurityViolation}>
        {children}
      </AntiReverseEngineering>
    </SecurityContext.Provider>
  );
}

// Custom hook to use security context
export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

// Security status component
export function SecurityStatus() {
  const { isSecurityInitialized, isSecure, securityViolations } = useSecurity();

  if (!isSecurityInitialized) {
    return (
      <View style={{ 
        padding: 8, 
        backgroundColor: '#fff3cd', 
        borderRadius: 4,
        margin: 8,
      }}>
        <Text style={{ fontSize: 12, color: '#856404' }}>
          🔄 Security systems initializing...
        </Text>
      </View>
    );
  }

  if (!isSecure) {
    return (
      <View style={{ 
        padding: 8, 
        backgroundColor: '#f8d7da', 
        borderRadius: 4,
        margin: 8,
      }}>
        <Text style={{ fontSize: 12, color: '#721c24' }}>
          ⚠️ Security violations detected ({securityViolations.length})
        </Text>
      </View>
    );
  }

  return (
    <View style={{ 
      padding: 8, 
      backgroundColor: '#d4edda', 
      borderRadius: 4,
      margin: 8,
    }}>
      <Text style={{ fontSize: 12, color: '#155724' }}>
        ✅ Security systems active
      </Text>
    </View>
  );
}

// Security check component for specific features
export function SecurityGate({ 
  children, 
  requiredChecks = [], 
  fallback = null 
}: {
  children: ReactNode;
  requiredChecks?: string[];
  fallback?: ReactNode;
}) {
  const { isSecure, performSecurityCheck } = useSecurity();
  const [checksPassed, setChecksPassed] = useState<boolean | null>(null);

  useEffect(() => {
    const runChecks = async () => {
      if (requiredChecks.length === 0) {
        setChecksPassed(isSecure);
        return;
      }

      try {
        const results = await Promise.all(
          requiredChecks.map(check => performSecurityCheck(check))
        );
        setChecksPassed(results.every(result => result));
      } catch (error) {
        console.error('Security gate checks failed:', error);
        setChecksPassed(false);
      }
    };

    runChecks();
  }, [isSecure, requiredChecks, performSecurityCheck]);

  if (checksPassed === null) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          Verifying security...
        </Text>
      </View>
    );
  }

  if (!checksPassed) {
    return fallback || (
      <View style={{ 
        padding: 20, 
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        borderRadius: 8,
        margin: 16,
      }}>
        <Text style={{ fontSize: 14, color: '#e65100', textAlign: 'center' }}>
          🔒 This feature requires additional security verification
        </Text>
        <Text style={{ 
          fontSize: 12, 
          color: '#bf360c', 
          textAlign: 'center',
          marginTop: 8,
        }}>
          Please ensure you're using the official app in a secure environment
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
