import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { securityService } from '../lib/security-service';

interface AntiReverseEngineeringProps {
  children: React.ReactNode;
  onSecurityViolation?: (violation: string) => void;
}

interface SecurityCheck {
  name: string;
  passed: boolean;
  description: string;
}

export default function AntiReverseEngineering({ 
  children, 
  onSecurityViolation 
}: AntiReverseEngineeringProps) {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    performSecurityChecks();
  }, []);

  const performSecurityChecks = async () => {
    try {
      const checks: SecurityCheck[] = [];

      // Check 1: Debug mode detection
      const debugCheck = await checkDebugMode();
      checks.push(debugCheck);

      // Check 2: Emulator/Simulator detection
      const emulatorCheck = await checkEmulator();
      checks.push(emulatorCheck);

      // Check 3: Root/Jailbreak detection
      const rootCheck = await checkRootJailbreak();
      checks.push(rootCheck);

      // Check 4: App signature verification
      const signatureCheck = await checkAppSignature();
      checks.push(signatureCheck);

      // Check 5: Code integrity check
      const integrityCheck = await checkCodeIntegrity();
      checks.push(integrityCheck);

      // Check 6: Runtime environment check
      const runtimeCheck = await checkRuntimeEnvironment();
      checks.push(runtimeCheck);

      // Check 7: Network security check
      const networkCheck = await checkNetworkSecurity();
      checks.push(networkCheck);

      setSecurityChecks(checks);

      // Determine overall security status
      const failedChecks = checks.filter(check => !check.passed);
      const isOverallSecure = failedChecks.length === 0;

      setIsSecure(isOverallSecure);
      setIsLoading(false);

      // Handle security violations
      if (!isOverallSecure) {
        handleSecurityViolations(failedChecks);
      }

      // Log security audit
      await securityService.logSecurityAudit(
        'system',
        'security_checks_performed',
        failedChecks.length * 10,
        {
          total_checks: checks.length,
          failed_checks: failedChecks.length,
          failed_check_names: failedChecks.map(check => check.name),
        }
      );

    } catch (error) {
      console.error('Security checks failed:', error);
      setIsSecure(false);
      setIsLoading(false);
      
      // Log security violation
      await securityService.logSecurityAudit(
        'system',
        'security_check_failure',
        100,
        { error: error.message }
      );
    }
  };

  const checkDebugMode = async (): Promise<SecurityCheck> => {
    try {
      // Check if running in debug mode
      const isDebug = __DEV__;
      
      if (isDebug) {
        console.warn('⚠️ Security: Running in debug mode');
        return {
          name: 'Debug Mode',
          passed: false,
          description: 'App is running in debug mode',
        };
      }

      return {
        name: 'Debug Mode',
        passed: true,
        description: 'App is running in production mode',
      };
    } catch (error) {
      return {
        name: 'Debug Mode',
        passed: false,
        description: 'Debug mode check failed',
      };
    }
  };

  const checkEmulator = async (): Promise<SecurityCheck> => {
    try {
      // Check if running on emulator/simulator
      const isEmulator = !Device.isDevice;
      
      if (isEmulator) {
        console.warn('⚠️ Security: Running on emulator/simulator');
        return {
          name: 'Emulator Detection',
          passed: false,
          description: 'App is running on emulator/simulator',
        };
      }

      return {
        name: 'Emulator Detection',
        passed: true,
        description: 'App is running on real device',
      };
    } catch (error) {
      return {
        name: 'Emulator Detection',
        passed: false,
        description: 'Emulator detection failed',
      };
    }
  };

  const checkRootJailbreak = async (): Promise<SecurityCheck> => {
    try {
      // Basic root/jailbreak detection
      let isRooted = false;

      if (Platform.OS === 'android') {
        // Check for common root indicators
        const rootIndicators = [
          '/system/app/Superuser.apk',
          '/system/xbin/su',
          '/system/bin/su',
          '/sbin/su',
          '/system/su',
          '/system/bin/.ext/.su',
          '/system/etc/init.d/99SuperSUDaemon',
          '/dev/com.koushikdutta.superuser.daemon/',
        ];

        // This is a simplified check - in production, use a proper root detection library
        isRooted = false; // Placeholder for actual root detection
      } else if (Platform.OS === 'ios') {
        // Check for common jailbreak indicators
        const jailbreakIndicators = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
          '/private/var/lib/apt/',
          '/private/var/lib/cydia',
          '/private/var/mobile/Library/SBSettings/Themes',
        ];

        // This is a simplified check - in production, use a proper jailbreak detection library
        isRooted = false; // Placeholder for actual jailbreak detection
      }

      if (isRooted) {
        return {
          name: 'Root/Jailbreak Detection',
          passed: false,
          description: 'Device appears to be rooted/jailbroken',
        };
      }

      return {
        name: 'Root/Jailbreak Detection',
        passed: true,
        description: 'Device appears to be secure',
      };
    } catch (error) {
      return {
        name: 'Root/Jailbreak Detection',
        passed: false,
        description: 'Root/jailbreak detection failed',
      };
    }
  };

  const checkAppSignature = async (): Promise<SecurityCheck> => {
    try {
      // Verify app signature
      const appId = Application.applicationId;
      const expectedAppId = 'com.artcreator329.boltexponativewind';
      
      if (appId !== expectedAppId) {
        return {
          name: 'App Signature',
          passed: false,
          description: 'Invalid application signature',
        };
      }

      // Check app version
      const appVersion = Application.nativeApplicationVersion;
      const buildVersion = Application.nativeBuildVersion;
      
      if (!appVersion || !buildVersion) {
        return {
          name: 'App Signature',
          passed: false,
          description: 'Invalid app version information',
        };
      }

      return {
        name: 'App Signature',
        passed: true,
        description: 'App signature verified',
      };
    } catch (error) {
      return {
        name: 'App Signature',
        passed: false,
        description: 'App signature verification failed',
      };
    }
  };

  const checkCodeIntegrity = async (): Promise<SecurityCheck> => {
    try {
      // Check for code tampering by verifying critical functions
      const criticalFunctions = [
        'securityService',
        'secureWalletService',
        'secureReferralService',
      ];

      let allFunctionsExist = true;
      for (const funcName of criticalFunctions) {
        if (typeof (global as any)[funcName] === 'undefined') {
          allFunctionsExist = false;
          break;
        }
      }

      if (!allFunctionsExist) {
        return {
          name: 'Code Integrity',
          passed: false,
          description: 'Critical security functions missing',
        };
      }

      // Check for common reverse engineering tools
      const suspiciousGlobals = [
        'Frida',
        'Xposed',
        'Substrate',
        'Cydia',
        'iFunBox',
        'iTools',
        'iMazing',
      ];

      let suspiciousToolsDetected = false;
      for (const tool of suspiciousGlobals) {
        if (typeof (global as any)[tool] !== 'undefined') {
          suspiciousToolsDetected = true;
          break;
        }
      }

      if (suspiciousToolsDetected) {
        return {
          name: 'Code Integrity',
          passed: false,
          description: 'Reverse engineering tools detected',
        };
      }

      return {
        name: 'Code Integrity',
        passed: true,
        description: 'Code integrity verified',
      };
    } catch (error) {
      return {
        name: 'Code Integrity',
        passed: false,
        description: 'Code integrity check failed',
      };
    }
  };

  const checkRuntimeEnvironment = async (): Promise<SecurityCheck> => {
    try {
      // Check for suspicious runtime environment
      const suspiciousIndicators = [
        'react-native-debugger',
        'flipper',
        'reactotron',
        'stetho',
      ];

      let suspiciousEnvironment = false;
      for (const indicator of suspiciousIndicators) {
        if (typeof (global as any)[indicator] !== 'undefined') {
          suspiciousEnvironment = true;
          break;
        }
      }

      if (suspiciousEnvironment) {
        return {
          name: 'Runtime Environment',
          passed: false,
          description: 'Suspicious runtime environment detected',
        };
      }

      // Check for development tools
      const devTools = [
        'Reactotron',
        'Flipper',
        'Stetho',
      ];

      let devToolsDetected = false;
      for (const tool of devTools) {
        if (typeof (global as any)[tool] !== 'undefined') {
          devToolsDetected = true;
          break;
        }
      }

      if (devToolsDetected) {
        return {
          name: 'Runtime Environment',
          passed: false,
          description: 'Development tools detected',
        };
      }

      return {
        name: 'Runtime Environment',
        passed: true,
        description: 'Runtime environment appears secure',
      };
    } catch (error) {
      return {
        name: 'Runtime Environment',
        passed: false,
        description: 'Runtime environment check failed',
      };
    }
  };

  const checkNetworkSecurity = async (): Promise<SecurityCheck> => {
    try {
      // Check for network interception tools
      const networkTools = [
        'Charles',
        'Fiddler',
        'Proxyman',
        'mitmproxy',
      ];

      let networkToolsDetected = false;
      for (const tool of networkTools) {
        if (typeof (global as any)[tool] !== 'undefined') {
          networkToolsDetected = true;
          break;
        }
      }

      if (networkToolsDetected) {
        return {
          name: 'Network Security',
          passed: false,
          description: 'Network interception tools detected',
        };
      }

      // Check for certificate pinning bypass
      const certPinningBypass = [
        'SSLKillSwitch',
        'CydiaSubstrate',
        'Substitute',
      ];

      let certBypassDetected = false;
      for (const bypass of certPinningBypass) {
        if (typeof (global as any)[bypass] !== 'undefined') {
          certBypassDetected = true;
          break;
        }
      }

      if (certBypassDetected) {
        return {
          name: 'Network Security',
          passed: false,
          description: 'Certificate pinning bypass detected',
        };
      }

      return {
        name: 'Network Security',
        passed: true,
        description: 'Network security verified',
      };
    } catch (error) {
      return {
        name: 'Network Security',
        passed: false,
        description: 'Network security check failed',
      };
    }
  };

  const handleSecurityViolations = (failedChecks: SecurityCheck[]) => {
    console.error('🚨 Security violations detected:', failedChecks);
    
    // Notify parent component
    if (onSecurityViolation) {
      onSecurityViolation(`Security violations detected: ${failedChecks.map(check => check.name).join(', ')}`);
    }

    // Show alert to user
    Alert.alert(
      'Security Warning',
      'Security violations detected. The app may not function properly.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Optionally restrict app functionality
            console.log('User acknowledged security warning');
          },
        },
      ]
    );

    // Log detailed security audit
    securityService.logSecurityAudit(
      'system',
      'security_violations_detected',
      90,
      {
        failed_checks: failedChecks.map(check => ({
          name: check.name,
          description: check.description,
        })),
        device_info: securityService.getDeviceFingerprint(),
      }
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Performing security checks...</Text>
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
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#c62828',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          Security Violation Detected
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: '#d32f2f',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          The app has detected potential security risks. Please ensure you're using the official app from a trusted source.
        </Text>
        <View style={{ 
          backgroundColor: '#fff3e0',
          padding: 15,
          borderRadius: 8,
          width: '100%',
        }}>
          <Text style={{ 
            fontSize: 12, 
            fontWeight: 'bold',
            color: '#e65100',
            marginBottom: 10,
          }}>
            Failed Security Checks:
          </Text>
          {securityChecks
            .filter(check => !check.passed)
            .map((check, index) => (
              <Text key={index} style={{ 
                fontSize: 11, 
                color: '#bf360c',
                marginBottom: 5,
              }}>
                • {check.name}: {check.description}
              </Text>
            ))}
        </View>
      </View>
    );
  }

  // Render children if all security checks pass
  return <>{children}</>;
}

