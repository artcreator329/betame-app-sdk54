import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Database,
  Mail,
  Globe,
  Lock,
  Users,
  DollarSign,
  Smartphone,
  Save,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/lib/admin-service';
import { Colors } from '@/constants/Colors';

interface SystemSettings {
  general: {
    appName: string;
    appVersion: string;
    maintenanceMode: boolean;
    allowRegistration: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  payments: {
    commissionRate: number;
    minimumPayout: number;
    paymentMethods: string[];
    autoPayouts: boolean;
  };
  features: {
    chatEnabled: boolean;
    reviewsEnabled: boolean;
    walletEnabled: boolean;
    jobPostingEnabled: boolean;
  };
}

interface SettingSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingSection({ title, icon, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader as any}>
        {icon}
        <Text style={styles.sectionTitle as any}>{title}</Text>
      </View>
      <View style={styles.sectionContent as any}>{children}</View>
    </View>
  );
}

interface SettingItemProps {
  label: string;
  description?: string;
  value?: string | number | boolean;
  type: 'switch' | 'input' | 'number';
  onValueChange: (value: any) => void;
}

function SettingItem({ label, description, value, type, onValueChange }: SettingItemProps) {
  return (
    <View style={styles.settingItem as any}>
      <View style={styles.settingInfo as any}>
        <Text style={styles.settingLabel as any}>{label}</Text>
        {description && <Text style={styles.settingDescription as any}>{description}</Text>}
      </View>
      <View style={styles.settingControl as any}>
        {type === 'switch' && (
          <Switch
            value={value as boolean}
            onValueChange={onValueChange}
            trackColor={{ false: '#E5E7EB', true: '#007AFF40' }}
            thumbColor={value ? '#007AFF' : '#F3F4F6'}
          />
        )}
        {type === 'input' && (
          <TextInput
            style={styles.textInput}
            value={value as string}
            onChangeText={onValueChange}
            placeholder="Enter value"
          />
        )}
        {type === 'number' && (
          <TextInput
            style={styles.numberInput}
            value={value?.toString()}
            onChangeText={(text) => onValueChange(parseFloat(text) || 0)}
            placeholder="0"
            keyboardType="numeric"
          />
        )}
      </View>
    </View>
  );
}

