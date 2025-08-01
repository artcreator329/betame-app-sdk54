import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Briefcase, Share, Settings as SettingsIcon, User, CircleHelp as HelpCircle, Users, Info, LogOut, Bell, Shield, CreditCard, Globe, Moon, FileText, MessageCircle, Camera, Trophy, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  hasArrow?: boolean;
  onPress?: () => void;
  isLogout?: boolean;
}

function SettingItem({ icon, title, hasArrow = true, onPress, isLogout = false }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        {icon}
        <Text style={[styles.settingTitle, isLogout && styles.logoutText]}>{title}</Text>
      </View>
      {hasArrow && !isLogout && (
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();

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
          onPress: () => {
            // Handle logout logic here
            console.log('User logged out');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Wallet size={24} color="#1D1D1F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Trophy size={24} color="#1D1D1F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: userProfile?.avatar_url || 'https://via.placeholder.com/80',
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {userProfile?.full_name || 'User'}
            </Text>
            {userProfile?.tagline && (
              <Text style={styles.userTagline}>{userProfile.tagline}</Text>
            )}
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.settingsContainer}>
          <SettingItem
            icon={<Heart size={20} color="#1D1D1F" />}
            title="Favorite lists"
            onPress={() => router.push('/favorites')}
          />
          
          <SettingItem
            icon={<Briefcase size={20} color="#1D1D1F" />}
            title="Become a seller"
            onPress={() => router.push('/become-seller')}
          />
          
          <SettingItem
            icon={<Share size={20} color="#1D1D1F" />}
            title="Invite friends"
            onPress={() => console.log('Invite friends')}
          />
          
          <SettingItem
            icon={<SettingsIcon size={20} color="#1D1D1F" />}
            title="Settings"
            onPress={() => console.log('Settings')}
          />
          
          <SettingItem
            icon={<User size={20} color="#1D1D1F" />}
            title="My account"
            onPress={() => router.push('/my-account')}
          />

          <SettingItem
            icon={<Bell size={20} color="#1D1D1F" />}
            title="Notifications"
            onPress={() => console.log('Notifications')}
          />

          <SettingItem
            icon={<Shield size={20} color="#1D1D1F" />}
            title="Privacy & Security"
            onPress={() => console.log('Privacy & Security')}
          />

          <SettingItem
            icon={<CreditCard size={20} color="#1D1D1F" />}
            title="Payment Methods"
            onPress={() => console.log('Payment Methods')}
          />

          <SettingItem
            icon={<Globe size={20} color="#1D1D1F" />}
            title="Language & Region"
            onPress={() => console.log('Language & Region')}
          />

          <SettingItem
            icon={<Moon size={20} color="#1D1D1F" />}
            title="Dark Mode"
            onPress={() => console.log('Dark Mode')}
          />
          
          <SettingItem
            icon={<HelpCircle size={20} color="#1D1D1F" />}
            title="Support"
            onPress={() => console.log('Support')}
          />

          <SettingItem
            icon={<MessageCircle size={20} color="#1D1D1F" />}
            title="Contact Us"
            onPress={() => console.log('Contact Us')}
          />
          
          <SettingItem
            icon={<Users size={20} color="#1D1D1F" />}
            title="Community & legal"
            onPress={() => console.log('Community & legal')}
          />

          <SettingItem
            icon={<FileText size={20} color="#1D1D1F" />}
            title="Terms of Service"
            onPress={() => console.log('Terms of Service')}
          />

          <SettingItem
            icon={<Shield size={20} color="#1D1D1F" />}
            title="Privacy Policy"
            onPress={() => console.log('Privacy Policy')}
          />
          
          <SettingItem
            icon={<Info size={20} color="#1D1D1F" />}
            title="About us"
            onPress={() => console.log('About us')}
          />
          
          <SettingItem
            icon={<LogOut size={20} color="#FF3B30" />}
            title="Log out"
            hasArrow={false}
            isLogout={true}
            onPress={handleLogout}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BetaMe v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
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
    backgroundColor: 'white',
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
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1D1D1F',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  userTagline: {
    fontSize: 14,
    color: '#8E8E93',
  },
  settingsContainer: {
    backgroundColor: 'white',
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
    borderBottomColor: '#F2F2F7',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#1D1D1F',
    marginLeft: 16,
    fontWeight: '400',
  },
  logoutText: {
    color: '#FF3B30',
  },
  arrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '300',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});