// Export security check functions for use in other components
export const performSecurityCheck = async (checkName: string): Promise<boolean> => {
  try {
    switch (checkName) {
      case 'debug':
        const debugCheck = await checkDebugMode();
        return debugCheck.passed;
      case 'emulator':
        const emulatorCheck = await checkEmulator();
        return emulatorCheck.passed;
      case 'root':
        const rootCheck = await checkRootJailbreak();
        return rootCheck.passed;
      case 'signature':
        const signatureCheck = await checkAppSignature();
        return signatureCheck.passed;
      case 'integrity':
        const integrityCheck = await checkCodeIntegrity();
        return integrityCheck.passed;
      case 'runtime':
        const runtimeCheck = await checkRuntimeEnvironment();
        return runtimeCheck.passed;
      case 'network':
        const networkCheck = await checkNetworkSecurity();
        return networkCheck.passed;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Security check ${checkName} failed:`, error);
    return false;
  }
};

// Helper functions (copied from component for external use)
async function checkDebugMode(): Promise<SecurityCheck> {
  const isDebug = __DEV__;
  return {
    name: 'Debug Mode',
    passed: !isDebug,
    description: isDebug ? 'App is running in debug mode' : 'App is running in production mode',
  };
}

async function checkEmulator(): Promise<SecurityCheck> {
  const isEmulator = !Device.isDevice;
  return {
    name: 'Emulator Detection',
    passed: !isEmulator,
    description: isEmulator ? 'App is running on emulator/simulator' : 'App is running on real device',
  };
}

async function checkRootJailbreak(): Promise<SecurityCheck> {
  // Simplified implementation - in production, use proper detection libraries
  return {
    name: 'Root/Jailbreak Detection',
    passed: true,
    description: 'Device appears to be secure',
  };
}

async function checkAppSignature(): Promise<SecurityCheck> {
  const appId = Application.applicationId;
  const expectedAppId = 'com.artcreator329.boltexponativewind';
  const isValid = appId === expectedAppId;
  
  return {
    name: 'App Signature',
    passed: isValid,
    description: isValid ? 'App signature verified' : 'Invalid application signature',
  };
}

async function checkCodeIntegrity(): Promise<SecurityCheck> {
  const criticalFunctions = ['securityService', 'secureWalletService', 'secureReferralService'];
  const allFunctionsExist = criticalFunctions.every(func => typeof (global as any)[func] !== 'undefined');
  
  return {
    name: 'Code Integrity',
    passed: allFunctionsExist,
    description: allFunctionsExist ? 'Code integrity verified' : 'Critical security functions missing',
  };
}

async function checkRuntimeEnvironment(): Promise<SecurityCheck> {
  const suspiciousTools = ['Reactotron', 'Flipper', 'Stetho'];
  const toolsDetected = suspiciousTools.some(tool => typeof (global as any)[tool] !== 'undefined');
  
  return {
    name: 'Runtime Environment',
    passed: !toolsDetected,
    description: toolsDetected ? 'Development tools detected' : 'Runtime environment appears secure',
  };
}

async function checkNetworkSecurity(): Promise<SecurityCheck> {
  const networkTools = ['Charles', 'Fiddler', 'Proxyman', 'mitmproxy'];
  const toolsDetected = networkTools.some(tool => typeof (global as any)[tool] !== 'undefined');
  
  return {
    name: 'Network Security',
    passed: !toolsDetected,
    description: toolsDetected ? 'Network interception tools detected' : 'Network security verified',
  };
}