export default function AdminSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      appName: 'BetaMe',
      appVersion: '1.0.0',
      maintenanceMode: false,
      allowRegistration: true,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false,
    },
    security: {
      twoFactorRequired: false,
      passwordMinLength: 8,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
    },
    payments: {
      commissionRate: 10,
      minimumPayout: 50,
      paymentMethods: ['Credit Card', 'Bank Transfer', 'E-Wallet'],
      autoPayouts: true,
    },
    features: {
      chatEnabled: true,
      reviewsEnabled: true,
      walletEnabled: true,
      jobPostingEnabled: true,
    },
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const isAdmin = await adminService.isAdmin(user.id);
      if (!isAdmin) {
        Alert.alert('Access Denied', 'Admin access required');
        router.back();
        return;
      }

      await loadSettings();
    } catch (error) {
      console.error('Error checking admin access:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.back();
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // In a real app, you would load settings from your backend
      // For now, we'll use the default settings
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
      setIsLoading(false);
    }
  };

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      // TODO: Implement settings save API call
      Alert.alert('Info', 'Settings save functionality not yet implemented');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* General Settings */}
        <SettingSection
          title="General"
          icon={<SettingsIcon size={20} color={Colors.primary.main} />}
        >
          <SettingItem
            label="App Name"
            description="The name of your application"
            value={settings.general.appName}
            type="input"
            onValueChange={(value) => updateSetting('general', 'appName', value)}
          />
          <SettingItem
            label="App Version"
            description="Current version of the application"
            value={settings.general.appVersion}
            type="input"
            onValueChange={(value) => updateSetting('general', 'appVersion', value)}
          />
          <SettingItem
            label="Maintenance Mode"
            description="Temporarily disable the app for maintenance"
            value={settings.general.maintenanceMode}
            type="switch"
            onValueChange={(value) => updateSetting('general', 'maintenanceMode', value)}
          />
          <SettingItem
            label="Allow Registration"
            description="Allow new users to register"
            value={settings.general.allowRegistration}
            type="switch"
            onValueChange={(value) => updateSetting('general', 'allowRegistration', value)}
          />
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection
          title="Notifications"
          icon={<Bell size={20} color={Colors.primary.main} />}
        >
          <SettingItem
            label="Email Notifications"
            description="Send notifications via email"
            value={settings.notifications.emailNotifications}
            type="switch"
            onValueChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
          />
          <SettingItem
            label="Push Notifications"
            description="Send push notifications to mobile devices"
            value={settings.notifications.pushNotifications}
            type="switch"
            onValueChange={(value) => updateSetting('notifications', 'pushNotifications', value)}
          />
          <SettingItem
            label="SMS Notifications"
            description="Send notifications via SMS"
            value={settings.notifications.smsNotifications}
            type="switch"
            onValueChange={(value) => updateSetting('notifications', 'smsNotifications', value)}
          />
          <SettingItem
            label="Marketing Emails"
            description="Send promotional and marketing emails"
            value={settings.notifications.marketingEmails}
            type="switch"
            onValueChange={(value) => updateSetting('notifications', 'marketingEmails', value)}
          />
        </SettingSection>

        {/* Security Settings */}
        <SettingSection
          title="Security"
          icon={<Shield size={20} color={Colors.primary.main} />}
        >
          <SettingItem
            label="Two-Factor Authentication"
            description="Require 2FA for all admin accounts"
            value={settings.security.twoFactorRequired}
            type="switch"
            onValueChange={(value) => updateSetting('security', 'twoFactorRequired', value)}
          />
          <SettingItem
            label="Minimum Password Length"
            description="Minimum number of characters for passwords"
            value={settings.security.passwordMinLength}
            type="number"
            onValueChange={(value) => updateSetting('security', 'passwordMinLength', value)}
          />
          <SettingItem
            label="Session Timeout (minutes)"
            description="Auto-logout after inactivity"
            value={settings.security.sessionTimeout}
            type="number"
            onValueChange={(value) => updateSetting('security', 'sessionTimeout', value)}
          />
          <SettingItem
            label="Max Login Attempts"
            description="Maximum failed login attempts before lockout"
            value={settings.security.maxLoginAttempts}
            type="number"
            onValueChange={(value) => updateSetting('security', 'maxLoginAttempts', value)}
          />
        </SettingSection>

        {/* Payment Settings */}
        <SettingSection
          title="Payments"
          icon={<DollarSign size={20} color={Colors.primary.main} />}
        >
          <SettingItem
            label="Commission Rate (%)"
            description="Platform commission on transactions"
            value={settings.payments.commissionRate}
            type="number"
            onValueChange={(value) => updateSetting('payments', 'commissionRate', value)}
          />
          <SettingItem
            label="Minimum Payout (RM)"
            description="Minimum amount for payouts"
            value={settings.payments.minimumPayout}
            type="number"
            onValueChange={(value) => updateSetting('payments', 'minimumPayout', value)}
          />
          <SettingItem
            label="Auto Payouts"
            description="Automatically process payouts"
            value={settings.payments.autoPayouts}
            type="switch"
            onValueChange={(value) => updateSetting('payments', 'autoPayouts', value)}
          />
        </SettingSection>

        {/* Feature Settings */}
        <SettingSection
          title="Features"
          icon={<Smartphone size={20} color={Colors.primary.main} />}
        >
          <SettingItem
            label="Chat System"
            description="Enable in-app messaging"
            value={settings.features.chatEnabled}
            type="switch"
            onValueChange={(value) => updateSetting('features', 'chatEnabled', value)}
          />
          <SettingItem
            label="Reviews & Ratings"
            description="Allow users to leave reviews"
            value={settings.features.reviewsEnabled}
            type="switch"
            onValueChange={(value) => updateSetting('features', 'reviewsEnabled', value)}
          />
          <SettingItem
            label="Wallet System"
            description="Enable digital wallet functionality"
            value={settings.features.walletEnabled}
            type="switch"
            onValueChange={(value) => updateSetting('features', 'walletEnabled', value)}
          />
          <SettingItem
            label="Job Posting"
            description="Allow users to post job listings"
            value={settings.features.jobPostingEnabled}
            type="switch"
            onValueChange={(value) => updateSetting('features', 'jobPostingEnabled', value)}
          />
        </SettingSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },

  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionContent: {
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingControl: {
    alignItems: 'flex-end',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
    minWidth: 120,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
    minWidth: 80,
    textAlign: 'right',
  },
});