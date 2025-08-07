import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Briefcase, Share, Settings as SettingsIcon, User, CircleHelp as HelpCircle, Users, Info, LogOut, Bell, Shield, CreditCard, Globe, Moon, FileText, MessageCircle, Camera, Trophy, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, useColors } from '@/contexts/ThemeContext';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  hasArrow?: boolean;
  onPress?: () => void;
  isLogout?: boolean;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

function SettingItem({ 
  icon, 
  title, 
  hasArrow = true, 
  onPress, 
  isLogout = false,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange
}: SettingItemProps) {
  const colors = useColors();
  
  return (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: colors.background.secondary }]} 
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View style={styles.settingLeft}>
        {icon}
        <Text style={[styles.settingTitle, { color: isLogout ? colors.status.error : colors.text.primary }]}>
          {title}
        </Text>
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border.light, true: colors.primary.main }}
          thumbColor={switchValue ? colors.background.tertiary : colors.text.tertiary}
        />
      ) : hasArrow && !isLogout ? (
        <View style={styles.arrow}>
          <Text style={[styles.arrowText, { color: colors.text.secondary }]}>›</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = useColors();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Starting logout process...');
              const { error } = await signOut();
              console.log('🔄 SignOut result:', { error });
              
              if (error) {
                console.error('❌ Logout error:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              } else {
                console.log('✅ Logout successful, navigating to login...');
                // Navigate to login screen after successful logout
                router.replace('/auth/login');
              }
            } catch (error) {
              console.error('❌ Logout exception:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Wallet size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Trophy size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity 
            onPress={() => {
              if (user) {
                router.push(`/user-profile/${user.id}`);
              } else {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in to view your profile.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In', onPress: () => router.push('/auth/login') }
                  ]
                );
              }
            }}
            style={styles.profileImageContainer}
          >
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.defaultProfileIcon, { backgroundColor: colors.background.secondary }]}>
                <User size={40} color={colors.text.secondary} />
              </View>
            )}
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.primary.dark, borderColor: colors.background.tertiary }]}>
              <Camera size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text.primary }]}>
              {userProfile?.full_name || 'User'}
            </Text>
            {userProfile?.tagline && (
              <Text style={[styles.userTagline, { color: colors.text.secondary }]}>{userProfile.tagline}</Text>
            )}
          </View>
        </View>

        {/* Settings Menu */}
        <View style={[styles.settingsContainer, { backgroundColor: colors.background.tertiary }]}>
          <SettingItem
            icon={<Heart size={20} color={colors.text.primary} />}
            title="Favorite lists"
            onPress={() => router.push('/favorites')}
          />
          
          <SettingItem
            icon={<Briefcase size={20} color={colors.text.primary} />}
            title="Become a seller"
            onPress={() => router.push('/become-seller')}
          />
          
          <SettingItem
            icon={<Share size={20} color={colors.text.primary} />}
            title="Invite friends"
            onPress={() => console.log('Invite friends')}
          />
          
          <SettingItem
            icon={<SettingsIcon size={20} color={colors.text.primary} />}
            title="Settings"
            onPress={() => console.log('Settings')}
          />
          
          <SettingItem
            icon={<User size={20} color={colors.text.primary} />}
            title="My account"
            onPress={() => router.push('/my-account')}
          />

          <SettingItem
            icon={<Bell size={20} color={colors.text.primary} />}
            title="Notifications"
            onPress={() => console.log('Notifications')}
          />

          <SettingItem
            icon={<Shield size={20} color={colors.text.primary} />}
            title="Privacy & Security"
            onPress={() => console.log('Privacy & Security')}
          />

          <SettingItem
            icon={<CreditCard size={20} color={colors.text.primary} />}
            title="Payment Methods"
            onPress={() => console.log('Payment Methods')}
          />

          <SettingItem
            icon={<Globe size={20} color={colors.text.primary} />}
            title="Language & Region"
            onPress={() => console.log('Language & Region')}
          />

          <SettingItem
            icon={<Moon size={20} color={colors.text.primary} />}
            title="Dark Mode"
            hasArrow={false}
            hasSwitch={true}
            switchValue={isDarkMode}
            onSwitchChange={toggleTheme}
          />
          
          <SettingItem
            icon={<HelpCircle size={20} color={colors.text.primary} />}
            title="Support"
            onPress={() => console.log('Support')}
          />

          <SettingItem
            icon={<MessageCircle size={20} color={colors.text.primary} />}
            title="Contact Us"
            onPress={() => console.log('Contact Us')}
          />
          
          <SettingItem
            icon={<Users size={20} color={colors.text.primary} />}
            title="Community & legal"
            onPress={() => console.log('Community & legal')}
          />

          <SettingItem
            icon={<FileText size={20} color={colors.text.primary} />}
            title="Terms of Service"
            onPress={() => console.log('Terms of Service')}
          />

          <SettingItem
            icon={<Shield size={20} color={colors.text.primary} />}
            title="Privacy Policy"
            onPress={() => console.log('Privacy Policy')}
          />
          
          <SettingItem
            icon={<Info size={20} color={colors.text.primary} />}
            title="About us"
            onPress={() => console.log('About us')}
          />
          
          <SettingItem
            icon={<LogOut size={20} color={colors.status.error} />}
            title="Log out"
            hasArrow={false}
            isLogout={true}
            onPress={handleLogout}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.text.secondary }]}>BetaMe v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultProfileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userTagline: {
    fontSize: 14,
  },
  settingsContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '400',
  },
  logoutText: {
  },
  arrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '300',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
  },
});