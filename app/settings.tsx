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
  Share,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Briefcase, Share as ShareIcon, Settings as SettingsIcon, User, CircleHelp as HelpCircle, Users, Info, LogOut, Bell, Shield, CreditCard, Globe, Moon, FileText, MessageCircle, Camera, Trophy, Wallet, Sparkles, Building2 } from 'lucide-react-native';
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
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;

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

  const handleInviteFriends = () => {
    // Navigate to profile page and trigger referral modal
    router.push('/(tabs)/profile?showReferral=true');
  };

  const handleBecomeServiceProvider = () => {
    router.push('/become-service-provider');
  };

  const handleMyAccount = () => {
    router.push('/edit-profile');
  };

  const handleUpdateBankInfo = () => {
    router.push('/update-bank-info');
  };





  const handleLanguageRegion = () => {
    Alert.alert(
      'Language & Region',
      'Current Settings:\n• Language: English\n• Region: Malaysia\n\nMore language options will be available in future updates.',
      [{ text: 'OK' }]
    );
  };



  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('mailto:legal@betame.com?subject=Account Deletion Request&body=I would like to permanently delete my BetaMe account. Please assist me with this process.\n\nAccount Email: ' + (userProfile?.email || 'Not provided') + '\n\nReason for deletion: [Please specify your reason]\n\nI understand that this action is permanent and cannot be undone.\n\nThank you.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isDesktop ? styles.desktopScrollContent : undefined}
      >
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={isDesktop ? 28 : 24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={[styles.headerIcons, isDesktop && styles.headerIconsDesktop]}>
            <TouchableOpacity 
              style={[styles.headerIcon, isDesktop && styles.headerIconDesktop]}
              onPress={() => router.push('/wallet')}
            >
              <Wallet size={isDesktop ? 28 : 24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIcon, isDesktop && styles.headerIconDesktop]}
              onPress={() => router.push('/check-in')}
            >
              <Trophy size={isDesktop ? 28 : 24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, isDesktop && styles.profileSectionDesktop, { backgroundColor: colors.background.tertiary }]}>
          <TouchableOpacity 
            onPress={() => {
              if (userProfile) {
                router.push(`/user-profile/${userProfile.id}`);
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
            title="Become a service provider"
            onPress={handleBecomeServiceProvider}
          />
          
          <SettingItem
            icon={<ShareIcon size={20} color={colors.text.primary} />}
            title="Invite friends"
            onPress={handleInviteFriends}
          />
          
          {/* AI Assistant Button */}
          <TouchableOpacity 
            onPress={() => router.push('/messages?showAI=true')}
          >
            <LinearGradient
              colors={['#00D4FF', '#0099CC', '#0066AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.aiAssistantButton, { borderBottomColor: 'transparent' }]}
            >
              <View style={styles.aiAssistantLeft}>
                <View style={styles.betameLogoContainer}>
                  <Text style={[styles.betameLogoText, { color: 'white' }]}>B</Text>
                </View>
                <Text 
                  style={[styles.aiAssistantTitle, { fontSize: 16, fontWeight: '600', color: 'white' }]}
                >
                  Chat with AI Assistant
                </Text>
              </View>
              <View style={styles.aiAssistantRight}>
                <Sparkles size={16} color="#FFD700" />
                <View style={styles.arrow}>
                  <Text style={[styles.arrowText, { color: 'white' }]}>›</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <SettingItem
            icon={<User size={20} color={colors.text.primary} />}
            title="My account"
            onPress={handleMyAccount}
          />

          {/* Bank Information Update - Only show for service providers */}
          {userProfile?.is_service_provider && (
            <SettingItem
              icon={<Building2 size={20} color={colors.text.primary} />}
              title="Update Bank Information"
              onPress={handleUpdateBankInfo}
            />
          )}

          <SettingItem
            icon={<Bell size={20} color={colors.text.primary} />}
            title="Notifications"
            onPress={() => router.push('/notification-settings')}
          />





          <SettingItem
            icon={<Globe size={20} color={colors.text.primary} />}
            title="Language & Region"
            onPress={handleLanguageRegion}
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
            onPress={() => router.push('/support')}
          />

          <SettingItem
            icon={<MessageCircle size={20} color={colors.text.primary} />}
            title="Contact Us"
            onPress={() => router.push('/contact-us')}
          />
          


          <SettingItem
            icon={<FileText size={20} color={colors.text.primary} />}
            title="Terms of Service"
            onPress={() => router.push('/terms-of-service')}
          />

          <SettingItem
            icon={<Shield size={20} color={colors.text.primary} />}
            title="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
          
          <SettingItem
            icon={<Info size={20} color={colors.text.primary} />}
            title="About us"
            onPress={() => router.push('/about-us')}
          />
          
          <SettingItem
            icon={<LogOut size={20} color={colors.status.error} />}
            title="Log out"
            hasArrow={false}
            isLogout={true}
            onPress={handleLogout}
          />
        </View>

        {/* Danger Zone - Delete Account */}
        <View style={[styles.dangerZone, { backgroundColor: colors.background.tertiary }]}>
          <SettingItem
            icon={<User size={20} color={colors.status.error} />}
            title="Delete Account"
            hasArrow={false}
            isLogout={true}
            onPress={handleDeleteAccount}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.text.secondary }]}>BetaMe v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.text.secondary }]}>© 2025 Betame Sdn. Bhd.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopScrollContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerDesktop: {
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIconsDesktop: {
    gap: 8,
  },
  headerIcon: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 8,
  },
  headerIconDesktop: {
    marginLeft: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  profileSectionDesktop: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    marginBottom: 32,
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
  dangerZone: {
    marginHorizontal: 20,
    marginTop: 32,
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
  aiAssistantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  aiAssistantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiAssistantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  betameLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  betameLogoText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
  },
  aiAssistantTitle: {
    marginLeft: 16,
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
    fontFamily: Platform.OS === 'web' ? 'League Spartan, system-ui, -apple-system, sans-serif' : 'System',
    fontWeight: '600',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    fontWeight: '500',
  },
});