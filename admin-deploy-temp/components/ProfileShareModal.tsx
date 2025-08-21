import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
  Clipboard,
  Platform,
  ActivityIndicator
} from 'react-native';
import { X, Share2, Copy, MessageCircle, Mail, Link } from 'lucide-react-native';
import { useColors } from '@/contexts/ThemeContext';
import { DeepLinkService } from '@/lib/deep-link-service';

interface ProfileShareModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  userBio?: string;
  userAvatar?: string;
}

export default function ProfileShareModal({
  visible,
  onClose,
  userId,
  userName,
  userBio,
  userAvatar
}: ProfileShareModalProps) {
  const [copying, setCopying] = useState(false);
  const colors = useColors();

  const shareableLink = DeepLinkService.generateSmartLink(userId, userName, userBio);
  const displayName = userName || 'User';

  const handleNativeShare = async () => {
    try {
      const shareContent = {
        title: `${displayName}'s Profile on BetaMe`,
        message: `Check out ${displayName}'s profile on BetaMe!\n\n${userBio || 'Amazing service provider'}\n\n${shareableLink}`,
        url: shareableLink
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Unable to share profile. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    try {
      setCopying(true);
      await Clipboard.setString(shareableLink);
      
      Alert.alert(
        'Link Copied!',
        'Profile link has been copied to your clipboard.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Unable to copy link. Please try again.');
    } finally {
      setCopying(false);
    }
  };

  const handleShareViaMessage = () => {
    const message = `Check out ${displayName}'s profile on BetaMe! ${shareableLink}`;
    const smsUrl = Platform.OS === 'ios' 
      ? `sms:&body=${encodeURIComponent(message)}`
      : `sms:?body=${encodeURIComponent(message)}`;
    
    Share.share({
      message: message
    });
  };

  const handleShareViaEmail = () => {
    const subject = `Check out ${displayName}'s profile on BetaMe`;
    const body = `Hi!\n\nI wanted to share ${displayName}'s profile with you on BetaMe.\n\n${userBio || 'They offer amazing services!'}\n\nCheck it out: ${shareableLink}\n\nIf you don't have the BetaMe app yet, you can download it from the link above.\n\nBest regards!`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Share.share({
      message: body,
      title: subject
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Share Profile
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={[styles.profileInfo, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.profileName, { color: colors.text.primary }]}>
              {displayName}
            </Text>
            {userBio && (
              <Text style={[styles.profileBio, { color: colors.text.secondary }]} numberOfLines={2}>
                {userBio}
              </Text>
            )}
          </View>

          {/* Share Options */}
          <View style={styles.shareOptions}>
            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleNativeShare}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: colors.primary.main }]}>
                <Share2 size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Share via...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleCopyLink}
              disabled={copying}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#10B981' }]}>
                {copying ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Copy size={20} color="white" />
                )}
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Copy Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleShareViaMessage}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#3B82F6' }]}>
                <MessageCircle size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Message
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.background.secondary }]}
              onPress={handleShareViaEmail}
            >
              <View style={[styles.shareIconContainer, { backgroundColor: '#EF4444' }]}>
                <Mail size={20} color="white" />
              </View>
              <Text style={[styles.shareOptionText, { color: colors.text.primary }]}>
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Link Preview */}
          <View style={[styles.linkPreview, { backgroundColor: colors.background.secondary }]}>
            <Link size={16} color={colors.text.secondary} />
            <Text style={[styles.linkText, { color: colors.text.secondary }]} numberOfLines={1}>
              {shareableLink}
            </Text>
          </View>

          {/* Info Text */}
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            This link will open the profile in the BetaMe app. If the recipient doesn't have the app, they'll be prompted to download it.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  profileInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  shareOptions: {
    gap: 12,
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  linkText: {
    fontSize: 12,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});